-- Check for notifications with NULL user_id
SELECT 
    id,
    type,
    title,
    user_id,
    sender_id,
    reference_type,
    reference_id,
    created_at
FROM notifications
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Check service_request notifications specifically
SELECT 
    n.id,
    n.type,
    n.title,
    n.user_id,
    n.sender_id,
    n.reference_type,
    n.reference_id,
    sr.assigned_technician_id,
    sr.request_number,
    sr.status
FROM notifications n
LEFT JOIN service_requests sr ON n.reference_type = 'service_request' AND n.reference_id = sr.id
WHERE n.reference_type = 'service_request'
  AND n.user_id IS NULL
ORDER BY n.created_at DESC;

-- Fix NULL user_id for service_request notifications by setting them to the assigned technician
UPDATE notifications n
INNER JOIN service_requests sr ON n.reference_type = 'service_request' AND n.reference_id = sr.id
SET n.user_id = sr.assigned_technician_id
WHERE n.user_id IS NULL
  AND n.reference_type = 'service_request'
  AND sr.assigned_technician_id IS NOT NULL;

-- Verify the fix
SELECT 
    COUNT(*) as remaining_null_user_id_count
FROM notifications
WHERE user_id IS NULL;
