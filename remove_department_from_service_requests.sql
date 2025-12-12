-- =====================================================
-- Remove department column from service_requests table
-- =====================================================
-- 
-- REASON: The department field was causing redundancy. Printers already have
-- location and department fields, so service_requests should reference the
-- printers table instead of storing duplicate data.
--
-- CHANGES MADE:
-- 1. All backend queries updated to use printers.department
-- 2. Frontend updated to display department from printers table
-- 3. Institution admins can update department in printer details modal
-- 4. Department is saved to printers table when submitting service requests
-- 5. Technician history shows printer department
-- 6. Admin technician progress shows printer department
-- 7. Institution user/admin history shows printer department
--
-- BACKUP COMMAND (run this first to backup the column data):
-- CREATE TABLE service_requests_department_backup AS
-- SELECT id, department FROM service_requests WHERE department IS NOT NULL;
--
-- =====================================================

-- Drop the department column from service_requests table
ALTER TABLE service_requests DROP COLUMN IF EXISTS department;

-- Verify the column was dropped
DESCRIBE service_requests;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- 1. Verify all service requests have printer associations
SELECT COUNT(*) as total_requests,
       COUNT(printer_id) as with_printer,
       COUNT(*) - COUNT(printer_id) as without_printer
FROM service_requests;

-- 2. Check if printers have department information
SELECT COUNT(*) as total_printers,
       COUNT(department) as with_department,
       COUNT(*) - COUNT(department) as without_department
FROM printers;

-- 3. Sample service request with printer department
SELECT sr.id, sr.request_number, sr.description, sr.location,
       p.name as printer_name, p.location as printer_location, p.department as printer_department
FROM service_requests sr
LEFT JOIN printers p ON sr.printer_id = p.id
LIMIT 10;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
