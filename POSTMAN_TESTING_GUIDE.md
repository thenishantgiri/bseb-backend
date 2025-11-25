# BSEB Connect - Postman Testing Guide

## 🚀 Quick Start

### Step 1: Import Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose: `BSEB_Connect_API.postman_collection.json`
5. Click **Import**

### Step 2: Set Environment Variables

The collection uses these variables (already configured):
- `base_url`: http://localhost:3000
- `auth_token`: (auto-saved after login)

---

## 📝 Testing Scenarios

### Scenario 1: Test Email Login (NEW Feature)

**Goal**: Verify that users can login with email instead of phone

1. **Send OTP to Email**
   ```
   POST /auth/login/otp
   Body: { "identifier": "test@example.com" }
   ```
   - ✅ Expected: Status 400 "User not registered" (email doesn't exist yet)
   - Check backend console for OTP

2. **Register a user first**
   ```
   POST /auth/register
   Body: {
     "phone": "9876543210",
     "email": "test@example.com",
     "password": "Password@123",
     "fullName": "Test User",
     "class": "12",
     "schoolName": "Test School"
   }
   ```

3. **Send OTP again**
   ```
   POST /auth/login/otp
   Body: { "identifier": "test@example.com" }
   ```
   - ✅ Expected: "OTP sent successfully"
   - Check console: `OTP for email test@example.com: 123456`

4. **Verify OTP**
   ```
   POST /auth/login/verify
   Body: {
     "identifier": "test@example.com",
     "otp": "123456"  // Use OTP from console
   }
   ```
   - ✅ Expected: JWT token in response
   - Token automatically saved to `{{auth_token}}`

---

### Scenario 2: Test Login Lockout (NEW Feature)

**Goal**: Verify account locks after failed attempts

**OTP Lockout (5 attempts)**

1. Send OTP for a registered user
2. Try wrong OTP 5 times:
   ```
   POST /auth/login/verify
   Body: { "identifier": "9876543210", "otp": "000000" }
   ```
3. On 5th attempt:
   - ✅ Expected: "Account temporarily locked... Try again in 15 minutes"

**Password Lockout (10 attempts)**

1. Try wrong password 10 times:
   ```
   POST /auth/login/password
   Body: { "identifier": "9876543210", "password": "WrongPass" }
   ```
2. On 10th attempt:
   - ✅ Expected: "Account temporarily locked... Try again in 60 minutes"

---

### Scenario 3: BSEB Credential Verification (NEW Feature)

**Goal**: Verify BSEB students can register with auto-filled data

1. **Verify BSEB Credentials**
   ```
   POST /auth/verify-bseb-credentials
   Body: {
     "rollNumber": "TEST123",
     "dob": "2005-01-01"
   }
   ```
   - ✅ Expected: Full student data from BSEB database
   - Response includes: name, parents, school, address, etc.

2. **Register with Verified Data**
   ```
   POST /auth/register/bseb-linked
   Body: {
     "rollNumber": "TEST123",
     "dob": "2005-01-01",
     "phone": "9000000001",
     "email": "bseb1@test.com",
     "password": "Test@1234"
   }
   ```
   - ✅ Expected: "Registration successful with BSEB credentials"
   - All BSEB data auto-filled in profile

3. **Login and Check Profile**
   ```
   POST /auth/login/password
   Body: { "identifier": "9000000001", "password": "Test@1234" }

   Then:
   GET /profile
   Headers: Authorization: Bearer {{auth_token}}
   ```
   - ✅ Expected: Profile has all BSEB data auto-populated

---

### Scenario 4: Change Password (Logged In) (NEW Feature)

**Goal**: Verify users can change password while logged in

1. **Login first**
   ```
   POST /auth/login/password
   Body: { "identifier": "9876543210", "password": "Password@123" }
   ```

2. **Change Password**
   ```
   POST /profile/change-password
   Headers: Authorization: Bearer {{auth_token}}
   Body: {
     "currentPassword": "Password@123",
     "newPassword": "NewPassword@456"
   }
   ```
   - ✅ Expected: "Password changed successfully"

3. **Test New Password**
   ```
   POST /auth/login/password
   Body: { "identifier": "9876543210", "password": "NewPassword@456" }
   ```
   - ✅ Expected: Login successful

4. **Try Wrong Current Password**
   ```
   POST /profile/change-password
   Body: {
     "currentPassword": "WrongPass",
     "newPassword": "Another@789"
   }
   ```
   - ✅ Expected: "Current password is incorrect"

---

### Scenario 5: Session Management (NEW Feature)

**Goal**: Test multi-device session tracking and management

1. **Login from "Device 1"**
   ```
   POST /auth/login/password
   Body: { "identifier": "9876543210", "password": "Password@123" }
   ```
   - Save token as `device1_token`

2. **Login from "Device 2"** (same user)
   ```
   POST /auth/login/password
   Body: { "identifier": "9876543210", "password": "Password@123" }
   ```
   - Save token as `device2_token`

3. **View All Sessions** (from Device 1)
   ```
   GET /profile/sessions
   Headers: Authorization: Bearer {{device1_token}}
   ```
   - ✅ Expected: Array with 2 sessions
   - Each session shows: id, deviceInfo, ipAddress, createdAt, lastUsedAt

4. **Logout Other Devices** (from Device 1)
   ```
   POST /profile/sessions/revoke-others
   Headers: Authorization: Bearer {{device1_token}}
   ```
   - ✅ Expected: "All other sessions revoked successfully"

5. **Try Device 2 Token** (should fail)
   ```
   GET /profile
   Headers: Authorization: Bearer {{device2_token}}
   ```
   - ✅ Expected: 401 Unauthorized (session revoked)

6. **Device 1 Still Works**
   ```
   GET /profile
   Headers: Authorization: Bearer {{device1_token}}
   ```
   - ✅ Expected: Profile data returned (session still active)

7. **Logout All Devices**
   ```
   POST /profile/sessions/revoke-all
   Headers: Authorization: Bearer {{device1_token}}
   ```
   - ✅ Expected: All sessions revoked including current

---

### Scenario 6: Password Reset with Extended OTP (Fixed)

**Goal**: Verify password reset OTP expires in 30 minutes (not 5)

1. **Request Password Reset**
   ```
   POST /auth/password/forgot
   Body: { "identifier": "9876543210" }
   ```
   - Check console for OTP
   - ✅ Expected: "OTP sent successfully"

2. **Wait 6 minutes** (old expiry was 5 minutes)

3. **Reset Password**
   ```
   POST /auth/password/reset
   Body: {
     "identifier": "9876543210",
     "otp": "123456",
     "newPassword": "Reset@12345"
   }
   ```
   - ✅ Expected: Still works (30-minute expiry)

4. **Wait 31 minutes** and try

   - ✅ Expected: "OTP expired or invalid"

---

## 🧪 Test All Features Checklist

### Authentication
- [ ] Login with phone number (OTP)
- [ ] Login with email (OTP) ⭐ NEW
- [ ] Login with password (phone)
- [ ] Login with password (email) ⭐ NEW
- [ ] OTP login lockout after 5 attempts ⭐ NEW
- [ ] Password login lockout after 10 attempts ⭐ NEW
- [ ] Forgot password
- [ ] Reset password with OTP (30min expiry) ⭐ FIXED

### Registration
- [ ] Register new user (Path B)
- [ ] Verify BSEB credentials ⭐ NEW
- [ ] Register with BSEB data auto-fill ⭐ NEW
- [ ] Upload photo during registration
- [ ] Upload signature during registration

### Profile Management
- [ ] View profile
- [ ] Update profile
- [ ] Upgrade class
- [ ] Change password (while logged in) ⭐ NEW
- [ ] Upload/Update photo
- [ ] Upload/Update signature
- [ ] Delete account

### Session Management ⭐ NEW
- [ ] View all active sessions
- [ ] Revoke specific session
- [ ] Logout other devices
- [ ] Logout all devices

---

## 📊 Expected Console Output

When testing OTP features, check backend console for:

```
OTP for phone 9876543210: 123456
OTP for email test@example.com: 654321
Password Reset OTP for phone 9876543210: 789012
✅ Redis connected
```

---

## 🔍 Testing Edge Cases

### Email Validation
- ✅ Valid: user@example.com
- ❌ Invalid: userexample.com
- ❌ Invalid: @example.com
- ❌ Invalid: user@

### Password Validation
- ✅ Valid: Password@123 (8+ chars, upper, lower, number, special)
- ❌ Invalid: password123 (no uppercase, no special)
- ❌ Invalid: Pass@1 (< 8 chars)
- ❌ Invalid: Password123 (no special char)

### Phone Validation
- ✅ Valid: 9876543210 (exactly 10 digits)
- ❌ Invalid: 987654321 (< 10 digits)
- ❌ Invalid: 98765432101 (> 10 digits)
- ❌ Invalid: 98765abc10 (contains letters)

---

## 🐛 Common Issues & Solutions

### Issue: "User not registered"
**Solution**: Register the user first before trying to login

### Issue: "Account temporarily locked"
**Solution**: Wait for lockout period (15 mins for OTP, 60 mins for password) or clear Redis:
```bash
docker exec -it bseb-redis redis-cli FLUSHALL
```

### Issue: "OTP expired or invalid"
**Solution**: Request new OTP (30-minute window)

### Issue: 401 Unauthorized on protected routes
**Solution**:
1. Login first to get token
2. Check token is in Headers: `Authorization: Bearer <token>`
3. Token might be expired (30-day validity)

### Issue: "Invalid credentials" but password is correct
**Solution**: Check if account is locked due to failed attempts

---

## 📈 Performance Testing

Use Postman Runner to test:

1. **Load Test OTP**: Send 100 requests to /auth/login/otp
   - Should hit rate limit (5/hour per user)

2. **Concurrent Logins**: Login same user from multiple "devices"
   - Check session management works

3. **Session Cleanup**: Create 50+ sessions, then logout all
   - Verify all sessions revoked

---

## 🎯 Success Criteria

All features working correctly if:
- ✅ Email login works (OTP + Password)
- ✅ Account locks after max failed attempts
- ✅ BSEB verification returns student data
- ✅ Password change works for logged-in users
- ✅ Password reset OTP lasts 30 minutes
- ✅ Multiple sessions tracked correctly
- ✅ Session revocation works (specific, others, all)
- ✅ Audit logs recorded (check database)

---

## 🔐 Security Features to Verify

1. **Rate Limiting**: Max 5 OTP requests per hour
2. **Account Lockout**: Automatic after failed attempts
3. **Password Policy**: Enforced on all password changes
4. **JWT Expiry**: 30 days (verify token eventually expires)
5. **Session Security**: Revoked sessions can't access APIs
6. **Audit Trail**: All auth events logged (check DB)

---

## 📝 Notes for Production

Before deploying:

1. **Replace Mock BSEB API** (`auth.service.ts:362`)
   - Currently returns test data for rollNumber="TEST123"
   - Integrate actual BSEB database API

2. **Integrate SMS Gateway** (`auth.service.ts:43, 191`)
   - Replace console.log with actual SMS service

3. **Integrate Email Service** (`auth.service.ts:45, 192`)
   - Replace console.log with actual email service

4. **Update JWT Secret** (`.env`)
   - Change from default to secure secret

5. **Configure Redis** for production
   - Use Redis cluster for high availability

---

## 🎉 Happy Testing!

All 7 critical features are now fully implemented and ready to test!

For any issues, check:
- Backend console logs
- Database records (Session, AuditLog tables)
- Redis keys (otp:*, failed:*, reset:*)
