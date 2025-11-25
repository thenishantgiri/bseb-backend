# Testing Email OTP Integration

## Quick Test Guide

### Option 1: Test via API (Recommended)

1. **Start the backend server:**
   ```bash
   npm run start:dev
   ```

2. **Register a test user with email:**
   ```bash
   curl -X POST https://bseb-backend.mvpl.info/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "phone": "8888888888",
       "email": "your-test-email@example.com",
       "password": "Test@123",
       "name": "Test User",
       "dateOfBirth": "2000-01-01",
       "gender": "MALE",
       "aadharNumber": "123456789012"
     }'
   ```

3. **Request OTP via email:**
   ```bash
   curl -X POST https://bseb-backend.mvpl.info/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "your-test-email@example.com"
     }'
   ```

4. **Check your email inbox** for the OTP (check spam folder if not in inbox)

5. **Verify OTP:**
   ```bash
   curl -X POST https://bseb-backend.mvpl.info/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "your-test-email@example.com",
       "otp": "123456"
     }'
   ```

### Option 2: Test Mode (Development)

For testing without sending real emails:

1. **Enable test mode in `.env`:**
   ```bash
   ENABLE_TEST_EMAIL="true"
   NODE_ENV="development"
   ```

2. **Start server:**
   ```bash
   npm run start:dev
   ```

3. **Send OTP request** (as shown in Option 1, step 3)

4. **Check console logs** - The OTP will be logged instead of sent:
   ```
   [EmailService] Test mode: Would send OTP 123456 to user@example.com
   ```

5. **Use the logged OTP** for verification

## Environment Setup for Production

To enable real email sending on production:

1. **Configure SendGrid in production environment:**
   ```bash
   # On your production server (AWS/DigitalOcean/etc.)
   export SENDGRID_API_KEY="SG.your_actual_api_key"
   export SENDGRID_FROM_EMAIL="noreply@bseb-connect.in"
   export SENDGRID_FROM_NAME="BSEB Connect"
   export ENABLE_TEST_EMAIL="false"
   export NODE_ENV="production"
   ```

2. **Restart the backend service**

3. **Test with real email address**

## Verification Checklist

- [ ] Backend builds successfully (`npm run build`)
- [ ] SendGrid API key configured
- [ ] Test mode works (logs OTP to console)
- [ ] Production mode works (sends real emails)
- [ ] OTP received in inbox (not spam)
- [ ] OTP verification succeeds
- [ ] Email template renders correctly
- [ ] 5-minute OTP expiry works
- [ ] Error handling works (invalid email, expired OTP, etc.)

## Expected Behavior

### Success Flow

1. **User requests OTP** → `POST /auth/send-otp`
   - Response: `{"status": 1, "message": "OTP sent successfully"}`

2. **OTP generated and stored** → Redis (5 min TTL)

3. **Email sent via SendGrid** → User receives email with OTP

4. **User enters OTP** → `POST /auth/verify-otp`
   - Response: `{"status": 1, "token": "jwt_token", ...}`

### Error Scenarios

1. **User not registered:**
   - Response: `{"statusCode": 400, "message": "User not registered"}`

2. **Email send failed:**
   - Response: `{"statusCode": 400, "message": "Failed to send OTP email. Please try again."}`

3. **Invalid OTP:**
   - Response: `{"statusCode": 401, "message": "Invalid OTP"}`

4. **Expired OTP:**
   - Response: `{"statusCode": 401, "message": "OTP expired or invalid"}`

## Monitoring

### Backend Logs

Check logs for email sending activity:

```bash
# Successful send
[EmailService] OTP email sent successfully to us***@example.com

# Test mode
[EmailService] Test mode: Would send OTP 123456 to user@example.com

# Error
[EmailService] Failed to send OTP email: [error details]
```

### SendGrid Dashboard

Monitor email delivery:
1. Login to SendGrid dashboard
2. Go to **Activity Feed**
3. View sent emails, delivery status, bounces
4. Check for any blocked or spam-reported emails

## Troubleshooting

### Common Issues

**1. OTP not received**
- Check spam/junk folder
- Verify sender email in SendGrid
- Check SendGrid Activity Feed
- Review backend logs

**2. Build errors**
- Ensure `@sendgrid/mail` is installed: `npm install @sendgrid/mail`
- Check TypeScript compilation: `npm run build`

**3. SendGrid API errors**
- Verify API key is correct
- Check API key has "Mail Send" permissions
- Ensure sender email is verified

**4. Test mode not working**
- Verify `ENABLE_TEST_EMAIL="true"` in `.env`
- Restart server after changing environment variables
- Check logs for test mode messages

## Integration with Frontend

The Flutter app should use the email OTP flow as follows:

```dart
// 1. User enters email on login screen
final email = "user@example.com";

// 2. Request OTP
final response = await authService.sendOtp(email);

// 3. Navigate to OTP screen
if (response.status == 1) {
  Navigator.push(context, OtpScreen(identifier: email));
}

// 4. User enters OTP
final otpResponse = await authService.verifyOtp(email, otp);

// 5. Save token and navigate to home
if (otpResponse.status == 1) {
  await storage.saveToken(otpResponse.token);
  Navigator.pushReplacement(context, HomeScreen());
}
```

## Security Notes

- OTPs are stored in Redis with 5-minute expiration
- Email addresses are masked in logs for privacy
- Rate limiting should be implemented to prevent OTP spam
- SendGrid API key must be kept secure (use environment variables)

## Next Steps

1. Test in development with test mode enabled
2. Configure SendGrid account with verified sender
3. Test with real email in staging environment
4. Deploy to production with proper monitoring
5. Monitor SendGrid dashboard for delivery metrics
6. Implement rate limiting if not already present
