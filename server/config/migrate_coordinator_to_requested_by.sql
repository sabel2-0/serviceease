-- Migration: Change coordinator_id to requested_by_user_id in service_requests table
-- This will track who submitted the request (requester or coordinator)

USE serviceease;

-- Step 1: Add new column requested_by_user_id
ALTER TABLE service_requests 
ADD COLUMN requested_by_user_id INT NULL AFTER coordinator_id,
ADD CONSTRAINT fk_service_requests_requested_by 
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 2: Migrate existing data - copy coordinator_id to requested_by_user_id
UPDATE service_requests 
SET requested_by_user_id = coordinator_id 
WHERE coordinator_id IS NOT NULL;

-- Step 3: Drop the old coordinator_id column
-- (We'll do this after verifying everything works)
-- ALTER TABLE service_requests DROP COLUMN coordinator_id;

-- Add index for better performance
CREATE INDEX idx_requested_by_user ON service_requests(requested_by_user_id);

SELECT 'Migration completed successfully' AS status;
