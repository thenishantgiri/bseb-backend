import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: Twilio.Twilio;
  private verifyServiceSid: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid = this.configService.get('TWILIO_VERIFY_SERVICE_SID') || '';

    if (accountSid && authToken) {
      this.twilioClient = Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn('Twilio credentials not found, running in test mode');
    }
  }

  /**
   * Send OTP via Twilio Verify
   * @param to Phone number or email to send OTP to
   * @param channel Channel to use (sms, call, whatsapp, email)
   */
  async sendOTP(
    to: string,
    channel: 'sms' | 'call' | 'whatsapp' | 'email' = 'sms',
  ): Promise<{ success: boolean; sid?: string; message?: string }> {
    try {
      // Format phone number for India if needed
      const formattedTo = this.formatIdentifier(to, channel);

      // In development mode, skip actual SMS sending
      if (this.isTestMode()) {
        this.logger.warn(`Test mode: Would send OTP to ${formattedTo} via ${channel}`);
        return {
          success: true,
          sid: 'test_verification_sid',
          message: 'Test mode: OTP would be sent',
        };
      }

      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: formattedTo,
          channel: channel,
          locale: 'en', // Can be changed to 'hi' for Hindi
        });

      this.logger.log(
        `OTP sent successfully to ${this.maskIdentifier(formattedTo)} via ${channel}`,
      );

      return {
        success: true,
        sid: verification.sid,
        message: `OTP sent via ${channel}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP: ${error.message}`);

      // Handle specific Twilio errors
      if (error.code === 60203) {
        return {
          success: false,
          message: 'Max verification attempts reached. Please try again later.',
        };
      }

      return {
        success: false,
        message: error.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Verify OTP via Twilio Verify
   * @param to Phone number or email that received the OTP
   * @param code The OTP code to verify
   */
  async verifyOTP(
    to: string,
    code: string,
  ): Promise<{ success: boolean; status?: string; message?: string }> {
    try {
      // Format identifier
      const formattedTo = this.formatIdentifier(to, this.getChannelType(to));

      // In test mode, accept specific test OTP
      if (this.isTestMode()) {
        const testOTP = this.configService.get('TEST_OTP_CODE', '123456');
        const isValid = code === testOTP;

        this.logger.warn(
          `Test mode: Verifying OTP for ${formattedTo} - ${isValid ? 'Valid' : 'Invalid'}`,
        );

        return {
          success: isValid,
          status: isValid ? 'approved' : 'pending',
          message: isValid ? 'Test OTP verified' : 'Invalid test OTP',
        };
      }

      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: formattedTo,
          code: code,
        });

      const isValid = verificationCheck.status === 'approved';

      this.logger.log(
        `OTP verification for ${this.maskIdentifier(formattedTo)}: ${verificationCheck.status}`,
      );

      return {
        success: isValid,
        status: verificationCheck.status,
        message: isValid ? 'OTP verified successfully' : 'Invalid or expired OTP',
      };
    } catch (error) {
      this.logger.error(`Failed to verify OTP: ${error.message}`);

      return {
        success: false,
        message: error.message || 'Failed to verify OTP',
      };
    }
  }

  /**
   * Cancel a verification (useful for cleanup)
   * @param to Phone number or email
   */
  async cancelVerification(to: string): Promise<boolean> {
    try {
      if (this.isTestMode()) {
        return true;
      }

      const formattedTo = this.formatIdentifier(to, this.getChannelType(to));

      // Try to cancel any pending verifications
      // Note: Twilio Verify doesn't support listing verifications,
      // but we can try to update the status directly if needed
      try {
        // This is a no-op as Twilio handles verification cancellation automatically
        // when a new verification is requested for the same number
        this.logger.log(`Cancelling verification for ${this.maskIdentifier(formattedTo)}`);
      } catch (error) {
        // Ignore cancellation errors
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel verification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send SMS (non-OTP) via Twilio
   * @param to Phone number to send SMS to
   * @param message Message content
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      if (this.isTestMode()) {
        this.logger.warn(`Test mode: Would send SMS to ${to}: ${message}`);
        return true;
      }

      const formattedTo = this.formatPhoneNumber(to);
      const from = this.configService.get('TWILIO_PHONE_NUMBER');

      await this.twilioClient.messages.create({
        to: formattedTo,
        from: from,
        body: message,
      });

      this.logger.log(`SMS sent successfully to ${this.maskIdentifier(formattedTo)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return false;
    }
  }

  /**
   * Send WhatsApp message via Twilio
   * @param to Phone number to send WhatsApp message to
   * @param message Message content
   */
  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    try {
      if (this.isTestMode()) {
        this.logger.warn(`Test mode: Would send WhatsApp to ${to}: ${message}`);
        return true;
      }

      const formattedTo = `whatsapp:${this.formatPhoneNumber(to)}`;
      const from = `whatsapp:${this.configService.get('TWILIO_WHATSAPP_NUMBER')}`;

      await this.twilioClient.messages.create({
        to: formattedTo,
        from: from,
        body: message,
      });

      this.logger.log(`WhatsApp message sent to ${this.maskIdentifier(to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate mobile number (Indian format)
   */
  validateMobile(mobile: string): boolean {
    // Remove country code if present
    const cleanMobile = mobile.replace(/^\+?91/, '');

    // Indian mobile number regex
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(cleanMobile);
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format phone number with country code
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // If it's 10 digits and starts with 6-9, it's an Indian number
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    // If it already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }

    // Return as is with + prefix if not already present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Format identifier based on channel type
   */
  private formatIdentifier(identifier: string, channel: string): string {
    if (channel === 'email') {
      return identifier.toLowerCase();
    }

    if (channel === 'whatsapp') {
      return `whatsapp:${this.formatPhoneNumber(identifier)}`;
    }

    return this.formatPhoneNumber(identifier);
  }

  /**
   * Determine channel type from identifier
   */
  private getChannelType(identifier: string): 'sms' | 'email' {
    return this.validateEmail(identifier) ? 'email' : 'sms';
  }

  /**
   * Mask identifier for logging
   */
  private maskIdentifier(identifier: string): string {
    if (this.validateEmail(identifier)) {
      const [user, domain] = identifier.split('@');
      return `${user.substring(0, 2)}***@${domain}`;
    }

    // Mask phone number
    return identifier.replace(/.(?=.{4})/g, '*');
  }

  /**
   * Check if running in test mode
   */
  private isTestMode(): boolean {
    const env = this.configService.get('NODE_ENV');
    const enableTestOTP = this.configService.get('ENABLE_TEST_OTP', 'false');

    return (
      !this.twilioClient ||
      env === 'development' ||
      enableTestOTP === 'true' ||
      !this.verifyServiceSid
    );
  }
}