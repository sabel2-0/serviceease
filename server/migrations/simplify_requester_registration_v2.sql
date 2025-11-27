USE serviceease;

-- Drop requester_registrations table (no longer needed)
DROP TABLE IF EXISTS requester_registrations;

-- Add code column to verification_tokens (ignore if exists)
ALTER TABLE verification_tokens ADD COLUMN code VARCHAR(6) AFTER token;

-- Add index for code lookups (ignore if exists)
ALTER TABLE verification_tokens ADD INDEX idx_code (code);

-- Update users table to support requester role
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'operations_officer', 'technician', 'coordinator', 'requester') NOT NULL;

-- Add verification fields to users
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER is_email_verified;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME AFTER email_verified;

-- Add approval fields for requesters
ALTER TABLE users ADD COLUMN approved_by INT AFTER approval_status;
ALTER TABLE users ADD COLUMN approved_at DATETIME AFTER approved_by;

-- Add ID photo URLs to users table
ALTER TABLE users ADD COLUMN id_front_url VARCHAR(500) AFTER institution_address;
ALTER TABLE users ADD COLUMN id_back_url VARCHAR(500) AFTER id_front_url;
ALTER TABLE users ADD COLUMN selfie_url VARCHAR(500) AFTER id_back_url;
