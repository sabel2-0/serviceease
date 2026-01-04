# Requester Registration Multi-Step Form & Verification Code System

## Changes Implemented

### 1. Multi-Step Form with Proper Visibility
- **Fixed:** All steps were showing at once ("Step 1 of 6" but everything visible)
- **Solution:** Wrapped each section in `.form-step` divs with `data-step` attributes
- **Steps:**
  1. Personal Information (Name, Email)
  2. Institution Information (Type, Search)
  3. Printer Information (Serial, Brand with validation)
  4. ID Verification (Front, Back, Selfie uploads)
  5. Account Security (Password, Confirm Password)

### 2. Verification Code System
- **Changed From:** Email with clickable verification link
- **Changed To:** 6-digit verification code sent via email
- **Why:** More user-friendly, no broken links, easier to copy/paste

### 3. Database Changes
**New Column:**
- `requester_registrations.email_verification_code` VARCHAR(6)
- Migration file: `server/migrations/add_verification_code.sql`

### 4. Registration Flow

```
Step 1: User fills Personal Info → Click Next
Step 2: User selects Institution → Click Next  
Step 3: User adds Printers → Click Next
Step 4: User uploads ID photos → Click Next
Step 5: User creates Password → Click Submit
   ↓
Server creates record in requester_registrations
status = 'pending_verification'
Sends 6-digit code via email
   ↓
Modal appears asking for code
User enters 6-digit code
   ↓
POST /api/requester-registration/verify-code
Verifies code matches
   ↓
Updates status to 'pending_coordinator'
Creates notification for coordinator
   ↓
Coordinator sees registration in their dashboard
Coordinator approves
   ↓
User created in users table
role = 'institution_user'
status = 'active'
   ↓
User can log in
```

### 5. API Endpoints

**New:**
- `POST /api/requester-registration/verify-code`
  - Body: `{ registration_id, code }`
  - Returns: Success/error message

**Modified:**
- `POST /api/requester-registration/submit`
  - Now generates `email_verification_code` instead of `email_verification_token`
  - Returns `registration_id` for verification modal

### 6. Frontend Changes

**Components:**
- Multi-step form with navigation (Previous/Next buttons)
- Verification code modal (appears after successful submission)
- Step progress indicator (always shows "Step X of 5")
- Step-based validation (can't proceed without required fields)

**JavaScript Functions:**
- `nextStep()` - Navigate to next step
- `prevStep()` - Navigate to previous step
- `updateProgress()` - Update step counter
- `showVerificationModal(email)` - Show code input modal
- `submitVerificationCode()` - Verify 6-digit code with server

### 7. Email Template

**New Format:**
```
Subject: Email Verification Code - ServiceEase Registration

Hi [FirstName],

Your verification code is:

  ╔════════════╗
  ║  123456   ║
  ╚════════════╝

Please enter this code on the registration page.
Code expires in 24 hours.
```

### 8. Database Tables Explained

**requester_registrations** (Temporary storage)
- Stores pending registrations
- `status` values:
  - `pending_verification` - User hasn't entered code yet
  - `pending_coordinator` - Code verified, waiting for coordinator
  - `approved` - Institution Admin approved (user created in `users` table)
  - `rejected` - Institution Admin rejected

**users** (Final storage)
- Only created AFTER coordinator approval
- `role = 'institution_user'`
- Has all permissions to view/create service requests

### 9. Why Registrations Don't Appear Immediately

**In requester_registrations table:**
 Appears immediately after submit

**In coordinator dashboard:**
 NOT visible until email verification code entered
 Visible after code verification (`status = 'pending_coordinator'`)

**In users table:**
 NOT visible until coordinator approves
 Created only after approval with `role = 'institution_user'`

### 10. Testing Steps

1. **Start Server:**
```powershell
cd server
node index.js
```

2. **Register:**
- Go to registration page
- Fill step 1, click Next
- Fill step 2, click Next  
- Fill step 3, click Next
- Fill step 4, click Next
- Fill step 5, click Submit

3. **Verify:**
- Check email for 6-digit code
- Enter code in modal
- Click Verify

4. **Coordinator Approval:**
- Log in as institution_admin
- Go to User Accounts → Requester Registrations
- See pending registration
- Click Approve

5. **Login as institution_user:**
- Use registered email and password
- Access system as institution_user

### 11. Files Modified

**Client:**
- `client/src/pages/requester-register.html`
  - Added multi-step structure
  - Added verification modal
  - Removed old progress observer
  - Added step navigation functions

**Server:**
- `server/routes/requester-registration.js`
  - Changed to generate 6-digit codes
  - Added `/verify-code` endpoint
  - Updated submit response
  
- `server/utils/emailService.js`
  - Updated email template for code display
  - Changed from link to code

**Database:**
- `server/migrations/add_verification_code.sql`
  - Adds `email_verification_code` column

### 12. Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Can't see steps | CSS not applied | Clear browser cache |
| Code not sent | Mailjet credentials | Check server logs |
| Not in coordinator page | Still `pending_verification` | Enter verification code |
| Not in users table | Not approved yet | Coordinator must approve |
| Invalid code error | Wrong code entered | Check email for correct code |

### 13. Development Tips

- **Check registration status:**
```sql
SELECT id, email, status, email_verification_code 
FROM requester_registrations 
WHERE email = 'test@example.com';
```

- **Manual verify (for testing):**
```sql
UPDATE requester_registrations 
SET status = 'pending_coordinator', email_verified = TRUE 
WHERE id = 1;
```

- **Check if user created:**
```sql
SELECT id, email, role, status 
FROM users 
WHERE email = 'test@example.com';
```

## Summary

 Fixed: Multi-step form now shows one step at a time
 Fixed: Step counter shows correct "Step 1 of 5"
 Changed: Verification uses 6-digit code instead of email link
 Clarified: Registration data flow (requester_registrations → users)
 Improved: User experience with modal and clear instructions


