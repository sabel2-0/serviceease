-- Update parts tables to support units and improve job order tracking

-- Add unit column to printer_parts if it doesn't exist
ALTER TABLE printer_parts 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pieces' AFTER stock;

-- Add unit column to job_order_parts if it doesn't exist
ALTER TABLE job_order_parts 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pieces' AFTER quantity_used;

-- Remove client signature and name columns from service_requests (if they exist)
-- These are now handled differently since we removed client acknowledgment
SET @sql = (SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'ALTER TABLE service_requests DROP COLUMN client_signature'
    ELSE 'SELECT ''Column client_signature does not exist'''
END
FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'service_requests' 
AND COLUMN_NAME = 'client_signature' 
AND TABLE_SCHEMA = DATABASE());

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'ALTER TABLE service_requests DROP COLUMN client_name'
    ELSE 'SELECT ''Column client_name does not exist'''
END
FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'service_requests' 
AND COLUMN_NAME = 'client_name' 
AND TABLE_SCHEMA = DATABASE());

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update job_orders table to remove client signature columns
SET @sql = (SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'ALTER TABLE job_orders DROP COLUMN client_signature'
    ELSE 'SELECT ''Column client_signature does not exist'''
END
FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'job_orders' 
AND COLUMN_NAME = 'client_signature' 
AND TABLE_SCHEMA = DATABASE());

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'ALTER TABLE job_orders DROP COLUMN client_name'
    ELSE 'SELECT ''Column client_name does not exist'''
END
FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'job_orders' 
AND COLUMN_NAME = 'client_name' 
AND TABLE_SCHEMA = DATABASE());

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update some common parts with appropriate units
UPDATE printer_parts SET unit = 'milliliters' WHERE name LIKE '%ink%' OR name LIKE '%toner%';
UPDATE printer_parts SET unit = 'sheets' WHERE name LIKE '%paper%';
UPDATE printer_parts SET unit = 'pieces' WHERE unit IS NULL OR unit = '';

-- Update existing job_order_parts to have default units
UPDATE job_order_parts SET unit = 'pieces' WHERE unit IS NULL OR unit = '';