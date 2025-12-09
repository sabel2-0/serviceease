-- Add completion_photo column to maintenance_services table
ALTER TABLE maintenance_services 
ADD COLUMN completion_photo VARCHAR(500) AFTER parts_used;
