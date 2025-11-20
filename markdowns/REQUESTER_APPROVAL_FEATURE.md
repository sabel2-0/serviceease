# Requester Approval Feature

## Overview
Requesters can now approve or reject completed service requests before they are marked as fully completed.

## Features Implemented

### 1. Requester Notifications ✅
- **Service Started**: Notification when technician starts working
- **Service Completed**: Notification when work is submitted for approval
- **Printer Assigned**: Notification when coordinator assigns a printer

### 2. Approval Workflow ✅
When a technician completes a service request:
1. Status changes to `pending_approval`
2. Requester receives a notification
3. Service request appears in "Needs Approval" tab in History
4. Requester can review and either:
   - **Approve**: Marks request as `completed`
   - **Reject**: Sends back to technician as `in_progress`

### 3. UI Updates

#### History Page
- New **"Needs Approval"** filter tab
- Pending approval requests highlighted with orange border
- Shows technician name who completed the work
- "Review & Approve" button for pending requests

#### Approval Modal
- Shows request number and technician name
- Optional feedback textarea
- Two action buttons:
  - ✅ **Approve**: Completes the service request
  - ❌ **Reject**: Sends back for revision
- Cancel option to close without action

### 4. Backend API

#### New Endpoint: `PATCH /api/users/me/service-requests/:id/approve`
**Auth**: Required (requester role only)

**Body**:
```json
{
  "approved": true,  // or false
  "feedback": "Optional feedback message"
}
```

**Response**:
```json
{
  "message": "Service request approved",
  "status": "completed"
}
```

**Validations**:
- Only the requester who created the request can approve/reject
- Request must be in `pending_approval` status
- Sends notification to technician about approval/rejection

### 5. Database Changes
No schema changes required. Uses existing:
- `service_requests.status` enum (includes `pending_approval`)
- `service_requests.resolved_by`
- `service_requests.resolved_at`
- `service_requests.resolution_notes`
- `service_requests.completed_at`

### 6. Notification System
**Technician receives notification when**:
- Request is approved by requester
- Request is rejected by requester (with feedback if provided)

**Notification includes**:
- Requester name
- Request number
- Feedback message (if provided)
- Status (approved/rejected)

## Testing

### Test Scenario
1. **As Requester**:
   - Create a new service request
   - Check notifications (should be empty initially)

2. **As Technician**:
   - Find the pending request
   - Click "Start Service" (requester gets notification)
   - Complete the service (add parts, photos, notes)
   - Submit for approval (status → `pending_approval`, requester gets notification)

3. **As Requester** (markivan.note@gmail.com, user_id: 66):
   - Refresh page
   - Check notifications (should see 2: "Service Started" and "Service Completed")
   - Go to History tab
   - Click "Needs Approval" filter
   - See the pending request with orange highlight
   - Click "Review & Approve" button
   - Add optional feedback
   - Click either:
     - "✅ Approve" → Request completed
     - "❌ Reject" → Back to technician

4. **As Technician**:
   - Check notifications
   - Should see approval/rejection notification from requester

## Status Badges
- 🟡 **Pending**: Waiting for technician assignment
- 🔵 **Approved**: Approved by coordinator
- 🟣 **In Progress**: Technician is working
- 🟠 **Needs Your Approval**: Waiting for requester review
- 🟢 **Completed**: Fully completed and approved
- 🔴 **Rejected**: Rejected by requester or coordinator

## Current Test Data
- **Request 148**: Status `pending_approval`
  - Requester: Tera Mitenas (user_id: 66)
  - Technician: User ID 57
  - Has 2 notifications (started, completed)

## Files Modified
1. `server/index.js` - Added approval endpoint
2. `client/src/pages/requester/requester-history.html` - Added approval tab and modal
3. `client/src/js/requester-app.js` - Added approval functions
4. `client/src/js/requester-notifications.js` - Created notification system for requesters
5. `client/src/components/requester-notifications.html` - Notification UI component
6. `client/src/components/requester-topnav.html` - Added notification modal

## Next Steps
- Test the complete flow end-to-end
- Consider adding approval history/audit trail
- Add email notifications (optional)
- Show work details (parts used, photos) in approval modal
