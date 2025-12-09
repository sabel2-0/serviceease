-- Migration: Fix coordinator references in maintenance_services table
-- Description: Rename all coordinator-related columns and enum values to institution_admin

USE serviceease;

-- Step 1: Add new columns with institution_admin naming
ALTER TABLE `maintenance_services`
ADD COLUMN `institution_admin_approval_status` enum('pending','approved','rejected') DEFAULT 'pending' AFTER `coordinator_approval_status`,
ADD COLUMN `institution_admin_notes` text AFTER `coordinator_notes`,
ADD COLUMN `institution_admin_reviewed_at` timestamp NULL DEFAULT NULL AFTER `coordinator_reviewed_at`,
ADD COLUMN `institution_admin_reviewed_by` int DEFAULT NULL AFTER `coordinator_reviewed_by`;

-- Step 2: Copy data from old columns to new columns
UPDATE `maintenance_services`
SET 
  `institution_admin_approval_status` = `coordinator_approval_status`,
  `institution_admin_notes` = `coordinator_notes`,
  `institution_admin_reviewed_at` = `coordinator_reviewed_at`,
  `institution_admin_reviewed_by` = `coordinator_reviewed_by`;

-- Step 3: Drop old coordinator columns
ALTER TABLE `maintenance_services`
DROP COLUMN `coordinator_approval_status`,
DROP COLUMN `coordinator_notes`,
DROP COLUMN `coordinator_reviewed_at`,
DROP COLUMN `coordinator_reviewed_by`;

-- Step 4: Update status enum values from coordinator to institution_admin
ALTER TABLE `maintenance_services`
MODIFY COLUMN `status` enum('pending_institution_admin','institution_admin_approved','pending_requester','completed','rejected') DEFAULT 'pending_institution_admin';

-- Step 5: Update existing data to use new enum values
UPDATE `maintenance_services`
SET `status` = 'pending_institution_admin'
WHERE `status` = 'pending_coordinator';

UPDATE `maintenance_services`
SET `status` = 'institution_admin_approved'
WHERE `status` = 'coordinator_approved';

-- Verification queries
SELECT 'Checking column names...' AS step;
SHOW COLUMNS FROM `maintenance_services`;

SELECT 'Checking status values...' AS step;
SELECT DISTINCT status FROM `maintenance_services`;

SELECT 'Migration complete!' AS result;
