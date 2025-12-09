-- Migration: Rename voluntary_services to maintenance_services and add completion_photo column
-- Date: 2025-12-07

-- Step 1: Add completion_photo column to voluntary_services table
ALTER TABLE voluntary_services 
ADD COLUMN completion_photo VARCHAR(500) AFTER parts_used;

-- Step 2: Rename the table from voluntary_services to maintenance_services
RENAME TABLE voluntary_services TO maintenance_services;

-- Step 3: Update notification types from 'voluntary_service' to 'maintenance_service'
UPDATE notifications 
SET type = 'maintenance_service' 
WHERE type = 'voluntary_service';

-- Step 4: Update notification titles containing "Voluntary Service" to "Maintenance Service"
UPDATE notifications 
SET title = REPLACE(title, 'Voluntary Service', 'Maintenance Service'),
    message = REPLACE(message, 'voluntary service', 'maintenance service')
WHERE type = 'maintenance_service';

-- Verify the changes
SELECT 'Table renamed successfully' AS Status;
SELECT COUNT(*) as maintenance_services_count FROM maintenance_services;
SELECT COUNT(*) as updated_notifications_count FROM notifications WHERE type = 'maintenance_service';
