# Admin Notification Policy

## Overview
This document outlines which events trigger admin notifications in the ServiceEase system.

## Admin Notifications Are Created For:

### 1. ✅ Coordinator Registrations
- **Location**: `server/models/User.js` (lines 95-128)
- **Trigger**: When a new coordinator registers
- **Notification Type**: `coordinator_registration`
- **Details**: 
  - Title: "New Coordinator Registration"
  - Message includes coordinator name and institution
  - Sent to all admins (user_id = null or related_user_id = userId)
  - Includes institution details in related_data JSON

### 2. ✅ Technician Parts Requests
- **Location**: `server/routes/parts-requests.js` (lines 218-228)
- **Trigger**: When a technician creates a new parts request
- **Notification Type**: `parts_request`
- **Details**:
  - Title: "New Parts Request"
  - Message includes technician name, quantity, and part name
  - Sent to all admins (user_id = null)
  - Includes reference to parts_request table
  - Priority inherited from request (urgent/high/medium)

## Admin Notifications Are NOT Created For:

### ❌ Service Requests
- **Location**: `server/routes/service-requests.js` (lines 220-245, 265-285)
- **Policy**: Service requests do NOT trigger admin notifications
- **Behavior**:
  - If technicians are assigned: Notifications sent to those technicians only
  - If no technicians assigned: No notification created at all
  - Admins do not receive notifications about service requests
- **Rationale**: Service requests are handled by technicians; admins don't need to be notified

## Notification Flow Summary

```
User Registration (institution_admin)
    ↓
Admin Notification Created
    ↓
Admin reviews and approves/rejects

Technician Creates Parts Request
    ↓
Admin Notification Created
    ↓
Admin approves/denies request
    ↓
Technician receives status notification

Requester/Coordinator Creates Service Request
    ↓
NO Admin Notification
    ↓
Assigned Technician receives notification
    ↓
Technician handles the request
```

## Technical Implementation Notes

### Notification Schema
The system supports two notification table schemas:
- **New schema**: Uses `user_id`, `sender_id`, `reference_type`, `reference_id`, `priority`
- **Legacy schema**: Uses `related_user_id` and `related_data` JSON

### Admin Notification Pattern
To create an admin notification (visible to all admins):
```javascript
await createNotification({
    title: 'Notification Title',
    message: 'Notification message',
    type: 'notification_type',
    user_id: null,  // null = all admins can see
    sender_id: requestingUserId,
    reference_type: 'resource_type',
    reference_id: resourceId,
    priority: 'medium'
});
```

### User-Specific Notification Pattern
To create a notification for a specific user:
```javascript
await createNotification({
    title: 'Notification Title',
    message: 'Notification message',
    type: 'notification_type',
    user_id: specificUserId,  // specific user only
    sender_id: senderId,
    reference_type: 'resource_type',
    reference_id: resourceId,
    priority: 'medium'
});
```

## Changes Made (October 17, 2025)

### Service Requests Notification Update
- **File**: `server/routes/service-requests.js`
- **Changes**: 
  - Removed admin notification creation when no technicians are assigned
  - Added comments clarifying that admin notifications are only for coordinator registrations and parts requests
  - Service requests now only notify assigned technicians
  - Added console logging for better debugging

### Before:
```javascript
// If no assigned technicians: create admin notification
if (assignedTechnicianIds.length === 0) {
    await createNotification({
        type: 'service_request',
        user_id: null,  // admins
        // ...
    });
}
```

### After:
```javascript
// If no assigned technicians: Do NOT create admin notification
if (assignedTechnicianIds.length > 0) {
    // Only notify assigned technicians
} else {
    console.log('No assigned technicians - no notification created');
}
```

## Verification Checklist

- [x] Coordinator registrations create admin notifications
- [x] Technician parts requests create admin notifications  
- [x] Service requests do NOT create admin notifications
- [x] Service requests notify assigned technicians only
- [x] Code comments added for clarity
- [x] Console logging added for debugging

## Related Files

- `server/models/User.js` - Institution Admin registration notifications
- `server/routes/parts-requests.js` - Parts request notifications
- `server/routes/service-requests.js` - Service request notifications (technicians only)
- `server/routes/notifications.js` - Notification creation and retrieval logic

