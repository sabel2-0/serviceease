-- Migration to add is_active column to institutions table

-- Add is_active column to institutions table
ALTER TABLE institutions 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER address;

-- Set all existing institutions as active
UPDATE institutions SET is_active = TRUE WHERE is_active IS NULL;

-- Verify the changes
DESCRIBE institutions;
