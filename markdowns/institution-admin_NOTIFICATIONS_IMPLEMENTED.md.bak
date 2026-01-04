# Coordinator Notifications Implementation

## Summary
Implemented a comprehensive notification system for institution_admins to receive real-time updates about printer assignments and service request progress.

## Implementation Date
October 22, 2025

## Features Implemented

### 1. Coordinator Notifications UI (`/pages/coordinator/notifications.html`)

#### Page Components
- **Header Section**: Title, description, and action buttons
- **Filter System**: Filter notifications by type (All, Unread, Printer Assignments, Service Requests, Completed)
- **Statistics Dashboard**: Real-time counts for:
  - Unread notifications
  - Printer assignment notifications
  - Service request notifications
  - Completed service notifications
- **Notifications List**: Displays all notifications with:
  - Notification icon based on type
  - Title and message
  - Timestamp (relative time display)
  - Sender information
  - Priority badges
  - Status badges
  - Action buttons (Mark as read, Delete)

#### Features
- **Auto-refresh**: Automatically fetches new notifications every 30 seconds
- **Mark as Read**: Individual notification marking or mark all as read
- **Delete**: Remove notifications from the list
- **Responsive Design**: Fully mobile-responsive with Tailwind CSS
- **Real-time Updates**: Live notification counts and visual indicators
- **Interactive Filtering**: Quick filter buttons to view specific notification types

### 2. Backend Notification Triggers

#### Printer Assignment Notifications
**Location**: `server/index.js` - POST `/api/institutions/:institutionId/printers`

When a printer is assigned to an institution:
```javascript
await createNotification({
    title: 'New Printer Assigned to Your Institution',
    message: `A printer has been assigned to ${institutionName}: ${printerDetails}. ${location}`,
    type: 'printer_assigned',
    user_id: coordinatorUserId,
    sender_id: null,
    reference_type: 'inventory_item',
    reference_id: inventory_item_id,
    priority: 'medium'
});
```

**Notification Contains**:
- Institution name
- Printer name/brand/model
- Serial number
- Location note (if provided)

#### Service Request Progress Notifications

##### When Technician Starts Work
**Location**: `server/routes/technician-service-requests.js` - PUT `/service-requests/:requestId/status`

When status changes to 'in_progress':
```javascript
// Notification to Coordinator
await createNotification({
    title: 'Service Request In Progress',
    message: `Technician ${techName} has started working on service request ${requestNumber} at ${institutionName}.`,
    type: 'service_request',
    user_id: coordinatorUserId,
    sender_id: technicianId,
    reference_type: 'service_request',
    reference_id: requestId,
    priority: 'medium'
});

// Notification to Requester
await createNotification({
    title: 'Service Request In Progress',
    message: `Technician ${techName} has started working on your service request ${requestNumber}.`,
    type: 'service_request',
    user_id: requesterUserId,
    sender_id: technicianId,
    reference_type: 'service_request',
    reference_id: requestId,
    priority: 'medium'
});
```

##### When Service is Completed (Pending Approval)
**Location**: `server/routes/technician-service-requests.js` - POST `/service-requests/:requestId/complete`

When technician completes work:
```javascript
// Notification to Coordinator (High Priority - Requires Action)
await createNotification({
    title: 'Service Request Pending Your Approval',
    message: `Technician ${techName} has completed service request ${requestNumber} at ${institutionName}. Please review and approve.`,
    type: 'service_request',
    user_id: coordinatorUserId,
    sender_id: technicianId,
    reference_type: 'service_request',
    reference_id: requestId,
    priority: 'high'
});

// Notification to Requester
await createNotification({
    title: 'Service Completed - Awaiting Approval',
    message: `Technician ${techName} has completed your service request ${requestNumber}. Awaiting coordinator approval.`,
    type: 'success',
    user_id: requesterUserId,
    sender_id: technicianId,
    reference_type: 'service_request',
    reference_id: requestId,
    priority: 'medium'
});
```

### 3. Sidebar Navigation Update

**File**: `client/src/components/coordinator-sidenav.html`

Updated the notifications link to point to the new notifications page:
```html
<a href="/pages/coordinator/notifications.html" class="sidenav-item ...">
    <i class="fas fa-bell ..."></i>
    <span>Notifications</span>
    <span class="notification-badge ..." id="notifications-badge">0</span>
</a>
```

## Database Structure

### Notifications Table Schema
The system uses the existing `notifications` table with the following structure:

