# Email OTP Setup with SendGrid

This document explains how to configure SendGrid for email OTP functionality in the BSEB Connect backend.

## Overview

The application uses SendGrid for sending OTP emails to users during login and registration. The email service provides:
- OTP emails with professional HTML templates
- Email verification for new registrations
- Password reset emails

## Prerequisites

1. A SendGrid account (sign up at https://sendgrid.com)
2. Verified sender email address in SendGrid
3. SendGrid API key with mail send permissions

## Setup Instructions

### 1. Create SendGrid Account

1. Go to https://sendgrid.com and sign up for a free account
2. Verify your email address
3. Complete the sender authentication process

### 2. Create and Verify Sender Identity

SendGrid requires you to verify your sender email address:

1. Go to **Settings** → **Sender Authentication**
2. Choose one of two options:
   - **Single Sender Verification** (easier, for single email)
   - **Domain Authentication** (recommended for production)

For development, Single Sender Verification is sufficient:
- Click "Verify a Single Sender"
- Fill in your details (From Name: "BSEB Connect", From Email: "noreply@yourdomain.com")
- Check your email and click the verification link

### 3. Create API Key

1. Go to **Settings** → **API Keys**
2. Click "Create API Key"
3. Name: "BSEB Connect Backend"
4. Permissions: "Restricted Access"
   - Enable: **Mail Send** → Full Access
5. Copy the API key (you'll only see it once!)

### 4. Configure Environment Variables

Add the following to your `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxx"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
SENDGRID_FROM_NAME="BSEB Connect"

# Optional: Enable test mode (logs instead of sending)
ENABLE_TEST_EMAIL="false"
NODE_ENV="production"
```

**Important:**
- `SENDGRID_FROM_EMAIL` must be a verified sender in your SendGrid account
- Keep your API key secure and never commit it to version control

### 5. Test Email Sending

For local development/testing, you can enable test mode:

```bash
ENABLE_TEST_EMAIL="true"
NODE_ENV="development"
```

In test mode, emails are logged to the console instead of being sent.

## Email Templates

The service includes three email templates:

### 1. OTP Email
- Sent during login when user selects email authentication
- Contains 6-digit OTP valid for 5 minutes
- Professional HTML design with BSEB branding

### 2. Verification Email
- Sent during new user registration
- Contains verification link
- Ensures email ownership

### 3. Password Reset Email
- Sent when user requests password reset
- Contains secure reset link valid for 1 hour

## Architecture

### Service Flow

```
User requests OTP login with email
         ↓
AuthService.sendOtpLogin()
         ↓
Generate 6-digit OTP
         ↓
Store OTP in Redis (5 min TTL)
         ↓
EmailService.sendOtpEmail()
         ↓
SendGrid API → User's inbox
```

### Files

- `src/common/email.service.ts` - Email service with SendGrid integration
- `src/auth/auth.service.ts` - Auth service that uses EmailService for OTP
- `src/auth/auth.module.ts` - Module configuration

## SMS vs Email OTP

The system supports both SMS and Email OTP:

- **SMS OTP**: Uses TwilioService (`twilio.service.ts`)
- **Email OTP**: Uses EmailService (`email.service.ts`)

The system automatically detects whether the user provided a phone number or email:

```typescript
if (this.isEmail(identifier)) {
  // Send via EmailService (SendGrid)
  await this.emailService.sendOtpEmail(identifier, otp);
} else {
  // Send via TwilioService (Twilio SMS)
  await this.twilioService.sendSMS(identifier, otpMessage);
}
```

## Production Checklist

Before deploying to production:

- [ ] SendGrid account created and verified
- [ ] Domain authentication completed (recommended)
- [ ] API key created with mail send permissions
- [ ] Sender email verified in SendGrid
- [ ] Environment variables configured on production server
- [ ] Test mode disabled (`ENABLE_TEST_EMAIL="false"`)
- [ ] Test email sending from production environment
- [ ] Monitor SendGrid dashboard for delivery statistics

## Monitoring

### SendGrid Dashboard

Monitor email delivery in the SendGrid dashboard:
1. Go to **Activity Feed** to see all sent emails
2. Check delivery status, opens, clicks, bounces
3. Review any blocked or spam-reported emails

### Logs

The EmailService logs all operations:
- Successful sends: `OTP email sent successfully to xx***@domain.com`
- Failures: `Failed to send OTP email: [error message]`

## Troubleshooting

### Email not received

1. **Check spam folder** - Emails might be marked as spam initially
2. **Verify sender authentication** - Ensure sender email is verified in SendGrid
3. **Check SendGrid Activity Feed** - See if email was sent successfully
4. **Review logs** - Check backend logs for errors

### API Key Invalid

Error: `The provided authorization grant is invalid, expired, or revoked`

Solution:
- Verify API key is copied correctly
- Check API key has "Mail Send" permissions
- Regenerate API key if needed

### Sender Email Not Verified

Error: `The from address does not match a verified Sender Identity`

Solution:
- Go to SendGrid → Sender Authentication
- Verify the sender email address
- Update `SENDGRID_FROM_EMAIL` to match verified sender

### Rate Limits

SendGrid free tier limits:
- 100 emails/day

For production, upgrade to a paid plan based on your needs.

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate API keys** - Regenerate keys periodically
3. **Use restricted permissions** - Only grant "Mail Send" permission
4. **Monitor for abuse** - Check SendGrid activity for suspicious patterns
5. **Implement rate limiting** - Prevent OTP spam (already implemented in backend)

## Cost Considerations

### SendGrid Pricing (as of 2024)

- **Free**: 100 emails/day
- **Essentials**: $19.95/month - 50,000 emails
- **Pro**: Custom pricing

For BSEB Connect with estimated user base:
- Development: Free tier sufficient
- Production: Essentials plan recommended (covers ~1,667 OTP logins/day)

## Support

For SendGrid-specific issues:
- Documentation: https://docs.sendgrid.com
- Support: https://support.sendgrid.com

For BSEB Connect backend issues:
- Check backend logs
- Review `email.service.ts` implementation
- Contact development team
