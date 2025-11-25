# Complete SendGrid Setup Guide for BSEB Connect

## Overview
This guide walks you through setting up SendGrid from scratch for sending OTP emails in the BSEB Connect application.

---

## Part 1: Create SendGrid Account

### Step 1.1: Sign Up

1. **Visit SendGrid Signup Page:**
   - URL: https://signup.sendgrid.com/
   - Or: https://sendgrid.com → Click "Start for Free"

2. **Fill Registration Form:**
   ```
   Email Address: your-work-email@gmail.com
   Password: [Create strong password - min 8 chars]
   ```
   - ✅ Use a real email address you can access
   - ✅ Choose a strong password

3. **Click "Create Account"**

### Step 1.2: Account Information

You'll be asked for additional details:

```
First Name: [Your Name]
Last Name: [Your Last Name]
Company Name: Bihar School Examination Board
Website URL: https://bseb-connect.mvpl.info
```

**Select Account Type:**
- ✅ Choose: **"I'm a developer"**
- This unlocks API access

**Click "Get Started"**

### Step 1.3: Email Verification

1. **Check your email inbox** for message from SendGrid
   - Subject: "Please Verify Your SendGrid Account"

2. **Click the verification link** in the email

3. **You'll be redirected** to SendGrid dashboard

---

## Part 2: Complete Onboarding Questionnaire

SendGrid will ask a few questions to optimize your experience:

### Question 1: Email Volume
**"How many emails do you plan to send per month?"**

Select: **"Less than 40,000"**
- Free tier: 100 emails/day (3,000/month)
- This is sufficient for testing and small deployments

### Question 2: Email Type
**"What type of emails will you send?"**

Select: **"Transactional Emails"**
- OTP emails are transactional (triggered by user actions)
- NOT marketing emails

### Question 3: Integration Method
**"How will you integrate SendGrid?"**

Select: **"Web API"**
- Our backend uses SendGrid's REST API via Node.js SDK

**Click "Next" or "Continue"**

---

## Part 3: Sender Authentication (CRITICAL STEP)

SendGrid requires sender verification before allowing emails to be sent.

### Option A: Single Sender Verification (Quick - Recommended for Development)

**This is the fastest way to start sending emails.**

#### Step 3A.1: Navigate to Sender Authentication

1. **In SendGrid Dashboard**, click on **Settings** (left sidebar)
2. Click on **Sender Authentication**
3. Under "Single Sender Verification", click **"Get Started"** or **"Create New Sender"**

#### Step 3A.2: Fill Sender Details

You'll see a form - fill it carefully:

```
From Name: BSEB Connect
(This is what users see as the sender name)

From Email Address: noreply@yourdomain.com
(Options:
  - If you have a domain: noreply@bseb-connect.in
  - For testing with Gmail: your-email+bseb@gmail.com
  - For testing with personal domain: notifications@yourdomain.com
)

Reply To: support@bseb-connect.in
(Where users' replies will go - can be same as From Email)

Company Address: Bihar School Examination Board, Patna
Street: [Your office address]
City: Patna
State: Bihar
Zip Code: 800001
Country: India

Nickname: BSEB Connect Notifications
(Internal reference - only you see this)
```

**Important Notes:**
- ✅ The "From Email" must be an email you can access
- ✅ You'll receive a verification email at this address
- ✅ For Gmail users, you can use the `+` trick: `yourname+bseb@gmail.com`

#### Step 3A.3: Verify the Sender Email

1. **Click "Create"** at the bottom of the form

2. **Check the email inbox** for the "From Email" you entered
   - Subject: "Please Verify Your Sender Address"
   - From: SendGrid

3. **Click the verification link** in the email
   - You'll see: "Your sender identity has been verified!"

4. **Return to SendGrid dashboard**
   - Your sender should now show a ✅ **Verified** status

#### Step 3A.4: Confirm Verification

In SendGrid Dashboard:
- Go to **Settings** → **Sender Authentication**
- Under "Single Sender Verification", you should see:
  ```
  BSEB Connect
  noreply@yourdomain.com
  Status: Verified ✅
  ```

---

### Option B: Domain Authentication (Recommended for Production)

**This is more complex but provides better deliverability and professionalism.**

Skip this for now if you're just testing. Come back to this when deploying to production.

#### When to Use Domain Authentication:
- ✅ You have access to your domain's DNS settings
- ✅ You're deploying to production
- ✅ You want better email deliverability
- ✅ You want to send from @yourdomain.com addresses

#### Step 3B.1: Start Domain Authentication

1. In **Settings** → **Sender Authentication**
2. Under "Domain Authentication", click **"Get Started"**

#### Step 3B.2: Select DNS Host

Choose where your domain's DNS is managed:
- GoDaddy
- Namecheap
- Cloudflare ✅ (Most common)
- AWS Route 53
- Other

