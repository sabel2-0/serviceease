-- ============================================================
-- FIX MAINTENANCE SERVICES APPROVER COLUMN
-- ============================================================
-- Change from: approved_by_institution_admin
-- Change to:   approved_by_user_id
-- Reason: Both institution_admin AND institution_user can approve services
-- ============================================================

USE serviceease;

-- Step 1: Create backup
SELECT 'Creating backup table...' AS message;
DROP TABLE IF EXISTS maintenance_services_backup_approver;
CREATE TABLE maintenance_services_backup_approver AS SELECT * FROM maintenance_services;

-- Step 2: Rename the column to be more generic
SELECT 'Renaming approved_by_institution_admin to approved_by_user_id...' AS message;
ALTER TABLE maintenance_services 
CHANGE COLUMN approved_by_institution_admin approved_by_user_id INT;

-- Step 3: Update the foreign key if it exists
SELECT 'Updating foreign key constraint...' AS message;

-- Drop existing foreign key if it exists
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = 'serviceease' 
    AND TABLE_NAME = 'maintenance_services' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%approved_by%'
);

SET @drop_fk = IF(@fk_exists > 0, 
    'ALTER TABLE maintenance_services DROP FOREIGN KEY (SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = "serviceease" AND TABLE_NAME = "maintenance_services" AND CONSTRAINT_TYPE = "FOREIGN KEY" AND CONSTRAINT_NAME LIKE "%approved_by%" LIMIT 1)',
    'SELECT "No foreign key to drop" AS message'
);

-- Add new foreign key constraint
ALTER TABLE maintenance_services
ADD CONSTRAINT fk_approved_by_user
FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- Step 4: Add comment to clarify usage
ALTER TABLE maintenance_services 
MODIFY COLUMN approved_by_user_id INT 
COMMENT 'User ID of approver (can be institution_admin or institution_user)';

-- Step 5: Update indexes
SELECT 'Updating indexes...' AS message;

-- Check if old index exists and drop it
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'serviceease' 
    AND TABLE_NAME = 'maintenance_services' 
    AND INDEX_NAME = 'idx_ms_institution_admin'
);

SET @drop_idx_sql = IF(@index_exists > 0, 
    'DROP INDEX idx_ms_institution_admin ON maintenance_services',
    'SELECT "Index does not exist" AS message'
);

PREPARE drop_idx_stmt FROM @drop_idx_sql;
EXECUTE drop_idx_stmt;
DEALLOCATE PREPARE drop_idx_stmt;

-- Create new index
CREATE INDEX idx_ms_approved_by_user ON maintenance_services(approved_by_user_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Verification - Final structure:' AS message;
SHOW COLUMNS FROM maintenance_services;

SELECT '\nSample data check:' AS message;
SELECT 
    id,
    approved_by_user_id,
    status,
    institution_admin_approved_at,
    created_at
FROM maintenance_services
LIMIT 5;

SELECT '\nMigration complete!' AS message;
SELECT 'Column renamed: approved_by_institution_admin → approved_by_user_id' AS change_summary;
SELECT 'This column now accepts both institution_admin and institution_user IDs' AS explanation;
