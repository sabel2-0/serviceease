-- Add email_verification_code column to requester_registrations
ALTER TABLE requester_registrations 
ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6) AFTER email_verification_token;

-- Add index for quick lookups
ALTER TABLE requester_registrations 
ADD INDEX IF NOT EXISTS idx_verification_code (email_verification_code);