**Select your provider** and click **"Next"**

#### Step 3B.3: Enter Domain Information

```
Domain You Send From: bseb-connect.in
(Your actual domain name, without www or http://)

Advanced Settings:
☑️ Use automated security (Recommended)
☐ Link branding (Optional)
```

**Click "Next"**

#### Step 3B.4: Add DNS Records

SendGrid will show you DNS records to add. Example:

```
Record Type: CNAME
Host: em1234.bseb-connect.in
Value: u1234567.wl123.sendgrid.net

Record Type: CNAME
Host: s1._domainkey.bseb-connect.in
Value: s1.domainkey.u1234567.wl123.sendgrid.net

Record Type: CNAME
Host: s2._domainkey.bseb-connect.in
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

#### Step 3B.5: Add Records to Your DNS Provider

**Example for Cloudflare:**

1. Login to Cloudflare
2. Select your domain: `bseb-connect.in`
3. Go to **DNS** tab
4. For each record from SendGrid:
   - Click **"Add record"**
   - Type: `CNAME`
   - Name: `em1234` (copy from SendGrid, remove domain part)
   - Target: `u1234567.wl123.sendgrid.net` (from SendGrid)
   - Proxy status: **DNS only** (gray cloud, not orange)
   - Click **"Save"**
5. Repeat for all 3 CNAME records

#### Step 3B.6: Verify DNS Records in SendGrid

Back in SendGrid:
1. After adding all DNS records, click **"Verify"**
2. SendGrid will check DNS records (may take 24-48 hours to propagate)
3. Once verified, you'll see: ✅ **"Your domain has been authenticated"**

---

## Part 4: Create API Key

Now that your sender is verified, create an API key for the backend to use.

### Step 4.1: Navigate to API Keys

1. In SendGrid Dashboard, click **Settings** (left sidebar)
2. Click **API Keys**
3. Click **"Create API Key"** button (top right)

### Step 4.2: Configure API Key

You'll see a form:

```
API Key Name: BSEB Connect Backend
(Use a descriptive name to identify this key later)
```

**API Key Permissions:**
- Select: **"Restricted Access"** (Recommended for security)

**Expand the permissions list:**
- Scroll down to **"Mail Send"**
- Click to expand it
- Select: **"Full Access"** for Mail Send
- All other permissions should remain **"No Access"**

**Click "Create & View"**

### Step 4.3: Copy and Save API Key

**⚠️ CRITICAL - You'll only see this once!**

SendGrid will show your API key:
```
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy this entire key** and save it securely:

1. **Copy to clipboard** (click the copy icon)
2. **Save to a password manager** (recommended)
3. **Or save to a secure note** temporarily

**Example places to save:**
- 1Password, LastPass, Bitwarden
- Encrypted notes app
- `.env` file on your local machine (NEVER commit to Git)

**Click "Done"** after copying

---

## Part 5: Configure Backend Environment

Now add the API key to your backend configuration.

### Step 5.1: Create .env File

In your backend directory:

```bash
cd /Users/thenishantgiri/Work/bseb_connect/backend
cp .env.example .env
```

### Step 5.2: Edit .env File

Open `.env` and add your SendGrid configuration:

```bash
# SendGrid Configuration
SENDGRID_API_KEY="SG.paste_your_actual_api_key_here"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
SENDGRID_FROM_NAME="BSEB Connect"

# For testing, enable test mode to avoid sending real emails
ENABLE_TEST_EMAIL="false"  # Change to "true" for testing
NODE_ENV="development"
```

**Replace these values:**
- `SENDGRID_API_KEY`: Paste the API key you copied
- `SENDGRID_FROM_EMAIL`: Use the exact email you verified in Step 3
- `SENDGRID_FROM_NAME`: Display name users will see

