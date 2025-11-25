import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpgradeClassDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['10', '11', '12'], { message: 'Class must be 10, 11, or 12' })
  newClass: string;

  @IsString()
  @IsOptional()
  newStream?: string;

  @IsString()
  @IsOptional()
  newRollNumber?: string;

  @IsString()
  @IsOptional()
  newRollCode?: string;

  @IsString()
  @IsOptional()
  newRegistrationNumber?: string;

  @IsString()
  @IsOptional()
  newSchoolName?: string;
}
