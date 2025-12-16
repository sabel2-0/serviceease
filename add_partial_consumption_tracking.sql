-- ===================================================================
-- ADD PARTIAL CONSUMPTION TRACKING FOR CONSUMABLES
-- ===================================================================
-- This migration enables tracking of partial consumption for ink and toner
-- Example: Technician uses 50ml out of 100ml ink bottle
-- ===================================================================

-- Step 1: Add partial consumption tracking to service_items_used
-- Check and add consumption_type column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'service_items_used' 
    AND COLUMN_NAME = 'consumption_type');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE service_items_used ADD COLUMN consumption_type ENUM(''full'', ''partial'') DEFAULT ''full'' COMMENT ''Whether item was fully consumed or partially used'' AFTER quantity_used',
    'SELECT ''Column consumption_type already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add amount_consumed column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'service_items_used' 
    AND COLUMN_NAME = 'amount_consumed');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE service_items_used ADD COLUMN amount_consumed DECIMAL(10,2) DEFAULT NULL COMMENT ''Actual amount consumed in ml (ink) or grams (toner)'' AFTER consumption_type',
    'SELECT ''Column amount_consumed already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add remaining amount tracking to printer_items
-- Check and add remaining_volume column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'printer_items' 
    AND COLUMN_NAME = 'remaining_volume');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE printer_items ADD COLUMN remaining_volume DECIMAL(10,2) DEFAULT NULL COMMENT ''Remaining ml for opened ink bottles/cartridges'' AFTER ink_volume',
    'SELECT ''Column remaining_volume already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add remaining_weight column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'printer_items' 
    AND COLUMN_NAME = 'remaining_weight');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE printer_items ADD COLUMN remaining_weight DECIMAL(10,2) DEFAULT NULL COMMENT ''Remaining grams for opened toner cartridges'' AFTER toner_weight',
    'SELECT ''Column remaining_weight already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add is_opened column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'printer_items' 
    AND COLUMN_NAME = 'is_opened');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE printer_items ADD COLUMN is_opened TINYINT(1) DEFAULT 0 COMMENT ''Whether this is a partially used/opened item'' AFTER remaining_weight',
    'SELECT ''Column is_opened already exists'' AS Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Update existing full consumption records
-- Temporarily disable safe update mode for bulk update
SET SQL_SAFE_UPDATES = 0;

-- Set amount_consumed based on item type for existing records
UPDATE service_items_used siu
INNER JOIN printer_items pi ON siu.item_id = pi.id
SET siu.amount_consumed = CASE
    WHEN pi.category = 'ink-bottle' OR pi.category = 'ink' THEN pi.ink_volume
    WHEN pi.category = 'toner' THEN pi.toner_weight
    ELSE NULL
END,
siu.consumption_type = 'full'
WHERE siu.amount_consumed IS NULL 
AND (pi.category IN ('ink-bottle', 'ink', 'toner'));

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Verification
SELECT 'Partial consumption tracking columns added successfully!' as Status;
DESCRIBE service_items_used;
DESCRIBE printer_items;
