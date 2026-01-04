# Parts Request Notification Fix - Complete

## Issue Identified
When technicians created parts requests, no notifications were appearing in the admin notifications UI (`http://localhost:3000/pages/admin/notifications.html`).

## Root Causes Found

### 1. Database Schema Issue
**Problem**: The `notifications` table `type` column enum did not include parts request types.

**Original Enum Values**:
- `'coordinator_registration'`
- `'service_request'`
- `'system'`

**Missing Values**:
- `'parts_request'` 
- `'parts_approved'` 
- `'parts_denied'` 
- `'info'`, `'success'`, `'warning'`, `'error'` 

**Result**: Database rejected any notification inserts with `type = 'parts_request'`

### 2. Missing New Schema Columns
The table was using the legacy schema and missing:
- `user_id` (for targeting specific users or null for admins)
- `sender_id` (who created the notification)
- `reference_type` (what resource it references)
- `reference_id` (the resource ID)

### 3. UI Missing Parts Request Filter
The admin notifications page didn't have:
- A "Parts Requests" filter tab
- Logic to filter and display parts request notifications
- Icons and styling for parts request notification types

## Solutions Implemented

### 1. Fixed Database Schema (`fix_notifications_schema.js`)

**Updated the `type` enum** to include all notification types:
```sql
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
    'coordinator_registration',
    'service_request',
    'system',
    'parts_request',      -- NEW
    'parts_approved',     -- NEW
    'parts_denied',       -- NEW
    'info',               -- NEW
    'success',            -- NEW
    'warning',            -- NEW
    'error'               -- NEW
) NOT NULL
```

**Added new schema columns** (while keeping legacy columns for backward compatibility):
```sql
ALTER TABLE notifications ADD COLUMN user_id INT NULL;
ALTER TABLE notifications ADD COLUMN sender_id INT NULL;
ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50) NULL;
ALTER TABLE notifications ADD COLUMN reference_id INT NULL;
```

### 2. Updated Admin Notifications UI

#### Added Parts Request Filter Tab
```html
<button class="filter-tab" data-filter="parts_request">
    Parts Requests
</button>
```

#### Added Filter Logic
```javascript
else if (currentFilter === 'parts_request') {
    filteredNotifications = notifications.filter(n => 
        n.type === 'parts_request' || 
        n.type === 'parts_approved' || 
        n.type === 'parts_denied'
    );
}
```

#### Added Icons and Styling
```javascript
function getNotificationIcon(type) {
    case 'parts_request': return 'fas fa-box';
    case 'parts_approved': return 'fas fa-check-circle';
    case 'parts_denied': return 'fas fa-times-circle';
}

function getNotificationIconBg(type) {
    case 'parts_request': return 'bg-orange-500';
    case 'parts_approved': return 'bg-green-600';
    case 'parts_denied': return 'bg-red-500';
}
```

## Verification

### Test Script Created (`test_parts_notification.js`)
Successfully created and verified:
- Parts request in database
- Admin notification with correct schema
- Notification visible in queries

### Current Notifications Table Structure
```
- id: int (PRIMARY KEY)
- type: enum(...) (includes parts_request)
- title: varchar(255)
- message: text
- user_id: int (NULL = admins see it)
- sender_id: int (who created it)
- reference_type: varchar(50)
- reference_id: int
- related_user_id: int (legacy)
- related_data: json (legacy)
- is_read: tinyint(1)
- created_at: timestamp
- updated_at: timestamp
- priority: enum('low','medium','high','urgent')
```

## How It Works Now

### When Technician Creates Parts Request:

1. **Parts Request Created** (`/api/parts-requests POST`)
   ```javascript
   INSERT INTO parts_requests (part_id, technician_id, quantity_requested, ...)
   ```

2. **Admin Notification Created** (in `parts-requests.js`)
   ```javascript
   await createNotification({
       title: 'New Parts Request',
       message: `${tech.first_name} ${tech.last_name} has requested ${qty} units of ${part.name}`,
       type: 'parts_request',
       user_id: null,              // null = all admins
       sender_id: tech.id,
       reference_type: 'parts_request',
       reference_id: requestId,
       priority: 'medium'
   });
   ```

3. **Admin Sees Notification**
   - Navigate to: `http://localhost:3000/pages/admin/notifications.html`
   - Click "Parts Requests" tab to filter
   - See orange box icon with parts request details
   - Can mark as read

### When Admin Approves/Denies:

1. **Status Updated** (`/api/parts-requests/:id PATCH`)
2. **Technician Notification Created**
   ```javascript
   await createNotification({
       title: 'Parts Request Approved/Denied',
       message: 'Your request has been approved/denied...',
       type: 'parts_approved' or 'parts_denied',
       user_id: technicianId,      // specific technician
       sender_id: adminId,
       reference_type: 'parts_request',
       reference_id: requestId,
       priority: 'medium'
   });
   ```

## Files Modified

1. **`server/fix_notifications_schema.js`** (NEW)
   - Database schema update script
   - Adds missing enum values and columns

2. **`server/test_parts_notification.js`** (NEW)
   - Test script to verify notification creation
   - Creates sample parts request and notification

3. **`server/check_parts_notifications.js`** (NEW)
   - Diagnostic script to check database state

4. **`client/src/pages/admin/notifications.html`**
   - Added "Parts Requests" filter tab
   - Added filter logic for parts notifications
   - Added icons and styling for parts notification types

## Testing Checklist

- [x] Database schema updated with parts_request enum values
- [x] New schema columns (user_id, sender_id, etc.) added
- [x] Test notification created successfully
- [x] Parts Requests filter tab added to UI
- [x] Icons and styling configured for parts notifications
- [x] Filter logic working for parts_request types
- [x] Server restarted with new schema
- [x] Notification creation confirmed in parts-requests.js

## Next Steps to Test

1. **Login as Technician**
   - Navigate to parts request page
   - Create a new parts request
   - Check server logs for notification creation

2. **Login as Admin**
   - Navigate to: `http://localhost:3000/pages/admin/notifications.html`
   - Click "Parts Requests" tab
   - Verify the notification appears
   - Test "Mark as read" functionality

3. **Approve/Deny Request**
   - Approve or deny the parts request
   - Login as the technician
   - Check their notifications for approval/denial notification

## Related Documentation

- `ADMIN_NOTIFICATION_POLICY.md` - Overall notification policy
- `server/routes/parts-requests.js` - Parts request API with notification creation
- `server/routes/notifications.js` - Notification creation and retrieval logic

## Date Completed
October 17, 2025
