-- Add status column to users table for coordinator deactivation
-- This separates deactivation functionality from approval_status

-- Add status column with default value 'active'
ALTER TABLE users 
ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' 
AFTER is_email_verified;

-- Set all existing coordinators to 'active' status initially
-- (they can be deactivated later through the admin interface)
UPDATE users 
SET status = 'active' 
WHERE role = 'coordinator' AND approval_status = 'approved';

-- Set any previously "deactivated" coordinators (those with pending status but were originally approved) to inactive
-- This handles coordinators that were deactivated using the old system
UPDATE users 
SET status = 'inactive' 
WHERE role = 'coordinator' 
  AND approval_status = 'pending' 
  AND is_email_verified = false 
  AND updated_at > created_at;

-- Add index for better performance when filtering by status
CREATE INDEX idx_users_status ON users(status);

-- Display current status of coordinators after migration
SELECT 
    id,
    CONCAT(first_name, ' ', last_name) as name,
    email,
    role,
    approval_status,
    is_email_verified,
    status,
    created_at,
    updated_at
FROM users 
WHERE role = 'coordinator'
ORDER BY status, last_name;