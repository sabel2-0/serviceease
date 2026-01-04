# Parts Request Notification - Quick Test Guide

##  Setup Complete!

All necessary database and UI changes have been applied. The system is now ready to show parts request notifications to admins.

## How to Test

### 1. Create a Parts Request as Technician

**Login as Technician:**
- Email: (use a technician account)
- Navigate to the parts request page
- Fill in the form:
  - Select a part
  - Enter quantity needed
  - Provide a reason (minimum 10 characters)
  - Select priority
- Click "Submit Request"

### 2. Check Admin Notifications

**Login as Admin:**
- Navigate to: `http://localhost:3000/pages/admin/notifications.html`
- You should see:
  - New notification count in the stats
  - **"Parts Requests"** tab in the filter navigation
  - Orange box icon () for parts requests

**Click the "Parts Requests" tab to filter and view only parts-related notifications**

### 3. What You'll See

#### Parts Request Notification:
- **Icon**: Orange box ()
- **Title**: "New Parts Request"
- **Message**: "[Technician Name] has requested [X] units of [Part Name]"
- **Actions**: Mark as read button

#### After Approval/Denial:
Technicians will see notifications with:
- **Approved**: Green check icon (✓)
- **Denied**: Red X icon (✗)

## Current System Status

###  Database Schema
- `notifications.type` enum includes: `parts_request`, `parts_approved`, `parts_denied`
- New columns added: `user_id`, `sender_id`, `reference_type`, `reference_id`
- Legacy columns retained for backward compatibility

###  Backend Code
- `server/routes/parts-requests.js` - Creates admin notifications on new parts requests
- `server/routes/notifications.js` - Handles both new and legacy schema

###  Frontend UI
- Admin notifications page has "Parts Requests" filter tab
- Icons and colors configured for parts notifications:
  - `parts_request` → Orange box
  - `parts_approved` → Green check
  - `parts_denied` → Red X

###  Server Running
Server is running at: `http://localhost:3000`
Notification schema detection: All columns detected ✓

## Troubleshooting

### If notifications still don't appear:

1. **Check server logs** when creating a parts request:
   - Should see: "Parts request created" log
   - Should NOT see: "Failed to create notification" error

2. **Verify in database**:
   ```sql
   SELECT * FROM notifications WHERE type = 'parts_request' ORDER BY created_at DESC LIMIT 5;
   ```

3. **Clear browser cache**:
   - Hard refresh: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

4. **Check browser console**:
   - Open DevTools (F12)
   - Look for any JavaScript errors
   - Check Network tab for API call responses

### Test the notification creation manually:

Run this in the server directory:
```bash
node test_parts_notification.js
```

This will:
- Create a test parts request
- Create a test notification
- Verify it appears in the database

## Admin Notification Policy

Remember: **Admin notifications are ONLY created for:**
1.  Coordinator registrations
2.  Technician parts requests

**NOT for:**
-  Service requests (only notify assigned technicians)

## Need More Help?

Check the complete documentation:
- `PARTS_NOTIFICATION_FIX.md` - Detailed fix explanation
- `ADMIN_NOTIFICATION_POLICY.md` - Overall notification policy

---

**Status**:  Ready to test!  
**Server**: Running at http://localhost:3000  
**Date**: October 17, 2025
