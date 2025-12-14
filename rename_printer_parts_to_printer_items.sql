-- =====================================================
-- RENAME printer_parts TO printer_items MIGRATION
-- =====================================================
-- Purpose: Rename printer_parts table to printer_items
--          to better reflect that it contains both parts
--          and consumables (category field)
-- Date: 2025-12-14
-- =====================================================

USE serviceease;

-- Step 1: Check current table structure
SELECT 'Current Tables Before Migration:' as status;
SHOW TABLES LIKE '%printer%';

-- Step 2: Check foreign key constraints before renaming
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    REFERENCED_TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'printer_parts'
   OR TABLE_NAME = 'printer_parts'
   OR REFERENCED_TABLE_NAME = 'printer_parts_transactions'
   OR TABLE_NAME = 'printer_parts_transactions';

-- Step 3: Rename the transactions table first
SELECT 'Renaming printer_parts_transactions to printer_items_transactions...' as status;
RENAME TABLE printer_parts_transactions TO printer_items_transactions;

-- Step 4: Rename the main table
SELECT 'Renaming printer_parts to printer_items...' as status;
RENAME TABLE printer_parts TO printer_items;

-- Step 5: Verify foreign key constraints were automatically updated
SELECT 'Checking foreign key constraints after migration...' as status;
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    REFERENCED_TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'printer_items'
   OR TABLE_NAME = 'printer_items'
   OR REFERENCED_TABLE_NAME = 'printer_items_transactions'
   OR TABLE_NAME = 'printer_items_transactions';

-- Step 6: Verify data integrity
SELECT 'Verification of migrated tables:' as status;
SELECT 'printer_items' as table_name, COUNT(*) as record_count FROM printer_items
UNION ALL
SELECT 'printer_items_transactions' as table_name, COUNT(*) as record_count FROM printer_items_transactions;

-- Step 7: Check table structure
SELECT 'Table structure verification:' as status;
SHOW CREATE TABLE printer_items;
SHOW CREATE TABLE printer_items_transactions;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The following tables have been renamed:
-- 1. printer_parts → printer_items
-- 2. printer_parts_transactions → printer_items_transactions
--
-- All foreign key constraints have been automatically
-- updated by MySQL to reference the new table names.
--
-- Next steps:
-- 1. Update all application code references
-- 2. Update any stored procedures or views
-- 3. Update documentation
-- =====================================================

SELECT '✅ Migration completed successfully!' as status,
       NOW() as completion_time;