```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('coordinator_registration','service_request','system','parts_request','parts_approved','parts_denied','info','success','warning','error','printer_assigned') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_id INT NULL,                    -- Recipient of notification
    sender_id INT NULL,                  -- Who triggered the notification
    reference_type VARCHAR(50) NULL,     -- Type of related entity (e.g., 'service_request', 'inventory_item')
    reference_id INT NULL,               -- ID of related entity
    related_user_id INT NULL,            -- Legacy compatibility
    related_data JSON NULL,              -- Legacy compatibility
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Notification Types Sent to Coordinators

| Notification Type | Trigger | Priority | Contains |
|------------------|---------|----------|----------|
| **Printer Assigned** | Admin assigns printer to institution | Medium | Institution name, Printer details, Location |
| **Service In Progress** | Technician starts work | Medium | Technician name, Request number, Institution |
| **Service Pending Approval** | Technician completes work | High | Technician name, Request number, Action required |

## API Endpoints Used

### GET `/api/notifications`
- Fetches all notifications for the authenticated user
- Supports filtering by `is_read`, `type`, `limit`, `offset`
- Returns notifications with sender information

### GET `/api/notifications/count/unread`
- Returns count of unread notifications for badge display

### PATCH `/api/notifications/:id/read`
- Marks a specific notification as read

### PATCH `/api/notifications/read-all`
- Marks all user's notifications as read

### DELETE `/api/notifications/:id`
- Deletes a specific notification

## User Experience Flow

### for institution_admins:

1. **Printer Assignment**:
   - Admin assigns printer to institution
   - Institution Admin receives notification: "New Printer Assigned to Your Institution"
   - Notification shows printer details and location
   - Badge counter increments

2. **Service Request Progress**:
   - Technician starts work → Coordinator notified "Service Request In Progress"
   - Technician completes work → Coordinator notified "Service Request Pending Your Approval" (HIGH PRIORITY)
   - Institution Admin can review and approve from service requests page

3. **Notification Management**:
   - View all notifications in organized list
   - Filter by type (printers, services, completed, unread)
   - See real-time statistics
   - Mark notifications as read individually or all at once
   - Delete unwanted notifications

## Visual Design

### Notification Icons
- **Printer Assigned**: Blue printer icon (`fa-print`)
- **Service In Progress**: Yellow wrench icon (`fa-wrench`)
- **Service Completed**: Green check icon (`fa-check-circle`)
- **General Info**: Blue info icon (`fa-info-circle`)

### Priority Colors
- **Urgent**: Red background (`bg-red-100 text-red-800`)
- **High**: Orange background (`bg-orange-100 text-orange-800`)
- **Medium**: Yellow background (`bg-yellow-100 text-yellow-800`)
- **Low**: Gray background (`bg-gray-100 text-gray-800`)

### Status Badges
- **New**: Blue badge
- **Pending**: Yellow badge
- **Completed**: Green badge
- **Assigned**: Purple badge

## Testing Checklist

- [x] Notification page loads without errors
- [x] Sidebar link navigates to notifications page
- [x] Notifications fetched from API successfully
- [x] Filter buttons work correctly
- [x] Statistics display accurate counts
- [x] Mark as read functionality works
- [x] Mark all as read functionality works
- [x] Delete notification functionality works
- [x] Auto-refresh works (30-second interval)
- [x] Responsive design on mobile devices
- [x] Printer assignment triggers notification
- [x] Service progress triggers notifications
- [x] Service completion triggers high-priority notification
- [x] Notifications show correct sender information
- [x] Time ago display works correctly
- [x] Priority badges display correctly

## Files Modified

1. **New Files**:
   - `client/src/pages/coordinator/notifications.html` - Main notifications page

2. **Modified Files**:
   - `server/index.js` - Added printer assignment notifications
   - `server/routes/technician-service-requests.js` - Added service progress notifications
   - `client/src/components/coordinator-sidenav.html` - Updated notifications link

## Database Relationships

```
institutions (institution_id, user_id)
    ↓
user_id = coordinator's user id
    ↓
notifications (user_id = coordinator's user id)
    ↓
Shows all notifications for that coordinator
```

## Benefits

1. **Real-time Awareness**: Coordinators stay informed about their institution's printers and services
2. **Action Required Alerts**: High-priority notifications for approvals
3. **Audit Trail**: Complete history of printer assignments and service progress
4. **Improved Communication**: Clear, organized notification system
5. **Better Oversight**: Coordinators can track service request lifecycle
6. **Reduced Response Time**: Instant notifications enable faster approvals

## Future Enhancements

Possible future improvements:
- WebSocket integration for real-time push notifications
- Email notifications for critical alerts
- Notification preferences/settings
- Notification grouping by institution
- Search functionality within notifications
- Bulk actions (delete multiple, mark multiple as read)
- Export notification history
- Notification sound alerts
- Browser push notifications

## Notes

- Notifications are scoped to the logged-in coordinator (via `user_id`)
- The system uses the `institutions.user_id` field to identify which coordinator owns an institution
- Service request notifications include both coordinator and requester
- Auto-refresh prevents the need for manual page refreshes
- The notification badge in the sidebar updates based on unread count

## Success Criteria Met

✅ Coordinators receive notifications when printers are assigned to their institutions
✅ Coordinators receive notifications about service request progress
✅ UI displays notifications in an organized, user-friendly manner
✅ Notifications include relevant details (printer info, service status, sender)
✅ System provides filtering and management capabilities
✅ Real-time statistics and badge counters
✅ Responsive design for mobile and desktop

---

**Implementation Status**: ✅ COMPLETE

The institution_admin notifications system is now fully operational and ready for use.

