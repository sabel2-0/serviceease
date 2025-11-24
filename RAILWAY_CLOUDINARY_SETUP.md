# Railway Cloudinary Configuration Verification

## ✅ Environment Variables Status

### Confirmed Set on Railway (from screenshot):
1. **CLOUDINARY_CLOUD_NAME**: `duodt5wlv` ✅
2. **CLOUDINARY_API_KEY**: `386416582887682` ✅
3. **CLOUDINARY_API_SECRET**: `kBYTDrBGN9CEYGlK4tYKB61Z6dg` ✅

### Required Additional Variables on Railway:
4. **MAILJET_API_KEY**: `7e393e28beb083287865803c6a575514`
5. **MAILJET_SECRET_KEY**: `a3a445845ef52fd8916067cb963ce55f`
6. **EMAIL_USER**: `serviceeaseph@gmail.com`
7. **RECAPTCHA_SECRET_KEY**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

## 🔍 Railway Database Analysis

### Current State:
- **Database**: `railway` (MySQL on Railway)
- **Host**: `trolley.proxy.rlwy.net:17038`
- **User**: `root`
- **Password**: `cBradZvPfObqGtuJMzBBWVSYpDKYYQsZ`

### Tables Status:
- ✅ All 24 tables exist
- ✅ Foreign key constraints properly configured
- ⚠️ `temp_user_photos` table is EMPTY (no pending registrations)
- ⚠️ User ID 5 has status='active' but approval_status='pending' (inconsistent)

### Users in Database:
| ID | Name | Email | Role | Status | Approval Status |
|----|------|-------|------|--------|-----------------|
| 2 | Admin User | serviceeaseph@gmail.com | admin | active | null |
| 3 | Test User | markivan.storm@gmail.com | technician | active | approved |
| 5 | Bongbong Marcos | markivan.note@gmail.com | coordinator | active | **pending** ⚠️ |

## ⚠️ Issues Found

### 1. User ID 5 - Inconsistent State
- Has `approval_status='pending'` but `status='active'`
- **NO photos** in `temp_user_photos` table
- Institution already created (INST-001 - Cebu Technological University)
- **This user will NOT show up in coordinator approvals because they have no photos**

### 2. Empty temp_user_photos Table
- No records exist
- Any new coordinator registration should create entries here
- Photos should be Cloudinary URLs (not local file paths)

## 🔧 Recommended Actions

### Immediate Steps:
1. **Delete User ID 5** to clean up inconsistent state:
   ```sql
   DELETE FROM institutions WHERE user_id = 5;
   DELETE FROM users WHERE id = 5;
   ```

2. **Verify Railway Deployment**:
   - Check Railway dashboard → Your service → Deployments
   - Ensure latest code is deployed with Cloudinary integration
   - Verify all environment variables are set

3. **Test Fresh Registration**:
   - Register as new coordinator on Railway deployment
   - Verify photos upload to Cloudinary
   - Check `temp_user_photos` has Cloudinary URLs
   - View in coordinator approvals page

### Verification Checklist:
- [x] Cloudinary variables set on Railway
- [ ] Mailjet variables set on Railway
- [ ] reCAPTCHA secret key set on Railway
- [ ] Latest code deployed to Railway
- [ ] User ID 5 deleted from Railway database
- [ ] Fresh registration test successful
- [ ] Photos visible in coordinator approvals
- [ ] Approve/reject deletes photos from Cloudinary

## 📝 Code Verification

### Cloudinary Configuration (server/index.js):
```javascript
// Lines 10, 20-24
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
```

### Registration Upload (server/index.js ~line 680):
```javascript
// Upload to Cloudinary
const frontIdUpload = await cloudinary.uploader.upload(req.files.frontId[0].path, {
    folder: 'serviceease',
    resource_type: 'image'
});
// Store secure_url in database
// Delete local temp file
```

### Photo Deletion (server/models/User.js):
```javascript
// Extract public_id from Cloudinary URL
// Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.jpg
const publicId = photoUrl.match(/serviceease\/[^\.]+/)[0];
await cloudinary.uploader.destroy(publicId);
```

## 🚀 Next Steps

1. **Go to Railway Dashboard**
2. **Add Missing Environment Variables** (if not already set):
   - MAILJET_API_KEY
   - MAILJET_SECRET_KEY
   - EMAIL_USER
   - RECAPTCHA_SECRET_KEY

3. **Verify Latest Deployment**:
   - Check commit hash matches latest GitHub push
   - Look for Cloudinary integration code

4. **Clean Up User ID 5**:
   - Use Railway's database interface or SQL query
   - Delete institution and user records

5. **Test Registration**:
   - Go to registration page on Railway URL
   - Register as coordinator with photos
   - Verify in database that photos are Cloudinary URLs
   - Check coordinator approvals page shows photos

## 📊 Expected Results After Fix

### Successful Registration Should Show:
- `users` table: New row with `approval_status='pending'`, `status='active'`
- `temp_user_photos` table: New row with Cloudinary URLs in photo columns
- `institutions` table: New row with institution details
- Coordinator approvals page: Shows pending registration with visible ID photos

### Cloudinary URLs Should Look Like:
```
https://res.cloudinary.com/duodt5wlv/image/upload/v1732485123/serviceease/abc123xyz.jpg
```

NOT local file paths like:
```
frontId-1763909336332-230011433.jpg
```

## 📞 Support

If registration still fails after these steps, check:
1. Railway deployment logs for errors
2. Browser console for frontend errors
3. Network tab for API response details
4. Cloudinary dashboard for upload attempts
