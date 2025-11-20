-- Migration to remove 'fulfilled' status from parts_requests table
-- This script updates existing 'fulfilled' records to 'approved' and modifies the ENUM

-- Step 1: Update any existing 'fulfilled' records to 'approved'
UPDATE parts_requests 
SET status = 'approved' 
WHERE status = 'fulfilled';

-- Step 2: Modify the ENUM to remove 'fulfilled'
ALTER TABLE parts_requests 
MODIFY COLUMN status ENUM('pending', 'approved', 'denied') DEFAULT 'pending';

-- Verify the changes
SELECT COUNT(*) as fulfilled_count FROM parts_requests WHERE status = 'fulfilled';
-- Should return 0

SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'parts_requests' 
AND COLUMN_NAME = 'status';
-- Should show: enum('pending','approved','denied')
