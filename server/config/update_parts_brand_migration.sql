-- Migration to add brand field and remove compatible_brand_model field
-- Also update category enum to include new categories

-- First, add the brand column
ALTER TABLE printer_parts 
ADD COLUMN brand VARCHAR(255) AFTER name;

-- Update the category enum to include new categories
ALTER TABLE printer_parts 
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
    'other-consumable'
) NOT NULL;

-- If there are any columns we need to remove (like compatible_printers), uncomment below:
-- ALTER TABLE printer_parts DROP COLUMN IF EXISTS compatible_printers;
-- ALTER TABLE printer_parts DROP COLUMN IF EXISTS compatible_brand_model;

-- Update any existing records if needed
-- For example, if you want to migrate data from compatible_printers to brand:
-- UPDATE printer_parts SET brand = compatible_printers WHERE compatible_printers IS NOT NULL;