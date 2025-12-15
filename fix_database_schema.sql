-- =====================================================
-- CRITICAL DATABASE SCHEMA FIXES
-- Run these in order in MySQL Workbench
-- =====================================================

USE railway;

-- =====================================================
-- FIX #1: Add service_type to service_items_used
-- This is CRITICAL - without it, items from service_requests
-- and maintenance_services with the same ID will be confused
-- =====================================================

-- Step 1: Add the column (nullable first)
ALTER TABLE service_items_used 
ADD COLUMN service_type ENUM('service_request', 'maintenance_service') NULL
AFTER service_id;

-- Step 2: Update existing records
-- Check your existing data first with:
-- SELECT siu.*, sr.id as sr_id, ms.id as ms_id 
-- FROM service_items_used siu
-- LEFT JOIN service_requests sr ON siu.service_id = sr.id
-- LEFT JOIN maintenance_services ms ON siu.service_id = ms.id;

-- Based on your current data, update the service_type:
-- For service requests (IDs 1, 2, 3 from service_requests table)
UPDATE service_items_used siu
INNER JOIN service_requests sr ON siu.service_id = sr.id
SET siu.service_type = 'service_request';

-- For maintenance services (IDs 1, 2, 3, 4 from maintenance_services table)  
UPDATE service_items_used siu
INNER JOIN maintenance_services ms ON siu.service_id = ms.id
SET siu.service_type = 'maintenance_service'
WHERE siu.service_type IS NULL;  -- Only update if not already set

-- Step 3: Make the column NOT NULL
ALTER TABLE service_items_used 
MODIFY service_type ENUM('service_request', 'maintenance_service') NOT NULL;

-- Step 4: Add composite index for better query performance
ALTER TABLE service_items_used
ADD INDEX idx_service_type_id (service_type, service_id);

-- =====================================================
-- FIX #2: Add 'rejected' status to service_requests
-- Currently service_requests can't be marked as rejected
-- =====================================================

ALTER TABLE service_requests 
MODIFY status ENUM(
  'pending',
  'assigned',
  'in_progress',
  'pending_approval',
  'completed',
  'rejected',
  'cancelled'
) NOT NULL DEFAULT 'pending';

-- =====================================================
-- FIX #3: Add triggers to prevent orphan records
-- These ensure service_id always references a valid service
-- =====================================================

DELIMITER //

-- Trigger for service_approvals INSERT
DROP TRIGGER IF EXISTS before_insert_service_approvals//
CREATE TRIGGER before_insert_service_approvals
BEFORE INSERT ON service_approvals
FOR EACH ROW
BEGIN
  DECLARE service_exists INT;
  
  IF NEW.service_type = 'service_request' THEN
    SELECT COUNT(*) INTO service_exists 
    FROM service_requests WHERE id = NEW.service_id;
    
    IF service_exists = 0 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in service_requests table';
    END IF;
    
  ELSEIF NEW.service_type = 'maintenance_service' THEN
    SELECT COUNT(*) INTO service_exists 
    FROM maintenance_services WHERE id = NEW.service_id;
    
    IF service_exists = 0 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in maintenance_services table';
    END IF;
  END IF;
END//

-- Trigger for service_items_used INSERT
DROP TRIGGER IF EXISTS before_insert_service_items_used//
CREATE TRIGGER before_insert_service_items_used
BEFORE INSERT ON service_items_used
FOR EACH ROW
BEGIN
  DECLARE service_exists INT;
  
  IF NEW.service_type = 'service_request' THEN
    SELECT COUNT(*) INTO service_exists 
    FROM service_requests WHERE id = NEW.service_id;
    
    IF service_exists = 0 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in service_requests table';
    END IF;
    
  ELSEIF NEW.service_type = 'maintenance_service' THEN
    SELECT COUNT(*) INTO service_exists 
    FROM maintenance_services WHERE id = NEW.service_id;
    
    IF service_exists = 0 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in maintenance_services table';
    END IF;
  END IF;
END//

DELIMITER ;

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================

-- Check service_items_used has service_type populated correctly
SELECT 
  siu.id,
  siu.service_id,
  siu.service_type,
  siu.item_id,
  siu.quantity_used,
  CASE 
    WHEN siu.service_type = 'service_request' THEN sr.request_number
    WHEN siu.service_type = 'maintenance_service' THEN CONCAT('MS-', ms.id)
    ELSE 'ORPHAN'
  END as service_reference
FROM service_items_used siu
LEFT JOIN service_requests sr ON siu.service_id = sr.id AND siu.service_type = 'service_request'
LEFT JOIN maintenance_services ms ON siu.service_id = ms.id AND siu.service_type = 'maintenance_service';

-- Check for any NULL service_types (should be empty)
SELECT * FROM service_items_used WHERE service_type IS NULL;

-- Check service_requests status options
SHOW COLUMNS FROM service_requests LIKE 'status';

-- =====================================================
-- DONE! Schema is now consistent
-- =====================================================
