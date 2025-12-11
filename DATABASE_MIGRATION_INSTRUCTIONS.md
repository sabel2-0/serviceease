# Database Migration Instructions

## Add `approved_by` Column to Service Requests Table

Run this SQL in your Railway database console:

```sql
-- Add approved_by column to track who approved the service request
ALTER TABLE service_requests 
ADD COLUMN approved_by INT NULL AFTER completed_at;

-- Add index for performance
CREATE INDEX idx_service_requests_approved_by ON service_requests(approved_by);
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if column was added
DESCRIBE service_requests;

-- Check if index was created
SHOW INDEX FROM service_requests WHERE Key_name = 'idx_service_requests_approved_by';
```

## What This Does

- Adds a new `approved_by` column to store the user ID of whoever approved the service request
- Works for all approver types: institution_user, institution_admin, operations_officer, admin
- The `resolution_notes` field will now contain: "Approved by {role} - {FirstName LastName}"

## Expected Result

From now on, when a service request is approved:
1. The `approved_by` column will store the approver's user ID
2. The `resolution_notes` will show: "Approved by Institution Admin - Maria Santos" (example)
3. The UI can display both the role and actual name of who approved

## Note

We're NOT adding a foreign key constraint because if the approver is deleted from the system, we still want to keep the historical record of the approval.
