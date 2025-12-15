-- Migration: Rename parts_used to items_used in maintenance_services table
-- Date: 2025-12-15
-- Purpose: Align column naming with printer_items table and items_request terminology

-- Step 1: Backup the table
CREATE TABLE maintenance_services_backup_parts_rename AS SELECT * FROM maintenance_services;

-- Step 2: Rename the column
ALTER TABLE maintenance_services 
CHANGE COLUMN parts_used items_used TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verification
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'maintenance_services' 
    AND COLUMN_NAME = 'items_used';

-- Success message
SELECT 'Migration complete: parts_used renamed to items_used in maintenance_services table' as status;
