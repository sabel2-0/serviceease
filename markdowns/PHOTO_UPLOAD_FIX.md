# Photo Upload and Deletion System - Fixed

## Issues Fixed

### 1. **Photo Path Inconsistency**
- **Problem**: Code was using `temp-photos` (with hyphen) in some places and `temp_photos` (with underscore) in others
- **Fix**: Updated all file deletion code to use `temp_photos` (with underscore) to match the actual directory name
- **Files Updated**: 
  - `server/models/User.js` - Updated `approveUser()` and `rejectUser()` functions

### 2. **Photo Deletion on Approval**
- **Problem**: Photos weren't being deleted from filesystem when user was approved
- **Fix**: Added file deletion logic to `approveUser()` function
- **Now**: When admin approves a user, both database records AND physical files are deleted

### 3. **Photo Deletion on Rejection**
- **Problem**: Already implemented but had wrong path
- **Fix**: Corrected the path from `temp-photos` to `temp_photos`
- **Now**: When admin rejects a user, database records, user account, AND physical files are all deleted

### 4. **Enhanced Logging**
- **Added**: Debug logging in registration endpoint to track photo uploads
- **Logs show**: Which files were received, their filenames, and whether they were saved

## How It Works Now

### Registration Flow:
1. User fills registration form with photos (frontId, backId, selfie)
2. Files are uploaded to `server/temp_photos/` directory
3. File names are saved to `temp_user_photos` table linked to user
4. User status is set to 'pending'

### Approval Flow:
1. Admin clicks "Approve" button
2. System retrieves photo filenames from database
3. Physical files are deleted from `server/temp_photos/` directory
4. Database records are deleted from `temp_user_photos` table
5. User `approval_status` is updated to 'approved'
6. User can now log in and use the system

### Rejection Flow:
1. Admin clicks "Reject" button
2. System retrieves photo filenames from database
3. Physical files are deleted from `server/temp_photos/` directory
4. Database records are deleted from `temp_user_photos` table
5. User account is completely deleted from `users` table
6. User must register again if they want to retry

## Current Database State

### Existing User (ID 60):
- **Status**: Pending approval
- **Email**: markivan.night@gmail.com
- **Name**: Bene Detta
- **Photos in DB**: All NULL (files weren't uploaded during that registration)
- **Action Needed**: Register a NEW user with photos to test the full flow

## Testing Instructions

### Test Photo Upload:
1. Go to registration page
2. Fill in all required fields
3. **IMPORTANT**: Upload all 3 photos (Front ID, Back ID, Selfie)
4. Submit registration
5. Check server logs for "Files received" message
6. Check database: `SELECT * FROM temp_user_photos WHERE user_id = <new_user_id>`
7. Check filesystem: Files should be in `server/temp_photos/` directory

### Test Approval with Photo Deletion:
1. Log in as admin
2. Go to User Registration Approvals page
3. View the photos (should be visible if uploaded correctly)
4. Click "Approve"
5. Check server logs for "Deleted photo file" messages
6. Check database: Record should be gone from `temp_user_photos`
7. Check filesystem: Photo files should be deleted
8. User should be able to log in

### Test Rejection with Photo Deletion:
1. Register another test user with photos
2. Log in as admin
3. Go to User Registration Approvals page
4. Click "Reject"
5. Check server logs for "Deleted photo file" messages
6. Check database: User should be gone from `users` table
7. Check database: Record should be gone from `temp_user_photos`
8. Check filesystem: Photo files should be deleted

## File Paths Reference

```
server/
├── temp_photos/              ← Physical photo files stored here
│   ├── frontId-[timestamp]-[random].jpg
│   ├── backId-[timestamp]-[random].jpg
│   └── selfie-[timestamp]-[random].jpg
├── models/
│   └── User.js              ← Contains approveUser() and rejectUser()
└── index.js                 ← Registration endpoint with photo upload
```

## Database Tables

### temp_user_photos
```sql
CREATE TABLE temp_user_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    front_id_photo VARCHAR(255),
    back_id_photo VARCHAR(255),
    selfie_photo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY)
);
```

## API Endpoints

### POST /api/register
- Accepts multipart/form-data with files
- Fields: `frontId`, `backId`, `selfie`
- Saves files to `temp_photos/` directory
- Saves filenames to database

### POST /api/approve-user/:userId
- Deletes photos from filesystem
- Deletes temp_user_photos record
- Updates user status to 'approved'

### POST /api/reject-user/:userId
- Deletes photos from filesystem
- Deletes temp_user_photos record
- Deletes user account

## Cleanup Old Photos

There are currently 51 orphaned photo files in `server/temp_photos/` from previous registrations. These can be safely deleted since there are no active users with those photos linked.

To clean them up:
```bash
# From project root
cd server/temp_photos
# Back up if needed
# Then delete all
rm *
```

Or keep them if you want to manually test photo viewing in the UI.

## Server Status
✅ Server running on port 3000
✅ Photo upload system configured
✅ Photo deletion system implemented
✅ Logging enabled for debugging

## Next Steps
1. Test new registration with photos
2. Verify photos appear in approval UI
3. Test approval process (photos should be deleted)
4. Test rejection process (photos should be deleted)
5. Clean up old orphaned photos if desired
