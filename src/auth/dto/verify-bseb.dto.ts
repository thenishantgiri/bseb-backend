import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VerifyBsebCredentialsDto {
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @IsString()
  @IsNotEmpty()
  dob: string; // Date of Birth in YYYY-MM-DD format

  @IsString()
  @IsOptional()
  rollCode?: string;

  @IsString()
  @IsOptional()
  schoolCode?: string;

  @IsString()
  @IsOptional()
  udiseCode?: string;
}

export class LinkBsebAccountDto {
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @IsString()
  @IsNotEmpty()
  dob: string;

  @IsString()
  @IsOptional()
  rollCode?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
