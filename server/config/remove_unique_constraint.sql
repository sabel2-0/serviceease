-- Remove the unique constraint that prevents multiple active assignments per institution
USE serviceease;

-- Drop the constraint
ALTER TABLE technician_assignments DROP INDEX IF EXISTS unique_active_assignment;

-- Add indexes for performance instead
CREATE INDEX IF NOT EXISTS idx_technician_institution ON technician_assignments (technician_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_active ON technician_assignments (institution_id, is_active);

-- Show the updated table structure
SHOW CREATE TABLE technician_assignments;