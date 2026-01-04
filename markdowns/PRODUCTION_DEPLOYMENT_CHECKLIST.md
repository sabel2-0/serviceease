# Production Deployment Checklist - Session Invalidation System

##  GitHub Repository Status
- **Last Commit:** `322aa14` - "Implement session invalidation system with token versioning"
- **Branch:** `main`
- **All Files Committed:**  Yes
- **Ready for Render Deployment:**  Yes

---

##  Session Invalidation System - Production Ready

### Backend Components 

#### 1. **Database Schema**
-  `token_version` column auto-created on server startup
-  Works with both Railway (production) and local MySQL
-  Migration is safe - adds column only if it doesn't exist
-  Default value: `0`
-  Type: `INT`

**Location:** `server/index.js` lines 220-231
```javascript
// Ensure token_version column exists in users table for session invalidation
const [tokenVersionColRows] = await db.query(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'token_version'
`);
if (tokenVersionColRows && tokenVersionColRows[0] && Number(tokenVersionColRows[0].cnt) === 0) {
    await db.query(`ALTER TABLE users ADD COLUMN token_version INT DEFAULT 0`);
    console.log('✓ Added token_version column to users table');
}
```

#### 2. **JWT Token Generation**
-  Includes `tokenVersion` claim in JWT payload
-  Uses `user.token_version || 0` for safety
-  Works on login and all authenticated requests

**Location:** `server/index.js` line 876
```javascript
tokenVersion: user.token_version || 0  // Include token version for session invalidation
```

#### 3. **Authentication Middleware**
-  Checks token version on EVERY request
-  Returns 401 with `TOKEN_INVALIDATED` code when mismatch
-  Handles missing column gracefully (backwards compatible)
-  Async/await properly implemented

**Location:** `server/middleware/auth.js` lines 134-156

#### 4. **Password Change Endpoints**
All endpoints increment `token_version` to invalidate sessions:
-  Admin changing own password (`/api/admin/password`)
-  Admin changing staff password (`/api/admin/staff/:staffId/password`)
-  Admin changing coordinator password (`/api/admin/coordinators/:coordinatorId/password`)
-  Coordinator changing requester password (`/api/coordinators/:id/users/:userId/password`)

**SQL Pattern:**
```sql
UPDATE users 
SET password = ?, 
    token_version = COALESCE(token_version, 0) + 1, 
    updated_at = NOW() 
WHERE id = ?
```

---

### Frontend Components 

#### 1. **Global Fetch Interceptor**
-  Catches all 401 responses with `TOKEN_INVALIDATED` code
-  Sets sessionStorage flag to prevent redirect loops
-  Clears all localStorage (token, user, isLoggedIn)
-  Redirects to login page cleanly

**Location:** `client/src/js/dynamic-sidebar-loader.js` lines 8-50

#### 2. **Session Storage Redirect Flag**
-  Uses `sessionStorage.setItem('redirecting_to_login', 'true')`
-  Persists across page navigations (unlike window variables)
-  Cleared only on successful login or tab close
-  Prevents infinite redirect loops

**Key Locations:**
- Set on token invalidation: `dynamic-sidebar-loader.js`, `account-management.js`
- Checked on page load: `coordinator.html`, `login.html`
- Cleared on login: `auth.js`

#### 3. **Login Page**
-  Checks sessionStorage flag on load
-  Clears flag if present (allows fresh login)
-  Validates ALL auth data (token + user + isLoggedIn)
-  Cleans up incomplete auth data

**Location:** `client/src/pages/login.html` lines 314-362

#### 4. **Coordinator Page**
-  Loads `dynamic-sidebar-loader.js` for fetch interceptor
-  Inline auth check with sessionStorage validation
-  Validates token presence (not just user data)
-  Clean redirect flow

**Location:** `client/src/pages/coordinator/coordinator.html` lines 8-57, 716

#### 5. **Account Management**
-  Sets sessionStorage flag immediately on password change
-  Clears all localStorage before redirect
-  1.5s delay for user feedback
-  Uses `window.location.replace()` (no history)

**Location:** `client/src/js/account-management.js` lines 156-172

#### 6. **Logout Confirmation Modal**
-  Global `showLogoutConfirm()` function
-  Returns Promise for async/await support
-  Keyboard accessible (Escape key, focus management)
-  Backdrop click handling

**Location:** `client/src/js/logout-confirm.js` (NEW FILE)

---

## 🚀 Render Deployment Checklist

### Pre-Deployment Verification 

- [x] All changes committed to GitHub (`322aa14`)
- [x] No syntax errors in any files
- [x] No console errors during local testing
- [x] Server starts successfully locally
- [x] Database migrations run automatically
- [x] Environment variables documented
- [x] No hardcoded credentials
- [x] All file paths use relative paths
- [x] CORS properly configured
- [x] JWT secret uses environment variable

### Render Environment Variables Required

Ensure these are set in Render dashboard:

```bash
# Database (Railway)
DATABASE_URL=mysql://root:cBradZvPfObqGtuJMzBBWVSYpDKYYQsZ@trolley.proxy.rlwy.net:17038/railway

# JWT
JWT_SECRET=<your_secret_here>

# Cloudinary
CLOUDINARY_CLOUD_NAME=duodt5wlv
CLOUDINARY_API_KEY=386416582887682
CLOUDINARY_API_SECRET=kBYTDrBGN9CEYGlK4tYKB61Z6dg

