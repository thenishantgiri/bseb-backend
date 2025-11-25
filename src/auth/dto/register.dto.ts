import { IsString, IsEmail, IsOptional, IsNotEmpty, Length, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    { message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g., Rohan@123)' }
  )
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  fatherName?: string;

  @IsString()
  @IsOptional()
  motherName?: string;

  @IsString()
  @IsOptional()
  rollNumber?: string;

  @IsString()
  @IsOptional()
  rollCode?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;
  
  @IsString()
  @IsOptional()
  bsebRegNo?: string; // Alias for registrationNumber

  @IsString()
  @IsOptional()
  schoolName?: string;

  @IsString()
  @IsOptional()
  udiseCode?: string;

  @IsString()
  @IsOptional()
  stream?: string;

  @IsString()
  @IsOptional()
  class?: string;
  
  @IsString()
  @IsOptional()
  className?: string; // Alias for class

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  block?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;
  
  @IsString()
  @IsOptional()
  pinCode?: string; // Alias for pincode

  @IsString()
  @IsOptional()
  caste?: string;
  
  @IsString()
  @IsOptional()
  category?: string; // Alias for caste

  @IsString()
  @IsOptional()
  religion?: string;

  @IsString()
  @IsOptional()
  differentlyAbled?: string;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  aadhaarNumber?: string;
}

