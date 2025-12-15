-- ========================================================================
-- CRITICAL DATABASE MIGRATION - ServiceEase
-- Date: December 16, 2025
-- Description: Fix service_items_used schema and service_requests status
-- ========================================================================

-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS MIGRATION!
-- Run these commands in MySQL Workbench one section at a time

USE railway;

-- ========================================================================
-- MIGRATION 1: Add service_type to service_items_used
-- ========================================================================

-- Step 1: Add service_type column (allow NULL temporarily)
ALTER TABLE service_items_used 
ADD COLUMN service_type ENUM('service_request', 'maintenance_service') NULL
AFTER service_id;

-- Step 2: Verify existing data
-- RUN THIS FIRST TO SEE WHAT DATA EXISTS:
SELECT 
    siu.id,
    siu.service_id,
    siu.item_id,
    siu.quantity_used,
    CASE 
        WHEN sr.id IS NOT NULL THEN 'service_request'
        WHEN ms.id IS NOT NULL THEN 'maintenance_service'
        ELSE 'UNKNOWN'
    END as should_be_service_type,
    sr.request_number as sr_number,
    ms.id as ms_id
FROM service_items_used siu
LEFT JOIN service_requests sr ON siu.service_id = sr.id
LEFT JOIN maintenance_services ms ON siu.service_id = ms.id
ORDER BY siu.id;

-- Step 3: Update existing records based on which table has matching ID
-- This updates records that match service_requests
UPDATE service_items_used siu
INNER JOIN service_requests sr ON siu.service_id = sr.id
SET siu.service_type = 'service_request'
WHERE siu.service_type IS NULL;

-- This updates records that match maintenance_services
UPDATE service_items_used siu
INNER JOIN maintenance_services ms ON siu.service_id = ms.id
SET siu.service_type = 'maintenance_service'
WHERE siu.service_type IS NULL;

-- Step 4: Check if any records are still NULL (orphaned records)
SELECT * FROM service_items_used WHERE service_type IS NULL;

-- If orphaned records exist, you need to either:
-- A) Delete them: DELETE FROM service_items_used WHERE service_type IS NULL;
-- B) Or manually assign them to correct service_type

-- Step 5: Make service_type NOT NULL (only after all records are updated)
ALTER TABLE service_items_used 
MODIFY service_type ENUM('service_request', 'maintenance_service') NOT NULL;

-- Step 6: Add composite index for performance
ALTER TABLE service_items_used
ADD INDEX idx_service_type_id (service_type, service_id);

-- Step 7: Verify the migration
DESCRIBE service_items_used;

-- ========================================================================
-- MIGRATION 2: Add 'rejected' status to service_requests
-- ========================================================================

ALTER TABLE service_requests 
MODIFY COLUMN status ENUM(
    'pending',
    'assigned',
    'in_progress',
    'pending_approval',
    'completed',
    'rejected',
    'cancelled'
) NOT NULL DEFAULT 'pending';

-- Verify the change
SHOW COLUMNS FROM service_requests LIKE 'status';

-- ========================================================================
-- MIGRATION 3: Add validation triggers (OPTIONAL - Recommended)
-- ========================================================================

DELIMITER //

-- Trigger to validate service_approvals references
DROP TRIGGER IF EXISTS validate_service_approvals_insert//
CREATE TRIGGER validate_service_approvals_insert
BEFORE INSERT ON service_approvals
FOR EACH ROW
BEGIN
    DECLARE service_exists INT DEFAULT 0;
    
    IF NEW.service_type = 'service_request' THEN
        SELECT COUNT(*) INTO service_exists 
        FROM service_requests 
        WHERE id = NEW.service_id;
        
        IF service_exists = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Invalid service_id: service_request does not exist';
        END IF;
        
    ELSEIF NEW.service_type = 'maintenance_service' THEN
        SELECT COUNT(*) INTO service_exists 
        FROM maintenance_services 
        WHERE id = NEW.service_id;
        
        IF service_exists = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Invalid service_id: maintenance_service does not exist';
        END IF;
    END IF;
END//

-- Trigger to validate service_items_used references
DROP TRIGGER IF EXISTS validate_service_items_used_insert//
CREATE TRIGGER validate_service_items_used_insert
BEFORE INSERT ON service_items_used
FOR EACH ROW
BEGIN
    DECLARE service_exists INT DEFAULT 0;
    
    IF NEW.service_type = 'service_request' THEN
        SELECT COUNT(*) INTO service_exists 
        FROM service_requests 
        WHERE id = NEW.service_id;
        
        IF service_exists = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Invalid service_id: service_request does not exist';
        END IF;
        
    ELSEIF NEW.service_type = 'maintenance_service' THEN
        SELECT COUNT(*) INTO service_exists 
        FROM maintenance_services 
        WHERE id = NEW.service_id;
        
        IF service_exists = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Invalid service_id: maintenance_service does not exist';
        END IF;
    END IF;
END//

DELIMITER ;

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Check service_items_used structure
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'service_items_used'
ORDER BY ORDINAL_POSITION;

-- Check all indexes on service_items_used
SHOW INDEXES FROM service_items_used;

-- Check service_requests status enum
SHOW COLUMNS FROM service_requests LIKE 'status';

-- Verify triggers were created
SHOW TRIGGERS WHERE `Table` IN ('service_approvals', 'service_items_used');

-- Check data integrity
SELECT 
    'service_requests' as source_table,
    COUNT(DISTINCT siu.service_id) as items_count
FROM service_items_used siu
WHERE siu.service_type = 'service_request'
UNION ALL
SELECT 
    'maintenance_services' as source_table,
    COUNT(DISTINCT siu.service_id) as items_count
FROM service_items_used siu
WHERE siu.service_type = 'maintenance_service';

-- ========================================================================
-- END OF MIGRATION
-- ========================================================================

-- Success message
SELECT 'Migration completed successfully!' as status;
