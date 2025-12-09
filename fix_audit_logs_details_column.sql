-- Fix audit_logs.details column size to handle large data like base64 images
-- Change from TEXT (65KB) to LONGTEXT (4GB) to prevent "Data too long" errors

ALTER TABLE audit_logs 
MODIFY COLUMN details LONGTEXT;

-- Verify the change
DESCRIBE audit_logs;
