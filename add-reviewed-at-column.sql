-- Add reviewed_at and rejection_reason columns to users table for approval history tracking
ALTER TABLE users 
ADD COLUMN reviewed_at DATETIME DEFAULT NULL AFTER approved_at,
ADD COLUMN rejection_reason TEXT DEFAULT NULL AFTER reviewed_at;

-- Update existing approved/rejected users to have reviewed_at timestamp
UPDATE users 
SET reviewed_at = COALESCE(approved_at, updated_at) 
WHERE approval_status IN ('approved', 'rejected') AND reviewed_at IS NULL;
