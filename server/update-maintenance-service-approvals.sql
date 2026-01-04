-- Update existing service_approvals records for maintenance_service to populate technician_notes
-- from the service_description in maintenance_services table
UPDATE service_approvals sa
INNER JOIN maintenance_services ms ON sa.service_id = ms.id AND sa.service_type = 'maintenance_service'
SET sa.technician_notes = ms.service_description
WHERE sa.technician_notes IS NULL OR sa.technician_notes = '';
