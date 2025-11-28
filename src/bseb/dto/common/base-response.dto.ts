/**
 * Base response DTOs used across all BSEB API responses
 */

export class BsebBaseResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  cached?: boolean;
  timestamp?: string;
}

export class BsebErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  timestamp?: string;
}

export class BsebPaginatedResponse<T = any> extends BsebBaseResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common student info shared across multiple APIs
export class BsebStudentInfo {
  studentName?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  registrationNumber?: string;
  rollCode?: string;
  rollNumber?: string;
  schoolName?: string;
  schoolCode?: string;
  casteCategory?: string;
  religion?: string;
}

// Common subject info
export class BsebSubjectInfo {
  subjectName?: string;
  subjectCode?: string;
  subjectGroup?: string; // Compulsory, Elective, etc.
}
