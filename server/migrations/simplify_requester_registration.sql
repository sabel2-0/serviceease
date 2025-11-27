USE serviceease;

-- Drop requester_registrations table (no longer needed)
DROP TABLE IF EXISTS requester_registrations;

-- Ensure verification_tokens table supports 6-digit codes
-- Add code column if not exists
ALTER TABLE verification_tokens 
ADD COLUMN IF NOT EXISTS code VARCHAR(6) AFTER token;

-- Add index for code lookups
ALTER TABLE verification_tokens 
ADD INDEX IF NOT EXISTS idx_code (code);

-- Update users table to support requester role and verification
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'operations_officer', 'technician', 'coordinator', 'requester') NOT NULL;

-- Ensure users table has verification fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE AFTER is_email_verified;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified_at DATETIME AFTER email_verified;

-- Add approval fields for requesters (need coordinator approval)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_by INT AFTER approval_status;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_at DATETIME AFTER approved_by;

-- Add ID photo URLs to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS id_front_url VARCHAR(500) AFTER institution_address;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS id_back_url VARCHAR(500) AFTER id_front_url;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS selfie_url VARCHAR(500) AFTER id_back_url;
