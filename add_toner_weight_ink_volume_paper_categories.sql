-- ===================================================================
-- ADD TONER WEIGHT AND PAPER CATEGORIES
-- ===================================================================
-- This migration adds:
-- 1. toner_weight column for toner cartridges (in grams)
-- 2. A4 and A3 paper categories
-- Note: ink_volume column already exists and will be used for BOTH
--       ink bottles AND ink cartridges (category distinguishes them)
-- ===================================================================

-- Step 1: Add toner_weight column
ALTER TABLE printer_items 
ADD COLUMN toner_weight DECIMAL(10,2) DEFAULT NULL COMMENT 'Weight of toner in grams for toner cartridges'
AFTER ink_volume;

-- Step 2: Modify category enum to include A4 and A3 paper
ALTER TABLE printer_items 
MODIFY COLUMN category ENUM(
    'toner',
    'drum',
    'fuser',
    'roller',
    'ink',
    'ink-bottle',
    'printhead',
    'transfer-belt',
    'maintenance-unit',
    'power-board',
    'mainboard',
    'drum-cartridge',
    'maintenance-box',
    'other',
    'other-consumable',
    'paper',
    'paper-a4',
    'paper-a3',
    'cleaning-supplies',
    'tools',
    'cables',
    'batteries',
    'lubricants',
    'replacement-parts',
    'software',
    'labels'
) NOT NULL DEFAULT 'other';

-- Verification queries
SELECT 'Columns added successfully!' as Status;
DESCRIBE printer_items;
