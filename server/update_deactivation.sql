UPDATE institutions 
SET deactivated_at = NOW() 
WHERE status = 'deactivated' AND deactivated_at IS NULL;