-- Migration: Add status column to institution_printer_assignments
-- Date: 2025-12-03
-- Description: Track assignment status (assigned/unassigned) instead of using unassigned_at timestamp
--              This keeps historical records in the table while indicating current assignment status

-- Step 1: Remove unassigned_at column if it exists
-- ALTER TABLE `institution_printer_assignments` DROP COLUMN IF EXISTS `unassigned_at`;

-- Step 2: Add status column with ENUM type
ALTER TABLE `institution_printer_assignments` 
ADD COLUMN `status` ENUM('assigned', 'unassigned') NOT NULL DEFAULT 'assigned' AFTER `assigned_at`;

-- Step 3: Set all existing records to 'assigned' status (they're already in use)
UPDATE `institution_printer_assignments` 
SET `status` = 'assigned';

-- Verification: Check the updated table structure
DESCRIBE `institution_printer_assignments`;

-- Sample query to view assignment statuses
SELECT 
    cpa.id,
    cpa.institution_id,
    cpa.printer_id,
    cpa.assigned_at,
    cpa.status,
    i.name as institution_name,
    p.model as printer_model
FROM institution_printer_assignments cpa
JOIN institutions i ON cpa.institution_id = i.institution_id
JOIN printers p ON cpa.printer_id = p.id
ORDER BY cpa.assigned_at DESC;