**Important:**
- ✅ `SENDGRID_FROM_EMAIL` must match a verified sender
- ✅ Never commit `.env` to Git (it's in `.gitignore`)
- ✅ Keep API key secret

### Step 5.3: Test Mode vs Production Mode

**For Testing (Development):**
```bash
ENABLE_TEST_EMAIL="true"
NODE_ENV="development"
```
- Emails are logged to console, not sent
- No SendGrid API calls
- Free to test unlimited times

**For Production:**
```bash
ENABLE_TEST_EMAIL="false"
NODE_ENV="production"
```
- Real emails sent via SendGrid
- Uses your email quota
- Requires valid API key and verified sender

---

## Part 6: Test Email Sending

### Step 6.1: Start Backend Server

```bash
cd /Users/thenishantgiri/Work/bseb_connect/backend
npm run start:dev
```

Wait for:
```
[EmailService] SendGrid email service initialized
[NestApplication] Nest application successfully started
```

### Step 6.2: Test in Test Mode (Recommended First)

1. **Set test mode** in `.env`:
   ```bash
   ENABLE_TEST_EMAIL="true"
   ```

2. **Restart server**

3. **Make API request:**
   ```bash
   curl -X POST http://localhost:3000/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "test@example.com"
     }'
   ```

4. **Check console logs** - you should see:
   ```
   [EmailService] Test mode: Would send OTP 123456 to test@example.com
   ```

5. **Verify with the logged OTP:**
   ```bash
   curl -X POST http://localhost:3000/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "test@example.com",
       "otp": "123456"
     }'
   ```

✅ If this works, test mode is configured correctly!

### Step 6.3: Test with Real Email

1. **Disable test mode** in `.env`:
   ```bash
   ENABLE_TEST_EMAIL="false"
   NODE_ENV="production"
   ```

2. **Restart server**

3. **Send OTP to your real email:**
   ```bash
   curl -X POST http://localhost:3000/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "your-real-email@gmail.com"
     }'
   ```

4. **Check your email inbox** (and spam folder)
   - You should receive a professional OTP email
   - Subject: "Your BSEB Connect Login OTP"
   - Contains 6-digit OTP code

5. **Use the OTP from email to verify:**
   ```bash
   curl -X POST http://localhost:3000/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "your-real-email@gmail.com",
       "otp": "PASTE_OTP_FROM_EMAIL"
     }'
   ```

✅ If you receive the email and verification works, SendGrid is fully configured!

---

## Part 7: Monitor Email Activity

### Step 7.1: View Email Activity Feed

1. **In SendGrid Dashboard**, click **"Activity"** (left sidebar)
2. Click **"Email Activity"**

You'll see all sent emails:
```
Status: Delivered ✅
To: your-email@gmail.com
Subject: Your BSEB Connect Login OTP
Timestamp: 2025-11-26 03:45:23
```

### Step 7.2: Check Email Stats

Click **"Statistics"** in sidebar to see:
- Total emails sent
- Delivery rate
- Bounce rate
- Spam reports

### Step 7.3: Monitor Quota

Free tier limits:
- **100 emails/day**
- **3,000 emails/month**

Check remaining quota:
- Dashboard → Click your profile (top right)
- Shows: "X emails sent today"

---

## Part 8: Production Deployment

### Step 8.1: Add Environment Variables to Production Server

**For AWS EC2 / Digital Ocean / Any Linux Server:**

```bash
# SSH into your production server
ssh user@your-server-ip

# Edit environment file
cd /path/to/backend
nano .env

# Add SendGrid config
SENDGRID_API_KEY="SG.your_production_api_key"
SENDGRID_FROM_EMAIL="noreply@bseb-connect.in"
SENDGRID_FROM_NAME="BSEB Connect"
ENABLE_TEST_EMAIL="false"
NODE_ENV="production"

# Save and exit (Ctrl+X, Y, Enter)

# Restart backend service
pm2 restart bseb-backend
# or
systemctl restart bseb-backend
```

**For Docker:**

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    environment:
      - SENDGRID_API_KEY=SG.your_production_api_key
      - SENDGRID_FROM_EMAIL=noreply@bseb-connect.in
      - SENDGRID_FROM_NAME=BSEB Connect
      - ENABLE_TEST_EMAIL=false
      - NODE_ENV=production
```

**For AWS Elastic Beanstalk:**

```bash
eb setenv SENDGRID_API_KEY="SG.your_key" \
          SENDGRID_FROM_EMAIL="noreply@bseb-connect.in" \
          SENDGRID_FROM_NAME="BSEB Connect" \
          ENABLE_TEST_EMAIL="false" \
          NODE_ENV="production"
```

### Step 8.2: Test Production

After deployment, test with production URL:

```bash
curl -X POST https://bseb-backend.mvpl.info/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "your-email@gmail.com"
  }'
