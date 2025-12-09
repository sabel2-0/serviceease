-- ============================================================
-- MAINTENANCE SERVICES TABLE - FINAL CLEAN STRUCTURE
-- ============================================================
-- This migration creates the final, clean structure with:
-- - Generic approval columns (both institution_admin AND institution_user can approve)
-- - Removed all redundant requester columns
-- - Simplified status enum
-- ============================================================

USE serviceease;

-- ============================================================
-- STEP 1: Backup existing data
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_services_backup_final AS 
SELECT * FROM maintenance_services;

SELECT 'Backup created successfully' AS message;

-- ============================================================
-- STEP 2: Ensure table has correct structure
-- ============================================================

-- The table should have these 13 columns:
-- 1. id
-- 2. technician_id
-- 3. printer_id
-- 4. institution_id
-- 5. service_description
-- 6. parts_used
-- 7. completion_photo
-- 8. status
-- 9. approved_by_user_id (generic - both roles)
-- 10. approval_notes (generic - both roles)
-- 11. created_at
-- 12. approved_at (generic - both roles)
-- 13. completed_at

-- Check and add approved_by_user_id if needed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND COLUMN_NAME = 'approved_by_user_id');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE maintenance_services ADD COLUMN approved_by_user_id INT NULL COMMENT "User ID of approver (institution_admin or institution_user)"',
    'SELECT "Column approved_by_user_id already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add approval_notes if needed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND COLUMN_NAME = 'approval_notes');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE maintenance_services ADD COLUMN approval_notes TEXT NULL COMMENT "Notes from approver (institution_admin or institution_user)"',
    'SELECT "Column approval_notes already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add approved_at if needed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND COLUMN_NAME = 'approved_at');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE maintenance_services ADD COLUMN approved_at TIMESTAMP NULL COMMENT "When service was approved/rejected"',
    'SELECT "Column approved_at already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for approved_by_user_id
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND CONSTRAINT_NAME = 'fk_approved_by_user');

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE maintenance_services ADD CONSTRAINT fk_approved_by_user FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_approved_by_user already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- STEP 3: Ensure status enum is correct
-- ============================================================

ALTER TABLE maintenance_services 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'completed') 
DEFAULT 'pending';

-- ============================================================
-- STEP 4: Add indexes for performance
-- ============================================================

-- Check and create indexes
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND INDEX_NAME = 'idx_ms_status');

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_ms_status ON maintenance_services(status)',
    'SELECT "Index idx_ms_status already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND INDEX_NAME = 'idx_ms_approved_by_user');

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_ms_approved_by_user ON maintenance_services(approved_by_user_id)',
    'SELECT "Index idx_ms_approved_by_user already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'maintenance_services' 
    AND INDEX_NAME = 'idx_ms_created_at');

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_ms_created_at ON maintenance_services(created_at)',
    'SELECT "Index idx_ms_created_at already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT 'Final table structure:' AS message;
SHOW COLUMNS FROM maintenance_services;

SELECT '\nData check:' AS message;
SELECT 
    COUNT(*) as total_records,
    COUNT(approved_by_user_id) as records_with_approver,
    COUNT(approved_at) as records_with_approval_date,
    COUNT(DISTINCT status) as distinct_statuses
FROM maintenance_services;

SELECT '\nSample data:' AS message;
SELECT 
    id,
    technician_id,
    printer_id,
    institution_id,
    status,
    approved_by_user_id,
    approved_at,
    created_at
FROM maintenance_services
LIMIT 5;

-- ============================================================
-- FINAL STRUCTURE SUMMARY
-- ============================================================
-- 
-- MAINTENANCE_SERVICES TABLE (13 columns):
-- ✓ id (INT, PK, auto_increment)
-- ✓ technician_id (INT, FK → users.id)
-- ✓ printer_id (INT, FK → printers.id)
-- ✓ institution_id (VARCHAR(50), FK → institutions.institution_id)
-- ✓ service_description (TEXT)
-- ✓ parts_used (TEXT/JSON)
-- ✓ completion_photo (VARCHAR(500))
-- ✓ status (ENUM: pending, approved, rejected, completed)
-- ✓ approved_by_user_id (INT, FK → users.id) - GENERIC for both roles
-- ✓ approval_notes (TEXT) - GENERIC for both roles
-- ✓ created_at (TIMESTAMP)
-- ✓ approved_at (TIMESTAMP) - GENERIC for both roles
-- ✓ completed_at (TIMESTAMP)
--
-- KEY CHANGES FROM ORIGINAL:
-- ✓ Removed 9 redundant columns (requester_id, requester_approval_status, etc.)
-- ✓ Renamed columns to be role-agnostic:
--   - approved_by_institution_admin → approved_by_user_id
--   - institution_admin_notes → approval_notes
--   - institution_admin_approved_at → approved_at
-- ✓ Simplified status enum (4 values instead of 6)
-- ✓ Both institution_admin AND institution_user can approve/reject
-- ✓ Approver role can be determined by joining with users table
-- ============================================================

SELECT 'Migration complete! ✓' AS message;
