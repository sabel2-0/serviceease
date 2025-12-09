-- Database Cleanup Migration
-- Date: December 3, 2025
-- Purpose: Remove redundancies and fix naming confusion

USE serviceease;

-- =====================================================
-- STEP 1: Remove redundant email_verified_at column
-- =====================================================
-- The is_email_verified column is sufficient
-- email_verified_at is not actively used in the codebase

-- Check if column exists before dropping
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE users DROP COLUMN email_verified_at', 'SELECT "Column does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 2: Rename confusing table name
-- =====================================================
-- client_printer_assignments → institution_printer_assignments
-- This clarifies that it assigns printers to institutions, not individual users

RENAME TABLE client_printer_assignments TO institution_printer_assignments;

-- =====================================================
-- STEP 3: Add documentation to clarify columns
-- =====================================================
-- Clarify the purpose of notification user-related columns

ALTER TABLE notifications 
  MODIFY COLUMN user_id INT DEFAULT NULL COMMENT 'Recipient of this notification',
  MODIFY COLUMN sender_id INT DEFAULT NULL COMMENT 'User who triggered/sent this notification',
  MODIFY COLUMN related_user_id INT DEFAULT NULL COMMENT 'User this notification is about';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify success

-- Check users table no longer has email_verified_at
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS 
-- WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at';
-- Should return 0 rows

-- Check new table name exists
-- SHOW TABLES LIKE 'institution_printer_assignments';
-- Should return 1 row

-- Check old table name is gone
-- SHOW TABLES LIKE 'client_printer_assignments';
-- Should return 0 rows

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- Uncomment these if you need to undo the changes

-- Add back email_verified_at column
-- ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER is_email_verified;

-- Rename table back to original name
-- RENAME TABLE institution_printer_assignments TO client_printer_assignments;