```

Check email inbox and SendGrid Activity Feed.

---

## Troubleshooting

### Issue 1: "The from address does not match a verified Sender Identity"

**Problem:** Email sending fails with authorization error

**Solution:**
1. Go to SendGrid → Settings → Sender Authentication
2. Verify your sender email is listed and has ✅ Verified status
3. Make sure `SENDGRID_FROM_EMAIL` in `.env` exactly matches verified email
4. Restart backend server

### Issue 2: "Unauthorized" or "Invalid API Key"

**Problem:** API requests fail with 401 error

**Solution:**
1. Check API key is copied correctly (no extra spaces)
2. Verify API key has "Mail Send" permissions
3. Try regenerating API key in SendGrid
4. Update `.env` with new key

### Issue 3: Emails Going to Spam

**Problem:** OTP emails land in spam folder

**Solution:**
1. Use Domain Authentication instead of Single Sender (Part 3B)
2. Add SPF and DKIM records to your domain
3. Ask recipients to mark as "Not Spam"
4. Avoid spam trigger words in email content

### Issue 4: "Quota Exceeded"

**Problem:** Can't send more emails after hitting free tier limit

**Solution:**
1. Wait until next day (quota resets daily)
2. Upgrade to paid plan:
   - SendGrid → Settings → Billing
   - Choose plan (Essentials: $19.95/month for 50,000 emails)

### Issue 5: No Email Received

**Problem:** API says "OTP sent" but email not received

**Solution:**
1. Check spam/junk folder
2. Check SendGrid Activity Feed for delivery status
3. Verify recipient email is valid
4. Check backend logs for errors:
   ```bash
   tail -f logs/backend.log | grep EmailService
   ```

### Issue 6: DNS Records Not Verifying (Domain Auth)

**Problem:** Domain authentication shows "Not Verified" after adding DNS records

**Solution:**
1. Wait 24-48 hours for DNS propagation
2. Verify DNS records are added correctly:
   ```bash
   nslookup em1234.bseb-connect.in
   ```
3. Ensure Cloudflare proxy is disabled (gray cloud, not orange)
4. Try "Verify" button again in SendGrid

---

## Security Best Practices

### 1. Protect Your API Key

❌ **NEVER do this:**
```javascript
// DO NOT hardcode API key in code
const apiKey = 'SG.xxxxxxxxxxxxx';
```

✅ **Always use environment variables:**
```javascript
const apiKey = process.env.SENDGRID_API_KEY;
```

### 2. Use Restricted API Keys

- ✅ Create separate keys for different environments (dev, staging, prod)
- ✅ Use minimum required permissions (only Mail Send)
- ✅ Rotate keys periodically (every 90 days)

### 3. Monitor for Abuse

- ✅ Check SendGrid Activity Feed regularly
- ✅ Set up alerts for high bounce rates
- ✅ Implement rate limiting on your backend

### 4. Secure Your .env File

```bash
# Verify .env is in .gitignore
cat .gitignore | grep .env

# Should show:
.env
.env.local
.env.*.local
```

---

## Cost Planning

### Free Tier (Current)
- **100 emails/day** (3,000/month)
- **Cost:** $0
- **Good for:** Testing, development, small user base

### When to Upgrade

Calculate your needs:
```
Average OTP logins per day: 500
× 1 email per login = 500 emails/day
× 30 days = 15,000 emails/month

Need: Essentials Plan
```

### SendGrid Plans (2024 Pricing)

| Plan | Price/Month | Emails/Month | Cost per Email |
|------|-------------|--------------|----------------|
| Free | $0 | 3,000 (100/day) | $0 |
| Essentials | $19.95 | 50,000 | $0.0004 |
| Pro 100K | $89.95 | 100,000 | $0.0009 |

**Recommendation for BSEB Connect:**
- **Development:** Free tier
- **Production (< 3,000 emails/month):** Free tier
- **Production (> 3,000 emails/month):** Essentials plan

---

## Summary Checklist

Before considering SendGrid setup complete:

- [ ] SendGrid account created and email verified
- [ ] Sender identity verified (Single Sender or Domain Auth)
- [ ] API key created with Mail Send permissions
- [ ] API key saved securely
- [ ] `.env` file configured with SendGrid credentials
- [ ] Test mode working (OTP logged to console)
- [ ] Production mode working (real email received)
- [ ] Email template looks professional (check inbox)
- [ ] OTP verification works end-to-end
- [ ] Backend logs show successful sends
- [ ] SendGrid Activity Feed shows delivered emails
- [ ] Production environment variables configured
- [ ] Monitoring setup (Activity Feed bookmarked)

---

## Support Resources

### SendGrid Documentation
- Quick Start: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
- API Reference: https://docs.sendgrid.com/api-reference/mail-send/mail-send
- Sender Auth: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication

### SendGrid Support
- Support Portal: https://support.sendgrid.com
- Status Page: https://status.sendgrid.com
- Community: https://community.sendgrid.com

### BSEB Connect Specific
- Email Service Code: `backend/src/common/email.service.ts`
- Email Setup Guide: `backend/EMAIL_SETUP.md`
- Testing Guide: `backend/test-email-otp.md`

---

## Next Steps

After completing SendGrid setup:

1. **Test thoroughly** in development
2. **Document your credentials** securely
3. **Set up production environment** variables
4. **Monitor email delivery** for first week
5. **Plan for scale** if expecting high volume
6. **Consider upgrading** when approaching 100 emails/day
7. **Implement rate limiting** to prevent abuse
8. **Set up email templates** for other notifications (password reset, welcome email, etc.)

---

**Setup Date:** 2025-11-26
**Version:** 1.0
**Maintainer:** BSEB Connect Backend Team
