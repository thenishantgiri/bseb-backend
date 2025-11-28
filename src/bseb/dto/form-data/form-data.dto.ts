import { IsString, IsNotEmpty } from 'class-validator';
import { BsebBaseResponse } from '../common';

// ============================================
// Request DTOs
// ============================================

export class GetFormDataRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Registration number is required' })
  registrationNumber: string;
}

// ============================================
// Response DTOs - Matching actual BSEB API response
// ============================================

export class SubjectDetail {
  name: string | null;
  code: string | null;
  isChecked: boolean;
  readonly: boolean;
}

export class SubjectsData {
  mil?: SubjectDetail;           // Mother language (Hindi)
  sil?: SubjectDetail;           // Second language (Sanskrit)
  optional?: SubjectDetail;      // Optional subject
  vocational?: SubjectDetail;    // Vocational subject
  compulsory1?: SubjectDetail;   // Compulsory subject 1 (Math)
  compulsory2?: SubjectDetail;   // Compulsory subject 2 (Social Science)
  compulsory3?: SubjectDetail;   // Compulsory subject 3 (Science)
  compulsory4?: SubjectDetail;   // Compulsory subject 4 (English)
}

export class AddressData {
  city?: string;
  address?: string;
  pincode?: string;
  district?: string;
  state?: string;
}

export class StudentFormData {
  // School Information
  schoolCode?: number;
  schoolName?: string;

  // Registration Info
  registrationNumber?: string;
  applicationNumber?: string;

  // Personal Information
  name?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;

  // Category Information
  caste?: string;
  category?: string;  // REGULAR, COMPARTMENTAL, etc.
  religion?: string;
  nationality?: string;
  area?: string;  // RURAL, URBAN

  // Disability Info
  isDifferentlyAbled?: boolean;
  isVisuallyImpaired?: boolean;

  // Other Info
  maritalStatus?: string;
  medium?: string;  // HINDI, ENGLISH

  // Contact Information
  mobile?: string;
  email?: string;
  address?: AddressData;

  // Subjects
  subjects?: SubjectsData;

  // Media URLs (directly from S3)
  photoUrl?: string;
  signatureUrl?: string;

  // Raw response for any unmapped fields
  rawData?: Record<string, any>;
}

export class FormDataResponseDto extends BsebBaseResponse<StudentFormData> {}
