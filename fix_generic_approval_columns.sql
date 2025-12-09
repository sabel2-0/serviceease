-- ============================================================
-- RENAME REMAINING INSTITUTION_ADMIN SPECIFIC COLUMNS
-- ============================================================
-- Make all approval-related columns generic since both 
-- institution_admin AND institution_user can approve
-- ============================================================

USE serviceease;

-- Step 1: Create backup
SELECT 'Creating backup table...' AS message;
DROP TABLE IF EXISTS maintenance_services_backup_generic_columns;
CREATE TABLE maintenance_services_backup_generic_columns AS SELECT * FROM maintenance_services;

-- Step 2: Rename institution_admin_notes → approval_notes
SELECT 'Renaming institution_admin_notes to approval_notes...' AS message;
ALTER TABLE maintenance_services 
CHANGE COLUMN institution_admin_notes approval_notes TEXT;

-- Step 3: Rename institution_admin_approved_at → approved_at
SELECT 'Renaming institution_admin_approved_at to approved_at...' AS message;
ALTER TABLE maintenance_services 
CHANGE COLUMN institution_admin_approved_at approved_at TIMESTAMP NULL;

-- Step 4: Update column comments for clarity
ALTER TABLE maintenance_services 
MODIFY COLUMN approved_by_user_id INT 
COMMENT 'User ID of approver (can be institution_admin or institution_user)';

ALTER TABLE maintenance_services 
MODIFY COLUMN approval_notes TEXT 
COMMENT 'Notes from approver (institution_admin or institution_user)';

ALTER TABLE maintenance_services 
MODIFY COLUMN approved_at TIMESTAMP NULL
COMMENT 'When the service was approved/rejected';

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Final structure:' AS message;
SHOW COLUMNS FROM maintenance_services;

SELECT 'Migration complete!' AS message;
SELECT 'Renamed: institution_admin_notes → approval_notes' AS change1;
SELECT 'Renamed: institution_admin_approved_at → approved_at' AS change2;
