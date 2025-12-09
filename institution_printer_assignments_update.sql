-- Migration: Update institution_printer_assignments table
-- Date: 2025-12-03
-- Description: Remove location_note column and add unassigned_at column

-- Step 1: Remove the location_note column
ALTER TABLE `institution_printer_assignments` 
DROP COLUMN `location_note`;

-- Step 2: Add unassigned_at column
ALTER TABLE `institution_printer_assignments` 
ADD COLUMN `unassigned_at` TIMESTAMP NULL DEFAULT NULL AFTER `assigned_at`;

-- Verification: Check the updated table structure
DESCRIBE `institution_printer_assignments`;
