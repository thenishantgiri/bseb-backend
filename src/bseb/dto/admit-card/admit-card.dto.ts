import { IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { BsebBaseResponse, BsebStudentInfo, BsebSubjectInfo } from '../common';

// ============================================
// Request DTOs
// ============================================

export class GetAdmitCardRequestDto {
  @ValidateIf((o) => !o.rollCode && !o.rollNumber)
  @IsString()
  @IsNotEmpty({ message: 'Registration number is required when rollCode and rollNumber are not provided' })
  registrationNumber?: string;

  @ValidateIf((o) => !o.registrationNumber)
  @IsString()
  @IsNotEmpty({ message: 'Roll code is required when registration number is not provided' })
  rollCode?: string;

  @ValidateIf((o) => !o.registrationNumber)
  @IsString()
  @IsNotEmpty({ message: 'Roll number is required when registration number is not provided' })
  rollNumber?: string;
}

// ============================================
// Response DTOs
// ============================================

export class AdmitCardStudentDetails extends BsebStudentInfo {
  examType?: string;
  examCenterName?: string;
  examCenterCode?: string;
}

export class AdmitCardSubjectDetails extends BsebSubjectInfo {
  examDate?: string;
  examTime?: string;
  examShift?: string;
}

export class AdmitCardData {
  studentDetails: AdmitCardStudentDetails;
  subjectDetails: AdmitCardSubjectDetails[];
}

export class AdmitCardResponseDto extends BsebBaseResponse<AdmitCardData> {}

// ============================================
// Enums
// ============================================

export enum AdmitCardType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
}
