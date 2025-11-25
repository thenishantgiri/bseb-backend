import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('SENDGRID_API_KEY');

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn('SendGrid API key not found, running in test mode');
    }
  }

  /**
   * Send OTP email via SendGrid
   * @param to Email address to send OTP to
   * @param otp The OTP code
   */
  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    try {
      // In test mode, just log the OTP
      if (!this.isConfigured || this.isTestMode()) {
        this.logger.warn(`Test mode: Would send OTP ${otp} to ${to}`);
        return true;
      }

      const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL', 'noreply@bseb-connect.in');
      const fromName = this.configService.get('SENDGRID_FROM_NAME', 'BSEB Connect');

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: 'Your BSEB Connect Login OTP',
        text: `Your OTP for BSEB Connect login is: ${otp}. This OTP is valid for 5 minutes. Do not share this OTP with anyone.`,
        html: this.getOtpEmailTemplate(otp),
      };

      await sgMail.send(msg);

      this.logger.log(`OTP email sent successfully to ${this.maskEmail(to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email: ${error.message}`);

      // Log additional SendGrid error details
      if (error.response) {
        this.logger.error(`SendGrid error: ${JSON.stringify(error.response.body)}`);
      }

      return false;
    }
  }

  /**
   * Send verification email
   * @param to Email address
   * @param verificationLink Verification link
   */
  async sendVerificationEmail(to: string, verificationLink: string): Promise<boolean> {
    try {
      if (!this.isConfigured || this.isTestMode()) {
        this.logger.warn(`Test mode: Would send verification email to ${to}`);
        return true;
      }

      const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL', 'noreply@bseb-connect.in');
      const fromName = this.configService.get('SENDGRID_FROM_NAME', 'BSEB Connect');

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: 'Verify Your BSEB Connect Email',
        text: `Please verify your email by clicking on this link: ${verificationLink}`,
        html: this.getVerificationEmailTemplate(verificationLink),
      };

      await sgMail.send(msg);

      this.logger.log(`Verification email sent successfully to ${this.maskEmail(to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send password reset email
   * @param to Email address
   * @param resetLink Password reset link
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    try {
      if (!this.isConfigured || this.isTestMode()) {
        this.logger.warn(`Test mode: Would send password reset email to ${to}`);
        return true;
      }

      const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL', 'noreply@bseb-connect.in');
      const fromName = this.configService.get('SENDGRID_FROM_NAME', 'BSEB Connect');

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: 'Reset Your BSEB Connect Password',
        text: `Click on this link to reset your password: ${resetLink}. This link is valid for 1 hour.`,
        html: this.getPasswordResetEmailTemplate(resetLink),
      };

      await sgMail.send(msg);

      this.logger.log(`Password reset email sent successfully to ${this.maskEmail(to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Mask email for logging (privacy)
   */
  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (user.length <= 2) {
      return `${user[0]}***@${domain}`;
    }
    return `${user.substring(0, 2)}***@${domain}`;
  }

  /**
   * Check if running in test mode
   */
  private isTestMode(): boolean {
    const env = this.configService.get('NODE_ENV');
    const enableTestEmail = this.configService.get('ENABLE_TEST_EMAIL', 'false');

    return (
      env === 'development' ||
      enableTestEmail === 'true'
    );
  }

  /**
   * HTML template for OTP email
   */
  private getOtpEmailTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BSEB Connect - OTP Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">BSEB Connect</h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Bihar School Examination Board</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Your Login OTP</h2>
                    <p style="color: #666666; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                      You've requested to log in to your BSEB Connect account. Use the OTP below to complete your login:
                    </p>

                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                      <strong>Important:</strong>
                    </p>
                    <ul style="color: #666666; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0; padding-left: 20px;">
                      <li>This OTP is valid for <strong>5 minutes</strong></li>
                      <li>Do not share this OTP with anyone</li>
                      <li>BSEB staff will never ask for your OTP</li>
                    </ul>

                    <p style="color: #999999; margin: 30px 0 0 0; font-size: 13px; line-height: 1.5;">
                      If you didn't request this OTP, please ignore this email or contact support if you have concerns about your account security.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999999; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} Bihar School Examination Board. All rights reserved.
                    </p>
                    <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * HTML template for verification email
   */
  private getVerificationEmailTemplate(verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Verify Your Email - BSEB Connect</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">BSEB Connect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333;">Verify Your Email Address</h2>
                    <p style="color: #666666; line-height: 1.6;">
                      Thank you for registering with BSEB Connect. Please verify your email address by clicking the button below:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${verificationLink}" style="background-color: #667eea; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #999999; font-size: 13px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${verificationLink}" style="color: #667eea;">${verificationLink}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * HTML template for password reset email
   */
  private getPasswordResetEmailTemplate(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reset Your Password - BSEB Connect</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">BSEB Connect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333;">Reset Your Password</h2>
                    <p style="color: #666666; line-height: 1.6;">
                      You've requested to reset your password. Click the button below to create a new password:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" style="background-color: #667eea; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #666666; font-size: 14px;">
                      <strong>This link is valid for 1 hour.</strong>
                    </p>
                    <p style="color: #999999; font-size: 13px;">
                      If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
