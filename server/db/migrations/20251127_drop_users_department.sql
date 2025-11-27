-- Migration: Drop users.department column
-- Date: 2025-11-27
-- Purpose: Remove redundant `department` column from `users` table. Department is now stored in `user_printer_assignments`.

-- IMPORTANT: Backup your database before running this migration.
-- Example backup command (run in your shell):
-- mysqldump -u root -p"<password>" --single-transaction --routines --triggers serviceease > ../backups/serviceease_backup_20251127.sql

SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_MODE = @@SQL_MODE;

SET UNIQUE_CHECKS = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop the column safely if it exists (compatible technique)
-- This uses INFORMATION_SCHEMA to check for the column and executes ALTER only when present.
SET @col_count := (
	SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'department'
);
SET @sql_stmt := IF(@col_count > 0, 'ALTER TABLE `users` DROP COLUMN `department`', 'SELECT "users.department does not exist"');
PREPARE _stmt FROM @sql_stmt;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
SET SQL_MODE = @OLD_SQL_MODE;

-- Rollback (if needed): uncomment and run to add column back (nullable)
-- ALTER TABLE `users` ADD COLUMN `department` VARCHAR(255) DEFAULT NULL AFTER `password`;

-- End migration
