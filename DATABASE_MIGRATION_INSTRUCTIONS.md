# Database Migration Instructions

## BETTER APPROACH: Rename Column in Existing `service_approvals` Table

Instead of adding a new column, we'll use the existing `service_approvals` table and rename `institution_admin_id` to `approved_by` to make it more generic.

Run this SQL in your Railway database console:

```sql
-- Rename institution_admin_id to approved_by (more generic for all roles)
ALTER TABLE service_approvals 
CHANGE COLUMN institution_admin_id approved_by INT NULL;
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if column was renamed
DESCRIBE service_approvals;

-- You should see 'approved_by' instead of 'institution_admin_id'
```

## What This Does

- Renames `service_approvals.institution_admin_id` → `approved_by`
- Now works for ALL approver types: institution_user, institution_admin, operations_officer, admin
- The `resolution_notes` field will contain: "Approved by {role} - {FirstName LastName}"
- Keeps data properly normalized (approval data in dedicated table)

## Expected Result

From now on, when a service request is approved:
1. The `service_approvals.approved_by` column stores the approver's user ID (any role)
2. The `resolution_notes` shows: "Approved by Institution Admin - Maria Santos" (example)
3. APIs JOIN with users table to return approver name and role

## Why This Is Better

✅ Uses existing table structure  
✅ No data duplication  
✅ Proper database normalization  
✅ Already has indexes and relationships
