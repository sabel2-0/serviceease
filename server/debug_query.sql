-- Check Pajo institution
SELECT institution_id, name FROM institutions WHERE name LIKE '%pajo%' OR name LIKE '%Pajo%';

-- Check technician assignments for both users
SELECT ta.*, u.first_name, u.last_name, u.email, i.name as institution_name 
FROM technician_assignments ta 
JOIN users u ON ta.technician_id = u.id 
JOIN institutions i ON ta.institution_id = i.institution_id 
WHERE u.email IN ('markivan.storm@gmail.com', 'macgyro@gmail.com');

-- Check service requests from Pajo institution
SELECT sr.*, i.name as institution_name 
FROM service_requests sr 
JOIN institutions i ON sr.institution_id = i.institution_id 
WHERE i.name LIKE '%pajo%' OR i.name LIKE '%Pajo%';

-- Test the exact query used by the technician API for user ID 28 (macgyro)
SELECT 
    sr.id,
    sr.request_number,
    sr.institution_id,
    i.name as institution_name,
    sr.status,
    sr.priority,
    sr.location,
    sr.description as issue,
    sr.created_at,
    sr.updated_at,
    sr.inventory_item_id
FROM service_requests sr
JOIN institutions i ON sr.institution_id = i.institution_id
JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
WHERE ta.technician_id = 28 
AND ta.is_active = TRUE
ORDER BY sr.created_at DESC;