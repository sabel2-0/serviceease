-- ===================================================================
-- ADD CONSUMPTION TRACKING TO TECHNICIAN_INVENTORY
-- ===================================================================
-- Each technician's inventory item can be independently opened/consumed
-- ===================================================================

-- Check and add remaining_volume column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'technician_inventory' 
    AND COLUMN_NAME = 'remaining_volume');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE technician_inventory ADD COLUMN remaining_volume DECIMAL(10,2) DEFAULT NULL COMMENT ''Remaining ml for opened ink bottles/cartridges in technician inventory'' AFTER quantity',
    'SELECT ''Column remaining_volume already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add remaining_weight column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'technician_inventory' 
    AND COLUMN_NAME = 'remaining_weight');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE technician_inventory ADD COLUMN remaining_weight DECIMAL(10,2) DEFAULT NULL COMMENT ''Remaining grams for opened toner cartridges in technician inventory'' AFTER remaining_volume',
    'SELECT ''Column remaining_weight already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add is_opened column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'technician_inventory' 
    AND COLUMN_NAME = 'is_opened');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE technician_inventory ADD COLUMN is_opened TINYINT(1) DEFAULT 0 COMMENT ''Whether this technician inventory item is opened/partially consumed'' AFTER remaining_weight',
    'SELECT ''Column is_opened already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification
SELECT 'Consumption tracking added to technician_inventory successfully!' as Status;
DESCRIBE technician_inventory;
