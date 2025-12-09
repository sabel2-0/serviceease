# Requester Registration Flow

## Complete Registration Workflow

### Database Tables Involved
1. **`requester_registrations`** - Temporary storage for pending registrations
2. **`users`** - Final user accounts (created only after approval)
3. **`institutions`** - Links coordinators to their institutions
4. **`notifications`** - Alerts coordinators of new registrations

### Registration States

```
User Submits Form
    ↓
requester_registrations table
status = 'pending_verification'
    ↓
User Clicks Email Verification Link
    ↓
status = 'pending_coordinator'
(Now appears in Coordinator's "Requester Registrations" page)
    ↓
Coordinator Approves
    ↓
Record created in users table
role = 'institution_user'
status = 'active'
    ↓
User Can Log In
```

### Why Registration Doesn't Appear Immediately

**Q: Why don't I see the registration in The institution_admin page?**
- Registration must be **email verified first**
- Status must be `'pending_coordinator'` to appear in The institution_admin UI
- Institution Admin endpoint filters: `WHERE status = 'pending_coordinator'`

**Q: Why isn't the user in the `users` table?**
- Users are only created **after coordinator approval**
- Before approval, the data lives in `requester_registrations` table
- This prevents unverified/unapproved users from accessing the system

**Q: What if the verification email doesn't arrive?**
- Check spam/junk folders
- Check server logs for email sending errors
- Use the dev endpoint to get the token: `GET /api/requester-registration/dev/find-by-email?email=user@example.com`
- Manually verify: `GET /api/requester-registration/verify-email/<TOKEN>`

### Step-by-Step Process

#### 1. User Registration (Frontend)
- Form: `client/src/pages/requester-register.html`
- Validates printers against institution inventory
- Uploads ID photos to Cloudinary
- Submits to: `POST /api/requester-registration/submit`

#### 2. Server Processing
- Route: `server/routes/requester-registration.js`
- Creates record in `requester_registrations` table
- Status: `'pending_verification'`
- Sends verification email via Mailjet
- Returns: `{ message, registration_id, email_verification_token }` (token only in dev)

#### 3. Email Verification
- User clicks link in email
- Endpoint: `GET /api/requester-registration/verify-email/:token`
- Updates status to `'pending_coordinator'`
- Creates notification for coordinator
- Response: Success message

#### 4. Coordinator Review
- Page: `client/src/pages/coordinator/requester-registrations.html`
- Endpoint: `GET /api/requester-registration/pending`
- Shows registrations with status `'pending_coordinator'`
- Displays: photos, printer info, personal details

#### 5. Coordinator Approval
- Endpoint: `POST /api/requester-registration/:id/approve`
- Creates user in `users` table
- Creates printer assignments in `user_printer_assignments`
- Updates registration status to `'approved'`
- Sends approval email to requester

#### 6. User Login
- User can now log in at `login.html`
- Email and password from registration
- Role: `institution_user`

### Testing the Flow (Development)

#### Quick Test Commands

1. **Check registration status:**
```powershell
curl.exe "http://localhost:3000/api/requester-registration/dev/find-by-email?email=test@example.com"
```

2. **Manually verify email (skip email step):**
```powershell
curl.exe "http://localhost:3000/api/requester-registration/verify-email/<TOKEN>"
```

3. **Check if coordinator sees it:**
- Log in as institution_admin
- Navigate to User Accounts → Requester Registrations
- Should see the registration if status is `'pending_coordinator'`

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Step 1 of 6" but all fields visible | Step counter counting all divs | Fixed: now counts only major sections (h3 headers) |
| Registration not in `users` table | User not approved yet | Normal - only created after coordinator approval |
| Not in coordinator page | Email not verified | Click verification link or manually verify with token |
| "Registration already pending" | Already submitted, not verified | Check email or use dev endpoint to get token |
| No verification email received | Email service error | Check server logs, verify Mailjet credentials |

### Dev-Only Endpoints

These endpoints are only available when `NODE_ENV !== 'production'`:

1. **Find registration by email:**
   - `GET /api/requester-registration/dev/find-by-email?email=user@example.com`
   - Returns: full registration record including token

2. **Submit response includes token:**
   - `POST /api/requester-registration/submit`
   - Response includes `email_verification_token` field in dev mode

### Database Schema Reference

**requester_registrations table:**
- `id` - Primary key
- `first_name`, `last_name`, `email`
- `password_hash` - Hashed password
- `institution_id` - Foreign key to institutions
- `printer_serial_numbers` - JSON array
- `matched_printer_ids` - JSON array of validated printer IDs
- `id_front_url`, `id_back_url`, `selfie_url` - Cloudinary URLs
- `email_verification_token` - Token for email verification
- `email_verified` - Boolean
- `status` - `'pending_verification'` | `'pending_coordinator'` | `'approved'` | `'rejected'`
- `coordinator_reviewed_by` - User ID of coordinator who approved/rejected
- `created_at`, `updated_at`

**Flow to users table:**
- On approval, creates:
  - New row in `users` (role='institution_user')
  - Rows in `user_printer_assignments` for each matched printer
  - Notification for requester (approval email)

### Mobile UI Fix

**Issue:** Progress showed "Step 1 of 6" but displayed all content at once

**Fix:** Changed step counter to only count major sections with `<h3>` headers:
- Personal Information
- Institution Information  
- Printer Information
- ID Verification
- Account Security

**Result:** Now shows "Step 1 of 5" and properly tracks scroll position

### Console Logging (Dev Mode)

When `NODE_ENV !== 'production'`, the registration form logs:
- ✅ Registration submitted with response data
- 🔗 Direct verification URL you can click to bypass email

Check browser console after submitting for the verification link.


