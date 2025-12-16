-- ===================================================================
-- ADD PARTIAL CONSUMPTION TRACKING FOR CONSUMABLES
-- ===================================================================
-- This migration enables tracking of partial consumption for ink and toner
-- Example: Technician uses 50ml out of 100ml ink bottle
-- ===================================================================

-- Step 1: Add partial consumption tracking to service_items_used
ALTER TABLE service_items_used
ADD COLUMN consumption_type ENUM('full', 'partial') DEFAULT 'full' COMMENT 'Whether item was fully consumed or partially used'
AFTER quantity_used;

ALTER TABLE service_items_used
ADD COLUMN amount_consumed DECIMAL(10,2) DEFAULT NULL COMMENT 'Actual amount consumed in ml (ink) or grams (toner)'
AFTER consumption_type;

-- Step 2: Add remaining amount tracking to printer_items
ALTER TABLE printer_items
ADD COLUMN remaining_volume DECIMAL(10,2) DEFAULT NULL COMMENT 'Remaining ml for opened ink bottles/cartridges'
AFTER ink_volume;

ALTER TABLE printer_items
ADD COLUMN remaining_weight DECIMAL(10,2) DEFAULT NULL COMMENT 'Remaining grams for opened toner cartridges'
AFTER toner_weight;

ALTER TABLE printer_items
ADD COLUMN is_opened TINYINT(1) DEFAULT 0 COMMENT 'Whether this is a partially used/opened item'
AFTER remaining_weight;

-- Step 3: Update existing full consumption records
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

-- Verification
SELECT 'Partial consumption tracking columns added successfully!' as Status;
DESCRIBE service_items_used;
DESCRIBE printer_items;
