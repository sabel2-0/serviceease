-- Migration: Clean up service_requests table
-- Description: Remove institution_user_id (redundant with requested_by)

USE serviceease;

-- Step 1: Check if there's any data in institution_user_id
SELECT 'Checking institution_user_id usage...' AS step;
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN institution_user_id IS NOT NULL THEN 1 ELSE 0 END) as has_institution_user_id,
    SUM(CASE WHEN requested_by IS NOT NULL THEN 1 ELSE 0 END) as has_requested_by
FROM service_requests;

-- Step 2: Drop foreign key constraint on institution_user_id
ALTER TABLE `service_requests`
DROP FOREIGN KEY `fk_sr_institution_user`;

-- Step 3: Remove institution_user_id column
ALTER TABLE `service_requests`
DROP COLUMN `institution_user_id`;

-- Verification
SELECT 'Checking final structure...' AS step;
SHOW COLUMNS FROM service_requests;

SELECT 'Migration complete!' AS result;
