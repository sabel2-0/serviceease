-- =============================================
-- Migration: Rename inventory_items to printers
-- Description: Rename table and all foreign key columns for capstone project clarity
-- =============================================

USE serviceease;

-- Step 1: Drop foreign key constraints that reference inventory_items
ALTER TABLE institution_printer_assignments DROP FOREIGN KEY fk_cpa_item;
ALTER TABLE service_requests DROP FOREIGN KEY fk_sr_inventory_item;
ALTER TABLE user_printer_assignments DROP FOREIGN KEY fk_upa_item;

-- Step 2: Rename the table
RENAME TABLE inventory_items TO printers;

-- Step 3: Rename foreign key columns
ALTER TABLE institution_printer_assignments CHANGE inventory_item_id printer_id INT NOT NULL;
ALTER TABLE service_requests CHANGE inventory_item_id printer_id INT DEFAULT NULL;
ALTER TABLE user_printer_assignments CHANGE inventory_item_id printer_id INT NOT NULL;

-- Step 4: Recreate foreign key constraints with new names
ALTER TABLE institution_printer_assignments 
    ADD CONSTRAINT fk_ipa_printer 
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE;

ALTER TABLE service_requests 
    ADD CONSTRAINT fk_sr_printer 
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL;

ALTER TABLE user_printer_assignments 
    ADD CONSTRAINT fk_upa_printer 
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE;

-- Verification queries (uncommented to run)
SELECT 'Printers table exists:' as check_name, COUNT(*) as result FROM information_schema.tables WHERE table_schema = 'serviceease' AND table_name = 'printers';
SELECT 'Foreign keys updated:' as check_name, COUNT(*) as result FROM information_schema.key_column_usage WHERE table_schema = 'serviceease' AND referenced_table_name = 'printers';
