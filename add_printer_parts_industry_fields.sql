-- Add printer industry standard fields to printer_parts table
-- These fields are essential for proper inventory management in the printer service industry

USE serviceease;

-- Add page_yield column for toner/ink cartridges (standard industry metric)
ALTER TABLE `printer_parts` 
ADD COLUMN `page_yield` INT DEFAULT NULL COMMENT 'Approximate number of pages the consumable can print' AFTER `unit`;

-- Add ink_volume column for ink bottles (measured in ml)
ALTER TABLE `printer_parts` 
ADD COLUMN `ink_volume` DECIMAL(10,2) DEFAULT NULL COMMENT 'Volume of ink in milliliters for ink bottles' AFTER `page_yield`;

-- Add color column for ink/toner (important for matching and ordering)
ALTER TABLE `printer_parts` 
ADD COLUMN `color` VARCHAR(50) DEFAULT NULL COMMENT 'Color of ink/toner (black, cyan, magenta, yellow, etc.)' AFTER `ink_volume`;

-- Verify the changes
SHOW COLUMNS FROM `printer_parts`;
