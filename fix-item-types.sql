-- Fix item_type for consumable categories
-- Run this SQL to correct items that were saved with wrong item_type

-- Update consumable categories to have item_type = 'consumable'
UPDATE printer_items 
SET item_type = 'consumable' 
WHERE category IN ('ink', 'ink-bottle', 'toner', 'drum-cartridge', 'maintenance-box', 'other-consumable');

-- Update part categories to have item_type = 'printer_part'
UPDATE printer_items 
SET item_type = 'printer_part' 
WHERE category IN ('printhead', 'drum', 'fuser', 'roller', 'transfer-belt', 'maintenance-unit', 'power-board', 'mainboard', 'other');

-- Verify the changes
SELECT id, name, category, item_type FROM printer_items;
