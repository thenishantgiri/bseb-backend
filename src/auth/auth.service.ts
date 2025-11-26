import { Injectable, UnauthorizedException, BadRequestException,ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditLogService } from '../common/audit-log.service';
import { SessionService } from '../common/session.service';
import { TwilioService } from '../common/twilio.service';
import { EmailService } from '../common/email.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyBsebCredentialsDto, LinkBsebAccountDto } from './dto/verify-bseb.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private auditLog: AuditLogService,
    private sessionService: SessionService,
    private twilioService: TwilioService,
    private emailService: EmailService,
  ) {}

  // Helper method to determine if identifier is email or phone
  private isEmail(identifier: string): boolean {
    return identifier.includes('@');
  }

  // Helper method to find user by phone or email
  private async findUserByIdentifier(identifier: string) {
    if (this.isEmail(identifier)) {
      return await this.prisma.student.findUnique({ where: { email: identifier } });
    } else {
      return await this.prisma.student.findUnique({ where: { phone: identifier } });
    }
  }

  async sendOtpLogin(identifier: string) {
    // Check if user exists
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new BadRequestException('User not registered');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 5-minute expiration
    await this.redis.set(`otp:${identifier}`, otp, 300);

    // Send OTP via appropriate channel
    let otpSent = false;
    if (this.isEmail(identifier)) {
      // Send OTP via Email using SendGrid
      otpSent = await this.emailService.sendOtpEmail(identifier, otp);
      if (!otpSent) {
        throw new BadRequestException('Failed to send OTP email. Please try again.');
      }
    } else {
      // Send OTP via SMS using Twilio
      const smsMessage = `Your BSEB Connect login OTP is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
      otpSent = await this.twilioService.sendSMS(identifier, smsMessage);
      if (!otpSent) {
        throw new BadRequestException('Failed to send OTP SMS. Please try again.');
      }
    }

    return { status: 1, message: 'OTP sent successfully' };
  }

  async verifyLoginOtp(identifier: string, otp: string, ipAddress?: string, userAgent?: string) {
    const storedOtp = await this.redis.get(`otp:${identifier}`);

    if (!storedOtp) {
      await this.auditLog.logAuthEvent('OTP_LOGIN_FAILED', identifier, undefined, ipAddress, userAgent, { reason: 'OTP expired' });
      throw new UnauthorizedException('OTP expired or invalid');
    }

    if (storedOtp !== otp) {
      // Track failed OTP attempts
      await this.trackFailedAttempt(identifier, 'otp');
      await this.auditLog.logAuthEvent('OTP_LOGIN_FAILED', identifier, undefined, ipAddress, userAgent, { reason: 'Invalid OTP' });
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP verified, delete it
    await this.redis.delete(`otp:${identifier}`);

    // Clear failed attempts on successful login
    await this.clearFailedAttempts(identifier);

    // Find user
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate JWT
    const token = this.generateToken(user.id, user.phone, user.email || undefined);

    // Create session
    await this.sessionService.createSession(user.id, token, undefined, ipAddress, userAgent);

    // Log successful login
    await this.auditLog.logAuthEvent('OTP_LOGIN_SUCCESS', identifier, user.id, ipAddress, userAgent);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      status: 1,
      message: 'Login successful',
      data: {
        token,
        user: userWithoutPassword,
      },
    };
  }

  async loginWithPassword(identifier: string, password: string, ipAddress?: string, userAgent?: string) {
    // Check if account is locked
    await this.checkAccountLockout(identifier, 'password');

    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      await this.auditLog.logAuthEvent('PASSWORD_LOGIN_FAILED', identifier, undefined, ipAddress, userAgent, { reason: 'User not found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Track failed password attempt
      await this.trackFailedAttempt(identifier, 'password');
      await this.auditLog.logAuthEvent('PASSWORD_LOGIN_FAILED', identifier, user.id, ipAddress, userAgent, { reason: 'Invalid password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await this.clearFailedAttempts(identifier);

    const token = this.generateToken(user.id, user.phone, user.email || undefined);

    // Create session
    await this.sessionService.createSession(user.id, token, undefined, ipAddress, userAgent);

    // Log successful login
    await this.auditLog.logAuthEvent('PASSWORD_LOGIN_SUCCESS', identifier, user.id, ipAddress, userAgent);

    const { password: _, ...userWithoutPassword } = user;

    return {
      status: 1,
      message: 'Login successful',
      data: {
        token,
        user: userWithoutPassword,
      },
    };
  }

  // Send OTP for registration verification
  async sendRegistrationOtp(identifier: string) {
    // Check if identifier is email or phone
    const isEmailId = this.isEmail(identifier);

    // Check if identifier is already registered
    const existingUser = await this.findUserByIdentifier(identifier);
    if (existingUser) {
      throw new ConflictException(
        isEmailId ? 'Email already registered' : 'Phone number already registered'
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 10-minute expiration for registration
    await this.redis.set(`register_otp:${identifier}`, otp, 600);

    // Send OTP via appropriate channel
    let otpSent = false;
    if (isEmailId) {
      // Send OTP via Email using SendGrid
      otpSent = await this.emailService.sendOtpEmail(identifier, otp);
      if (!otpSent) {
        throw new BadRequestException('Failed to send OTP email. Please try again.');
      }
    } else {
      // Send OTP via SMS using Twilio
      const smsMessage = `Your BSEB Connect registration OTP is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;
      otpSent = await this.twilioService.sendSMS(identifier, smsMessage);
      if (!otpSent) {
        throw new BadRequestException('Failed to send OTP SMS. Please try again.');
      }
    }

    return {
      status: 1,
      message: 'OTP sent successfully',
      channel: isEmailId ? 'email' : 'sms',
    };
  }

  // Verify OTP for registration
  async verifyRegistrationOtp(identifier: string, otp: string) {
    const storedOtp = await this.redis.get(`register_otp:${identifier}`);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or invalid');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP verified - mark identifier as verified for 30 minutes (time to complete registration)
    await this.redis.set(`verified:${identifier}`, 'true', 1800);

    // Delete the OTP
    await this.redis.delete(`register_otp:${identifier}`);

    return {
      status: 1,
      message: 'OTP verified successfully. You can now complete registration.',
      verified: true,
    };
  }

  async register(registerDto: RegisterDto, photoPath?: string, signaturePath?: string) {
    // Check if email/phone is verified
    const emailVerified = registerDto.email
      ? await this.redis.get(`verified:${registerDto.email}`)
      : null;
    const phoneVerified = await this.redis.get(`verified:${registerDto.phone}`);

    // Require at least one verified identifier
    if (!emailVerified && !phoneVerified) {
      throw new BadRequestException(
        'Please verify your email or phone number before registration. Send OTP first.'
      );
    }

    // Check if user already exists
    const existing = await this.prisma.student.findUnique({
      where: { phone: registerDto.phone }
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    // Check email uniqueness if provided
    if (registerDto.email) {
      const existingEmail = await this.prisma.student.findUnique({
        where: { email: registerDto.email }
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Normalize field names (handle aliases)
    const normalizedData = {
      phone: registerDto.phone,
      email: registerDto.email,
      password: hashedPassword,
      fullName: registerDto.fullName,
      dob: registerDto.dob,
      gender: registerDto.gender,
      fatherName: registerDto.fatherName,
      motherName: registerDto.motherName,
      rollNumber: registerDto.rollNumber,
      rollCode: registerDto.rollCode,
      registrationNumber: registerDto.bsebRegNo || registerDto.registrationNumber,
      schoolName: registerDto.schoolName,
      udiseCode: registerDto.udiseCode,
      stream: registerDto.stream,
      class: registerDto.className || registerDto.class,
      address: registerDto.address,
      block: registerDto.block,
      district: registerDto.district,
      state: registerDto.state,
      pincode: registerDto.pinCode || registerDto.pincode,
      caste: registerDto.category || registerDto.caste,
      religion: registerDto.religion,
      differentlyAbled: registerDto.differentlyAbled,
      maritalStatus: registerDto.maritalStatus,
      area: registerDto.area,
      aadhaarNumber: registerDto.aadhaarNumber,
      photoUrl: photoPath,
      signatureUrl: signaturePath,
    };

    // Create student
    const student = await this.prisma.student.create({
      data: normalizedData,
    });

    return { status: 1, message: 'Registration successful' };
  }

  async forgotPassword(identifier: string) {
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate OTP - SRS Requirement: 30 minutes expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`reset:${identifier}`, otp, 1800); // 30 minutes = 1800 seconds

    // TODO: Send OTP via SMS/Email gateway
    if (this.isEmail(identifier)) {
      console.log(`Password Reset OTP for email ${identifier}: ${otp}`);
    } else {
      console.log(`Password Reset OTP for phone ${identifier}: ${otp}`);
    }

    return { status: 1, message: 'OTP sent successfully' };
  }

  async resetPassword(identifier: string, otp: string, newPassword: string) {
    const storedOtp = await this.redis.get(`reset:${identifier}`);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or invalid');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.delete(`reset:${identifier}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.student.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {status: 1, message: 'Password reset successful' };
  }

  // SRS Requirement: Track failed login attempts
  private async trackFailedAttempt(identifier: string, type: 'otp' | 'password') {
    const key = `failed:${type}:${identifier}`;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts) + 1 : 1;

    // Store with expiration based on type
    // OTP: 15 minutes lockout after 5 attempts
    // Password: exponential backoff after 10 attempts
    const ttl = type === 'otp' ? 900 : 3600; // 15 mins or 1 hour
    await this.redis.set(key, count.toString(), ttl);
  }

  // Check if account is locked due to failed attempts
  private async checkAccountLockout(identifier: string, type: 'otp' | 'password') {
    const key = `failed:${type}:${identifier}`;
    const attempts = await this.redis.get(key);

    if (!attempts) return;

    const count = parseInt(attempts);
    const maxAttempts = type === 'otp' ? 5 : 10; // SRS Requirements

    if (count >= maxAttempts) {
      const ttl = await this.redis.getTTL(key);
      const minutes = Math.ceil(ttl / 60);
      throw new UnauthorizedException(
        `Account temporarily locked due to multiple failed attempts. Try again in ${minutes} minutes.`
      );
    }
  }

  // Clear failed attempts on successful login
  private async clearFailedAttempts(identifier: string) {
    await this.redis.delete(`failed:otp:${identifier}`);
    await this.redis.delete(`failed:password:${identifier}`);
  }

  // SRS Requirement: BSEB Credential Verification (Path A Registration)
  async verifyBsebCredentials(dto: VerifyBsebCredentialsDto) {
    // TODO: Replace with actual BSEB database API integration
    // This is a placeholder that simulates the BSEB database verification

    // Step 1: Verify credentials against BSEB database
    const bsebData = await this.fetchFromBsebDatabase(dto);

    if (!bsebData) {
      throw new NotFoundException('Student record not found in BSEB database. Please verify your credentials.');
    }

    // Step 2: Return the fetched data for pre-filling the registration form
    return {
      status: 1,
      message: 'BSEB credentials verified successfully',
      data: bsebData,
    };
  }

  // SRS Requirement: Register with BSEB Credentials (auto-fetch profile data)
  async registerWithBsebLink(linkDto: LinkBsebAccountDto, photoPath?: string, signaturePath?: string) {
    // Step 1: Verify BSEB credentials first
    const bsebData = await this.fetchFromBsebDatabase({
      rollNumber: linkDto.rollNumber,
      dob: linkDto.dob,
      rollCode: linkDto.rollCode,
    });

    if (!bsebData) {
      throw new NotFoundException('Student record not found in BSEB database');
    }

    // Step 2: Check if user already exists
    const existingByPhone = await this.prisma.student.findUnique({
      where: { phone: linkDto.phone }
    });

    if (existingByPhone) {
      throw new ConflictException('Phone number already registered');
    }

    const existingByEmail = await this.prisma.student.findUnique({
      where: { email: linkDto.email }
    });

    if (existingByEmail) {
      throw new ConflictException('Email already registered');
    }

    // Step 3: Hash password
    const hashedPassword = await bcrypt.hash(linkDto.password, 10);

    // Step 4: Merge BSEB data with user-provided data
    const studentData = {
      // User-provided authentication data
      phone: linkDto.phone,
      email: linkDto.email,
      password: hashedPassword,
      photoUrl: photoPath,
      signatureUrl: signaturePath,

      // Auto-fetched from BSEB database
      fullName: bsebData.fullName,
      dob: bsebData.dob,
      gender: bsebData.gender,
      fatherName: bsebData.fatherName,
      motherName: bsebData.motherName,
      rollNumber: bsebData.rollNumber,
      rollCode: bsebData.rollCode,
      registrationNumber: bsebData.registrationNumber,
      schoolName: bsebData.schoolName,
      udiseCode: bsebData.udiseCode,
      stream: bsebData.stream,
      class: bsebData.class,
      address: bsebData.address,
      block: bsebData.block,
      district: bsebData.district,
      state: bsebData.state,
      pincode: bsebData.pincode,
      caste: bsebData.caste,
      religion: bsebData.religion,
    };

    // Step 5: Create student record
    await this.prisma.student.create({ data: studentData });

    return {
      status: 1,
      message: 'Registration successful with BSEB credentials',
    };
  }

  // TODO: Replace with actual BSEB API integration
  // This is a placeholder method that simulates fetching from BSEB database
  private async fetchFromBsebDatabase(credentials: VerifyBsebCredentialsDto): Promise<any | null> {
    // PLACEHOLDER: This should be replaced with actual BSEB database API call
    // Example: const response = await axios.post('https://bseb-api.gov.in/verify', credentials);

    // For development/testing, return mock data if credentials match a test pattern
    // In production, this should call the actual BSEB API

    // Example mock data structure (to be replaced with real API)
    if (credentials.rollNumber === 'TEST123' && credentials.dob === '2005-01-01') {
      return {
        fullName: 'Test Student',
        dob: '2005-01-01',
        gender: 'Male',
        fatherName: 'Test Father',
        motherName: 'Test Mother',
        rollNumber: 'TEST123',
        rollCode: 'ROLL001',
        registrationNumber: 'REG2024001',
        schoolName: 'Test High School',
        udiseCode: 'UDISE123',
        stream: 'Science',
        class: '12',
        address: 'Test Address',
        block: 'Test Block',
        district: 'Patna',
        state: 'Bihar',
        pincode: '800001',
        caste: 'General',
        religion: 'Hindu',
      };
    }

    // Return null if credentials don't match (not found in BSEB database)
    return null;
  }

  private generateToken(userId: number, phone: string, email?: string): string {
    return this.jwtService.sign({ sub: userId, phone, email });
  }
}
