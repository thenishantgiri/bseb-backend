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
   */
  private async getAdmitCard(
    dto: GetAdmitCardRequestDto,
    type: AdmitCardType,
  ): Promise<AdmitCardResponseDto> {
    const identifier = this.getIdentifier(dto);
    const cacheKey = `${this.config.cachePrefix}:${type}:${identifier}`;

    try {
      // Check cache first
      const cachedData = await this.getFromCache<AdmitCardData>(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache hit for ${type} admit card: ${identifier}`);
        return this.createSuccessResponse(cachedData, true);
      }

      // Build URL and request body
      const endpoint = type === AdmitCardType.THEORY
        ? this.config.endpoints.theory
        : this.config.endpoints.practical;
      const url = `${this.config.baseUrl}/${endpoint}`;

      const requestBody = {
        registrationNumber: dto.registrationNumber || '',
        rollCode: dto.rollCode || '',
        rollNumber: dto.rollNumber || '',
      };

      this.logger.log(`Fetching ${type} admit card from BSEB API: ${identifier}`);

      const rawData = await this.httpPost<any>(url, requestBody);

      // Transform response
      const admitCardData = this.transformResponse(rawData);

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
   * Transform raw API response to normalized format
   */
  private transformResponse(rawData: any): AdmitCardData {
    const studentDetails = rawData.StudentDetails || rawData.studentDetails || {};
    const subjectDetails = rawData.SubjectDetails || rawData.subjectDetails || [];

    return {
      studentDetails: {
        studentName: this.getFieldValue(studentDetails, 'StudentName', 'studentName'),
        fatherName: this.getFieldValue(studentDetails, 'FatherName', 'fatherName'),
        motherName: this.getFieldValue(studentDetails, 'MotherName', 'motherName'),
        dateOfBirth: this.getFieldValue(studentDetails, 'DateOfBirth', 'dateOfBirth'),
        gender: this.getFieldValue(studentDetails, 'Gender', 'gender'),
        registrationNumber: this.getFieldValue(studentDetails, 'RegistrationNumber', 'registrationNumber'),
        rollCode: this.getFieldValue(studentDetails, 'Rollcode', 'RollCode', 'rollcode', 'rollCode'),
        rollNumber: this.getFieldValue(studentDetails, 'RollNumber', 'rollNumber'),
        schoolName: this.getFieldValue(studentDetails, 'SchoolName', 'schoolName'),
        schoolCode: this.getFieldValue(studentDetails, 'SchoolCode', 'schoolCode'),
        casteCategory: this.getFieldValue(studentDetails, 'casteCategory', 'CasteCategory'),
        religion: this.getFieldValue(studentDetails, 'Religion', 'religion'),
        examType: this.getFieldValue(studentDetails, 'ExamType', 'examType'),
        examCenterName: this.getFieldValue(studentDetails, 'ExamCenterName', 'examCenterName'),
        examCenterCode: this.getFieldValue(studentDetails, 'ExamCenterCode', 'examCenterCode'),
      },
      subjectDetails: Array.isArray(subjectDetails)
        ? subjectDetails.map((s: any) => ({
            subjectName: this.getFieldValue(s, 'SubjectName', 'subjectName'),
            subjectCode: this.getFieldValue(s, 'SubjectCode', 'subjectCode'),
            subjectGroup: this.getFieldValue(s, 'SubjectGroup', 'subjectGroup'),
            examDate: this.getFieldValue(s, 'ExamDate', 'examDate'),
            examTime: this.getFieldValue(s, 'ExamTime', 'examTime'),
            examShift: this.getFieldValue(s, 'ExamShift', 'examShift'),
          }))
        : [],
    };
  }
}
