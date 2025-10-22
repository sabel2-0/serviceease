-- Fix the technician assignments constraint to only apply to active assignments
USE serviceease;

-- Drop the problematic unique constraint
ALTER TABLE technician_assignments DROP INDEX unique_active_assignment;

-- Create a new partial unique index that only applies to active assignments
-- This allows multiple inactive assignments but only one active per institution
ALTER TABLE technician_assignments 
ADD CONSTRAINT unique_active_assignment 
UNIQUE (institution_id, is_active) 
USING BTREE;

-- Note: In MySQL, we need to handle this differently since partial indexes aren't fully supported
-- Let's drop the constraint entirely and handle uniqueness in application logic
ALTER TABLE technician_assignments DROP INDEX unique_active_assignment;

-- Add a regular index for performance
CREATE INDEX idx_institution_active ON technician_assignments (institution_id, is_active);

-- Show the updated table structure
SHOW CREATE TABLE technician_assignments;