-- Migration: Remove redundant columns from service_requests table
-- Date: 2025-12-06
-- Description: 
--   1. Remove assigned_technician_id (replaced by technician_id)
--   2. Remove resolved_by (technician who started the service is the one who completes it)
--   3. Remove resolved_at (completed_at serves the same purpose)
--   4. Remove updated_at (completed_at is more meaningful)
--   Note: technician_id already exists, tracks which technician accepted/started the service

-- Step 1: Migrate data from assigned_technician_id to technician_id (only if technician_id is NULL)
UPDATE service_requests 
SET technician_id = assigned_technician_id 
WHERE assigned_technician_id IS NOT NULL AND technician_id IS NULL;

-- Step 2: Drop foreign key constraint for assigned_technician_id
ALTER TABLE service_requests
DROP FOREIGN KEY fk_sr_technician;

-- Step 3: Drop the redundant columns
ALTER TABLE service_requests
DROP COLUMN assigned_technician_id,
DROP COLUMN resolved_by,
DROP COLUMN resolved_at,
DROP COLUMN updated_at;

-- Step 4: Verify the changes
DESCRIBE service_requests;

SELECT 'Migration completed successfully!' as status;