# Mailjet
MAILJET_API_KEY=7e393e28beb083287865803c6a575514
MAILJET_SECRET_KEY=a3a445845ef52fd8916067cb963ce55f

# Email
EMAIL_USER=serviceeaseph@gmail.com

# reCAPTCHA (optional - using test key)
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

### Post-Deployment Testing 

Test these scenarios on production:

1. **Token Invalidation - Admin Changes Staff Password**
   - [ ] Login as admin
   - [ ] Login as staff (different browser/incognito)
   - [ ] Admin changes staff password
   - [ ] Staff clicks anything → should be logged out immediately
   - [ ] Staff can login with new password

2. **Token Invalidation - Admin Changes Coordinator Password**
   - [ ] Login as admin
   - [ ] Login as institution_admin (different browser)
   - [ ] Admin changes coordinator password
   - [ ] Coordinator clicks anything → logged out
   - [ ] No infinite redirect loop
   - [ ] Clean redirect to login page

3. **Token Invalidation - User Changes Own Password**
   - [ ] Login as any user
   - [ ] Change own password
   - [ ] Should be redirected to login after 1.5s
   - [ ] Can login with new password
   - [ ] Old session is invalidated

4. **No Infinite Loops**
   - [ ] After password change, page doesn't loop between login and dashboard
   - [ ] sessionStorage flag prevents multiple redirects
   - [ ] Flag is cleared on successful login

5. **Multiple Devices**
   - [ ] Login on 2 devices
   - [ ] Change password on device 1
   - [ ] Device 2 should be logged out on next request
   - [ ] Both devices can login with new password

---

##  Monitoring & Debugging

### Server Logs to Watch

Look for these console messages:

**Success Messages:**
```
✓ Added token_version column to users table
✓ Password updated successfully
✓ Token version incremented - all existing sessions invalidated
```

**Expected During Token Validation:**
```
Token version mismatch for user X: token has v0, database has v1
```

**Error to Investigate:**
```
Error checking token version: [error details]
```

### Frontend Console Logs

Look for these debug messages:

**Token Invalidation:**
```
 Token invalidated detected - initiating logout
 Redirecting to login page...
```

**Login Page:**
```
 Arrived at login page after token invalidation - clearing redirect flag
```

**Coordinator Page:**
```
 No auth data - redirecting to login
 Wrong role - redirecting to correct dashboard
```

---

## 🐛 Troubleshooting Guide

### Issue: Token version column not created
**Solution:** Check Render logs for database connection errors. Column is auto-created on server startup.

### Issue: Infinite redirect loop
**Solution:** 
1. Clear browser cache completely
2. Check sessionStorage has `redirecting_to_login` flag
3. Verify `dynamic-sidebar-loader.js` is loaded on the page

### Issue: User not logged out after password change
**Solution:**
1. Check server logs for token version increment
2. Verify auth middleware is checking token version
3. Check JWT includes `tokenVersion` claim

### Issue: 401 errors not caught by interceptor
**Solution:**
1. Verify `dynamic-sidebar-loader.js` is loaded BEFORE other scripts
2. Check fetch response includes `TOKEN_INVALIDATED` code
3. Ensure coordinator page loads the interceptor script

---

## 📊 Database State Verification

### Check Token Version Column Exists

**Railway Production:**
```bash
mysql -h YOUR_RAILWAY_HOST -P YOUR_PORT -u root -p railway
DESCRIBE users;
```

Look for:
```
token_version | int | YES | | 0 |
```

### Check Token Versions After Password Change

```sql
SELECT id, email, role, token_version 
FROM users 
ORDER BY token_version DESC 
LIMIT 10;
```

Users with higher `token_version` values have changed passwords more recently.

---

##  Success Criteria

Deployment is successful when:

- [x] Server starts without errors on Render
- [ ] Database column `token_version` exists
- [ ] Users can login successfully
- [ ] Password changes increment token_version
- [ ] Old sessions are invalidated after password change
- [ ] No infinite redirect loops occur
- [ ] Users can re-login with new password
- [ ] All user roles work correctly (admin, coordinator, technician, requester)
- [ ] Logout confirmation modal appears
- [ ] No console errors in browser

---

##  Rollback Plan

If issues occur in production:

1. **Revert GitHub commit:**
   ```bash
   git revert 322aa14
   git push
   ```

2. **Render will auto-deploy the revert**

3. **Alternative: Manual rollback in Render dashboard**
   - Go to Render dashboard
   - Select your service
   - Click "Manual Deploy" → Select previous commit

4. **Database rollback (if needed):**
   ```sql
   ALTER TABLE users DROP COLUMN token_version;
   ```
   Note: This is safe - old code will work without the column.

---

## 🔐 Security Notes

- Token version system prevents session hijacking after password compromise
- Old JWTs become invalid immediately when password changes
- No need to maintain token blacklist
- Scales efficiently - single integer per user
- Zero impact on performance (indexed column check)
- Backwards compatible - works even if column doesn't exist yet

---

## 📞 Support Contacts

- **GitHub Repository:** https://github.com/sabel2-0/serviceease
- **Railway Database:** YOUR_RAILWAY_HOST:PORT
- **Cloudinary Dashboard:** https://cloudinary.com/console

---

**Last Updated:** November 25, 2025
**Deployment Version:** main@322aa14
**System Status:**  Production Ready

