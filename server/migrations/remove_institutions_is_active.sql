-- Migration to remove is_active column from institutions table since status column is already being used

-- Remove is_active column from institutions table
ALTER TABLE institutions DROP COLUMN is_active;

-- Verify the changes
DESCRIBE institutions;
