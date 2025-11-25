import { Controller, Post, Body, UseInterceptors, UploadedFiles, BadRequestException, InternalServerErrorException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { MinioService } from '../minio/minio.service';
import { FileValidationService } from '../common/file-validation.service';
import { TwilioService } from '../common/twilio.service';
import { SendOtpDto, VerifyOtpDto, LoginPasswordDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyBsebCredentialsDto, LinkBsebAccountDto } from './dto/verify-bseb.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private minioService: MinioService,
    private fileValidationService: FileValidationService,
    private twilioService: TwilioService,
  ) {}

  // SRS Requirement: Max 5 OTP requests per hour per user
  @Throttle({ long: {limit: 5, ttl: 3600000} })  // 5 requests per hour
  @Post('login/otp')
  async sendOtpLogin(@Body() dto: SendOtpDto) {
    return this.authService.sendOtpLogin(dto.identifier);
  }

  @Post('login/verify')
  async verifyLoginOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyLoginOtp(dto.identifier, dto.otp);
  }

  @Post('login/password')
  async loginWithPassword(@Body() dto: LoginPasswordDto) {
    return this.authService.loginWithPassword(dto.identifier, dto.password);
  }

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ]),
  )
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] },
  ) {
    let photoPath: string | undefined;
    let signaturePath: string | undefined;

    // Validate and upload photo (only if files are provided)
    if (files && files.photo && files.photo[0]) {
      this.fileValidationService.validatePhoto(files.photo[0]);
      photoPath = await this.minioService.uploadFile(files.photo[0], 'photos');
    }

    // Validate and upload signature (only if files are provided)
    if (files && files.signature && files.signature[0]) {
      this.fileValidationService.validateSignature(files.signature[0]);
      signaturePath = await this.minioService.uploadFile(files.signature[0], 'signatures');
    }

    return this.authService.register(registerDto, photoPath, signaturePath);
  }

  // SRS Requirement: Max 5 OTP requests per hour per user
  @Throttle({ long: {limit: 5, ttl: 3600000} })  // 5 requests per hour
  @Post('password/forgot')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.identifier);
  }

  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.identifier, dto.otp, dto.newPassword);
  }

  // SRS Requirement: BSEB Credential Verification (Path A Registration)
  @Post('verify-bseb-credentials')
  async verifyBsebCredentials(@Body() dto: VerifyBsebCredentialsDto) {
    return this.authService.verifyBsebCredentials(dto);
  }

  // SRS Requirement: Register with BSEB Credentials (auto-fetch from BSEB database)
  @Post('register/bseb-linked')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ]),
  )
  async registerWithBsebLink(
    @Body() linkDto: LinkBsebAccountDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] },
  ) {
    let photoPath: string | undefined;
    let signaturePath: string | undefined;

    // Validate and upload photo (only if files are provided)
    if (files && files.photo && files.photo[0]) {
      this.fileValidationService.validatePhoto(files.photo[0]);
      photoPath = await this.minioService.uploadFile(files.photo[0], 'photos');
    }

    // Validate and upload signature (only if files are provided)
    if (files && files.signature && files.signature[0]) {
      this.fileValidationService.validateSignature(files.signature[0]);
      signaturePath = await this.minioService.uploadFile(files.signature[0], 'signatures');
    }

    return this.authService.registerWithBsebLink(linkDto, photoPath, signaturePath);
  }

  // Twilio OTP Integration Endpoints

  /**
   * Send OTP via Twilio Verify for login/registration
   */
  @Post('send-otp')
  @Throttle({ long: {limit: 5, ttl: 3600000} })  // 5 requests per hour
  async sendOTP(@Body() dto: SendOtpDto) {
    const { identifier } = dto;

    // Check if identifier is mobile or email
    const isMobile = /^\+?[0-9]{10,13}$/.test(identifier);
    const isEmail = this.twilioService.validateEmail(identifier);

    if (isMobile) {
      // Validate mobile number
      if (!this.twilioService.validateMobile(identifier)) {
        throw new BadRequestException('Invalid mobile number');
      }

      // Send OTP via Twilio Verify
      const result = await this.twilioService.sendOTP(identifier, 'sms');

      if (!result.success) {
        throw new InternalServerErrorException(result.message || 'Failed to send OTP');
      }

      return {
        success: true,
        message: 'OTP sent to mobile number',
        identifier: identifier.replace(/.(?=.{4})/g, '*'), // Mask mobile
        channel: 'sms',
      };
    } else if (isEmail) {
      // Send OTP via Twilio Verify to email
      const result = await this.twilioService.sendOTP(identifier, 'email');

      if (!result.success) {
        // Fall back to existing email OTP logic if Twilio fails
        return this.authService.sendOtpLogin(identifier);
      }

      return {
        success: true,
        message: 'OTP sent to email',
        identifier: identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        channel: 'email',
      };
    } else {
      throw new BadRequestException('Invalid identifier. Please provide a valid phone number or email');
    }
  }

  /**
   * Verify OTP via Twilio Verify for login
   */
  @Post('verify-otp')
  async verifyOTP(@Body() dto: VerifyOtpDto) {
    const { identifier, otp } = dto;

    // Check if identifier is mobile or email
    const isMobile = /^\+?[0-9]{10,13}$/.test(identifier);
    const isEmail = this.twilioService.validateEmail(identifier);

    if (isMobile || isEmail) {
      // Verify OTP via Twilio
      const result = await this.twilioService.verifyOTP(identifier, otp);

      if (!result.success) {
        // If email, try existing email OTP verification as fallback
        if (isEmail) {
          return this.authService.verifyLoginOtp(identifier, otp);
        }
        throw new UnauthorizedException(result.message || 'Invalid or expired OTP');
      }

      // Find or create user
      // For mobile: Create/find user by phone
      // For email: Use existing auth service
      if (isMobile) {
        // TODO: Implement phone-based user lookup/creation
        // For now, return success with a note to implement user creation
        return {
          success: true,
          message: 'OTP verified successfully',
          identifier: identifier,
          // TODO: Generate JWT tokens here after implementing user lookup
        };
      } else {
        // For email, use existing auth service
        return this.authService.verifyLoginOtp(identifier, otp);
      }
    } else {
      throw new BadRequestException('Invalid identifier');
    }
  }

  /**
   * Resend OTP via Twilio
   */
  @Post('resend-otp')
  @Throttle({ long: {limit: 3, ttl: 3600000} })  // 3 resend requests per hour
  async resendOTP(@Body() dto: { identifier: string; channel?: 'sms' | 'call' | 'whatsapp' | 'email' }) {
    const { identifier, channel = 'sms' } = dto;

    const isMobile = /^\+?[0-9]{10,13}$/.test(identifier);
    const isEmail = this.twilioService.validateEmail(identifier);

    if (isMobile) {
      // Cancel any pending verifications first
      await this.twilioService.cancelVerification(identifier);

      // Resend OTP with specified channel (sms, call, or whatsapp)
      const result = await this.twilioService.sendOTP(identifier, channel as any);

      if (!result.success) {
        throw new HttpException(
          result.message || 'Failed to resend OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return {
        success: true,
        message: `OTP resent via ${channel}`,
        channel: channel,
      };
    } else if (isEmail) {
      // Resend email OTP
      const result = await this.twilioService.sendOTP(identifier, 'email');

      if (!result.success) {
        // Fall back to existing email OTP logic
        return this.authService.sendOtpLogin(identifier);
      }

      return {
        success: true,
        message: 'OTP resent to email',
        channel: 'email',
      };
    } else {
      throw new BadRequestException('Invalid identifier');
    }
  }

  /**
   * Send OTP via WhatsApp (additional Twilio feature)
   */
  @Post('send-otp/whatsapp')
  @Throttle({ long: {limit: 5, ttl: 3600000} })
  async sendWhatsAppOTP(@Body() dto: { identifier: string }) {
    const { identifier } = dto;

    if (!this.twilioService.validateMobile(identifier)) {
      throw new BadRequestException('Invalid mobile number for WhatsApp');
    }

    const result = await this.twilioService.sendOTP(identifier, 'whatsapp');

    if (!result.success) {
      throw new InternalServerErrorException(result.message || 'Failed to send WhatsApp OTP');
    }

    return {
      success: true,
      message: 'OTP sent via WhatsApp',
      identifier: identifier.replace(/.(?=.{4})/g, '*'),
      channel: 'whatsapp',
    };
  }
}
