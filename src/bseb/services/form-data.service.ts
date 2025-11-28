import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { BsebBaseService } from '../common/bseb-base.service';
import { BsebApiConfig } from '../config/bseb-api.config';
import {
  FormDataResponseDto,
  StudentFormData,
  SubjectsData,
  SubjectDetail,
  AddressData,
} from '../dto/form-data';

/**
 * Service for fetching student form/registration data from BSEB API
 */
@Injectable()
export class FormDataService extends BsebBaseService {
  protected readonly logger = new Logger(FormDataService.name);

  private readonly config = BsebApiConfig.formData;

  constructor(redisService: RedisService) {
    super(redisService);
  }

  /**
   * Fetch student form/registration data
   * @param registrationNumber - Format: XXXXX-XXXXX-XX (e.g., 91341-00009-24)
   */
  async getFormData(registrationNumber: string): Promise<FormDataResponseDto> {
    const cacheKey = `${this.config.cachePrefix}:${registrationNumber}`;

    try {
      // Check cache first
      const cachedData = await this.getFromCache<StudentFormData>(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache hit for form data: ${registrationNumber}`);
        return this.createSuccessResponse(cachedData, true);
      }

      // Build URL and fetch from external API
      const url = `${this.config.baseUrl}/${registrationNumber}?hash=${this.config.hash}`;
      this.logger.log(`Fetching form data from BSEB API: ${registrationNumber}`);

      const apiResponse = await this.httpGet<any>(url);

      // BSEB API returns { success: true, data: {...} }
      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          message: apiResponse.message || 'No data returned from BSEB API',
        };
      }

      // Transform response
      const formData = this.transformResponse(apiResponse.data);

      // Cache the response
      await this.setInCache(cacheKey, formData, this.config.cacheTtl);

      return this.createSuccessResponse(formData, false);
    } catch (error) {
      const errorResponse = this.handleApiError(error, 'form-data', registrationNumber);
      return errorResponse as FormDataResponseDto;
    }
  }

  /**
   * Clear cache for a registration number
   */
  async clearCache(registrationNumber: string): Promise<void> {
    const cacheKey = `${this.config.cachePrefix}:${registrationNumber}`;
    await this.deleteFromCache(cacheKey);
    this.logger.log(`Cache cleared for form data: ${registrationNumber}`);
  }

  /**
   * Transform raw BSEB API response to normalized format
   * Maps snake_case fields to camelCase
   */
  private transformResponse(raw: any): StudentFormData {
    return {
      // School Information
      schoolCode: raw.school_code,
      schoolName: raw.school_name,

      // Registration Info
      registrationNumber: raw.reg_no,
      applicationNumber: raw.application_no,

      // Personal Information
      name: raw.name,
      fatherName: raw.father_name,
      motherName: raw.mother_name,
      dateOfBirth: raw.dob,
      gender: raw.gender,

      // Category Information
      caste: raw.caste,
      category: raw.category,
      religion: raw.religion,
      nationality: raw.nationality,
      area: raw.area,

      // Disability Info
      isDifferentlyAbled: raw.is_differently_abled,
      isVisuallyImpaired: raw.is_visually_impaired,

      // Other Info
      maritalStatus: raw.marital_status,
      medium: raw.medium,

      // Contact Information
      mobile: raw.mobile,
      email: raw.email,
      address: this.transformAddress(raw.address),

      // Subjects
      subjects: this.transformSubjects(raw.subjects),

      // Media URLs
      photoUrl: raw.photo,
      signatureUrl: raw.sign,

      // Store raw data for debugging/unmapped fields
      rawData: raw,
    };
  }

  /**
   * Transform address object
   */
  private transformAddress(rawAddress: any): AddressData | undefined {
    if (!rawAddress) return undefined;

    return {
      city: rawAddress.city,
      address: rawAddress.address,
      pincode: rawAddress.pincode,
      district: rawAddress.district,
      state: rawAddress.state,
    };
  }

  /**
   * Transform subjects object
   * BSEB returns: { mil: {...}, sil: {...}, compulsory_1: {...}, ... }
   */
  private transformSubjects(rawSubjects: any): SubjectsData | undefined {
    if (!rawSubjects) return undefined;

    return {
      mil: this.transformSubject(rawSubjects.mil),
      sil: this.transformSubject(rawSubjects.sil),
      optional: this.transformSubject(rawSubjects.optional),
      vocational: this.transformSubject(rawSubjects.vocational),
      compulsory1: this.transformSubject(rawSubjects.compulsory_1),
      compulsory2: this.transformSubject(rawSubjects.compulsory_2),
      compulsory3: this.transformSubject(rawSubjects.compulsory_3),
      compulsory4: this.transformSubject(rawSubjects.compulsory_4),
    };
  }

  /**
   * Transform individual subject
   */
  private transformSubject(rawSubject: any): SubjectDetail | undefined {
    if (!rawSubject) return undefined;

    return {
      name: rawSubject.name,
      code: rawSubject.code,
      isChecked: rawSubject.is_checked ?? false,
      readonly: rawSubject.readonly ?? true,
    };
  }
}
