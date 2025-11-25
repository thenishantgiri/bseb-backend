import { IsString, IsNotEmpty, Length, MinLength, Matches, IsEmail, ValidateIf, Matches as Match } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be phone OR email (validated at service level)
}

export class VerifyOtpDto{
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be phone OR email

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class LoginPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be phone OR email

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be phone OR email
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be phone OR email

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    { message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g., Rohan@123)' }
  )
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    { message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g., Rohan@123)' }
  )
  newPassword: string;
}

