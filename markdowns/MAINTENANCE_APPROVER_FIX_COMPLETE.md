# MAINTENANCE SERVICES APPROVER FIX - COMPLETE

## Problem Identified
The `maintenance_services` table had `approved_by_institution_admin` column, but **both `institution_admin` AND `institution_user` can approve maintenance services**. The naming was misleading.

## Solution Implemented

### Database Changes
 **Column Renamed**: `approved_by_institution_admin` → `approved_by_user_id`
- This generic name now correctly represents that either role can approve
- Foreign key updated to reference `users(id)`
- Added column comment: "User ID of approver (can be institution_admin or institution_user)"

### Final Table Structure (13 columns)
```sql
maintenance_services
├── id (PK, auto_increment)
├── technician_id (FK → users.id)
├── printer_id (FK → printers.id)
├── institution_id (FK → institutions.institution_id)
├── service_description (text)
├── parts_used (JSON text)
├── completion_photo (varchar 500)
├── status (enum: 'pending', 'approved', 'rejected', 'completed')
├── approved_by_user_id (FK → users.id) ← RENAMED, accepts both roles
├── institution_admin_notes (text)
├── created_at (timestamp)
├── institution_admin_approved_at (timestamp)
└── completed_at (timestamp)
```

### Backend Code Updates
**File**: `server/routes/maintenance-services.js`

#### 1. Service Submission (POST)
**Before**: Inserted `requester_id`, `institution_admin_approval_status`, `requester_approval_status`
**After**: Only inserts `status = 'pending'`
```javascript
INSERT INTO maintenance_services (
    technician_id, printer_id, institution_id,
    service_description, parts_used, completion_photo,
    status
) VALUES (?, ?, ?, ?, ?, ?, 'pending')
```

#### 2. Institution Admin Approval
**Before**: 
```javascript
SET institution_admin_approval_status = 'approved',
    status = 'completed'
WHERE id = ?
```
**After**:
```javascript
SET status = 'completed',
    approved_by_user_id = ?,
    institution_admin_approved_at = NOW(),
    completed_at = NOW()
WHERE id = ?
```

#### 3. Institution Admin Rejection
**Before**:
```javascript
SET institution_admin_approval_status = 'rejected',
    status = 'rejected'
```
**After**:
```javascript
SET status = 'rejected',
    approved_by_user_id = ?,
    institution_admin_approved_at = NOW()
```

#### 4. Institution User Approval
**Before**:
```javascript
SET requester_approval_status = 'approved',
    status = 'completed'
```
**After**:
```javascript
SET status = 'completed',
    approved_by_user_id = ?,
    institution_admin_approved_at = NOW(),
    completed_at = NOW()
```

#### 5. Institution User Rejection
**Before**:
```javascript
SET requester_approval_status = 'rejected',
    status = 'rejected'
```
**After**:
```javascript
SET status = 'rejected',
    approved_by_user_id = ?,
    institution_admin_approved_at = NOW()
```

#### 6. SELECT Queries Updated
**Removed columns**:
- `institution_admin_approval_status`
- `requester_approval_status`
- `requester_notes`
- `requester_reviewed_at`
- `requester_reviewed_by`

**Added**:
- `approved_by_user_id`
- `approver.first_name, approver.last_name` (via JOIN)
- `approver.role` (shows if institution_admin or institution_user approved)

**New JOIN**:
```sql
LEFT JOIN users approver ON vs.approved_by_user_id = approver.id
```

## How It Works Now

### Approval Flow
1. **Technician submits** maintenance service → `status = 'pending'`
2. **Either institution_admin OR institution_user** can approve/reject
3. **On approval**: 
   - `status = 'completed'`
   - `approved_by_user_id = [approver's user ID]`
   - Parts deducted from technician inventory
   - Notifications sent
4. **On rejection**:
   - `status = 'rejected'`
   - `approved_by_user_id = [rejector's user ID]`

### Identifying Approver Role
Query `approved_by_user_id` and join with `users` table:
```sql
SELECT 
    ms.id,
    ms.status,
    ms.approved_by_user_id,
    u.first_name,
    u.last_name,
    u.role  -- Shows 'institution_admin' or 'institution_user'
FROM maintenance_services ms
LEFT JOIN users u ON ms.approved_by_user_id = u.id
```

## Benefits
 **Accurate naming**: Column name reflects actual usage
 **Flexible approvals**: Both roles can approve without confusion
 **Cleaner structure**: Removed 9 redundant columns
 **Single source of truth**: One `status` field, one `approved_by_user_id`
 **Audit trail**: Can see WHO approved and WHAT ROLE they had

## Files Modified
1. `c:\Users\marki\Desktop\SE\fix_maintenance_services_approver.sql` - Migration script
2. `c:\Users\marki\Desktop\SE\server\routes\maintenance-services.js` - Backend logic
3. `c:\Users\marki\Desktop\SE\cleanup_maintenance_services_table.sql` - Previous cleanup

## Testing Checklist
- [ ] Institution admin can approve maintenance service
- [ ] Institution user can approve maintenance service
- [ ] Approver's name and role appear correctly in service history
- [ ] Parts are deducted after approval
- [ ] Rejected services show rejector's details
- [ ] Notifications sent to correct users
- [ ] Service history displays approver info correctly

## Notes
- The database column was already renamed to `approved_by_user_id` in a previous migration
- This update primarily fixed the backend code to use the correct column names
- All references to deleted columns (`requester_approval_status`, `institution_admin_approval_status`) have been removed
