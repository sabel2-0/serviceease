-- Migration: Change 'coordinator' role to 'institution_admin' in users table
-- Date: 2025-12-03
-- Description: Rename the coordinator role to institution_admin throughout the system

-- Step 1: First, modify the ENUM to add 'institution_admin' as an option
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin','coordinator','institution_admin','operations_officer','technician','requester') NOT NULL;

-- Step 2: Update all existing 'coordinator' records to 'institution_admin'
UPDATE `users` 
SET `role` = 'institution_admin' 
WHERE `role` = 'coordinator';

-- Step 3: Remove 'coordinator' from the ENUM (now that no records use it)
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin','institution_admin','operations_officer','technician','requester') NOT NULL;

-- Verification: Check that all coordinator roles have been changed
SELECT 
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

-- Expected output: No 'coordinator' roles should exist, only 'institution_admin'
