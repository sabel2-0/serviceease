-- Migration: Change 'requester' role to 'institution_user' in users table
-- Date: 2025-12-03
-- Description: Rename the requester role to institution_user throughout the system

-- Step 1: First, modify the ENUM to add 'institution_user' as an option
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin','institution_admin','operations_officer','technician','requester','institution_user') NOT NULL;

-- Step 2: Update all existing 'requester' records to 'institution_user'
UPDATE `users` 
SET `role` = 'institution_user' 
WHERE `role` = 'requester';

-- Step 3: Remove 'requester' from the ENUM (now that no records use it)
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin','institution_admin','operations_officer','technician','institution_user') NOT NULL;

-- Verification: Check that all requester roles have been changed
SELECT 
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

-- Expected output: No 'requester' roles should exist, only 'institution_user'
