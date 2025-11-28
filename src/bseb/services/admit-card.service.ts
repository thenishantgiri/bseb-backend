import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { BsebBaseService } from '../common/bseb-base.service';
import { BsebApiConfig } from '../config/bseb-api.config';
import {
  GetAdmitCardRequestDto,
  AdmitCardResponseDto,
  AdmitCardData,
  AdmitCardType,
} from '../dto/admit-card';

/**
 * Service for fetching admit cards (Theory & Practical) from BSEB API
 */
@Injectable()
export class AdmitCardService extends BsebBaseService {
  protected readonly logger = new Logger(AdmitCardService.name);

  private readonly config = BsebApiConfig.admitCard;

  constructor(redisService: RedisService) {
    super(redisService);
  }

  /**
   * Fetch theory admit card
   */
  async getTheoryAdmitCard(dto: GetAdmitCardRequestDto): Promise<AdmitCardResponseDto> {
    return this.getAdmitCard(dto, AdmitCardType.THEORY);
  }

  /**
   * Fetch practical admit card
   */
  async getPracticalAdmitCard(dto: GetAdmitCardRequestDto): Promise<AdmitCardResponseDto> {
    return this.getAdmitCard(dto, AdmitCardType.PRACTICAL);
  }

  /**
   * Clear cache for a registration number or roll code/number
   */
  async clearCache(identifier: string): Promise<void> {
    await this.deleteCacheByPrefix(this.config.cachePrefix, identifier);
    this.logger.log(`Cache cleared for admit card: ${identifier}`);
  }

  /**
   * Internal method to fetch admit card by type
   * Uses same BSEB API endpoint as form data - admit card data is extracted from response
   */
  private async getAdmitCard(
    dto: GetAdmitCardRequestDto,
    type: AdmitCardType,
  ): Promise<AdmitCardResponseDto> {
    // Registration number is required for this endpoint
    if (!dto.registrationNumber) {
      return {
        success: false,
        message: 'Registration number is required',
      };
    }

    const identifier = dto.registrationNumber;
    const cacheKey = `${this.config.cachePrefix}:${type}:${identifier}`;

    try {
      // Check cache first
      const cachedData = await this.getFromCache<AdmitCardData>(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache hit for ${type} admit card: ${identifier}`);
        return this.createSuccessResponse(cachedData, true);
      }

      // Build URL - same pattern as form data API
      const url = `${this.config.baseUrl}/${identifier}?hash=${this.config.hash}`;

      this.logger.log(`Fetching ${type} admit card from BSEB API: ${url}`);

      const apiResponse = await this.httpGet<any>(url);

      // BSEB API returns { success: true, data: {...} }
      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          message: apiResponse.message || 'No data returned from BSEB API',
        };
      }

      // Transform response - extract admit card relevant fields
      const admitCardData = this.transformResponse(apiResponse.data, type);

      // Cache the response
      await this.setInCache(cacheKey, admitCardData, this.config.cacheTtl);

      return this.createSuccessResponse(admitCardData, false);
    } catch (error) {
      const errorResponse = this.handleApiError(error, `${type}-admit-card`, identifier);
      return errorResponse as AdmitCardResponseDto;
    }
  }

  /**
   * Get identifier string from DTO (for caching and logging)
   */
  private getIdentifier(dto: GetAdmitCardRequestDto): string {
    if (dto.registrationNumber) {
      return dto.registrationNumber;
    }
    return `${dto.rollCode}-${dto.rollNumber}`;
  }

  /**
   * Transform raw API response to normalized admit card format
   * Maps form data API response fields to admit card format
   */
  private transformResponse(rawData: any, type: AdmitCardType): AdmitCardData {
    // Extract subjects from the form data format
    const subjects = rawData.subjects || {};
    const subjectList: any[] = [];

    // Convert subjects object to array format
    const subjectKeys = ['mil', 'sil', 'compulsory_1', 'compulsory_2', 'compulsory_3', 'compulsory_4', 'optional', 'vocational'];
    for (const key of subjectKeys) {
      if (subjects[key] && subjects[key].name) {
        subjectList.push({
          subjectName: subjects[key].name,
          subjectCode: subjects[key].code || '',
          subjectGroup: key.replace('_', ' '),
          examDate: '', // Not available in form data API
          examTime: '', // Not available in form data API
          examShift: '', // Not available in form data API
        });
      }
    }

    return {
      studentDetails: {
        studentName: rawData.name || '',
        fatherName: rawData.father_name || '',
        motherName: rawData.mother_name || '',
        dateOfBirth: rawData.dob || '',
        gender: rawData.gender || '',
        registrationNumber: rawData.reg_no || '',
        rollCode: rawData.roll_code || '',
        rollNumber: rawData.roll_no || '',
        schoolName: rawData.school_name || '',
        schoolCode: rawData.school_code || '',
        casteCategory: rawData.category || '',
        religion: rawData.religion || '',
        examType: type === AdmitCardType.THEORY ? 'Theory' : 'Practical',
        examCenterName: rawData.exam_center_name || rawData.school_name || '',
        examCenterCode: rawData.exam_center_code || rawData.school_code || '',
      },
      subjectDetails: subjectList,
      // Include photo URL for admit card display
      photoUrl: rawData.photo || '',
    };
  }
}
