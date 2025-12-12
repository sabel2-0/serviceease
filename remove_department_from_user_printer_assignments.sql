-- Remove department column from user_printer_assignments table
-- Department is now managed at printer level (printers.department)
-- Date: 2025-12-12
-- Reason: Consolidate department management to printers table only

-- Check if column exists before dropping
SET @dbname = DATABASE();
SET @tablename = 'user_printer_assignments';
SET @columnname = 'department';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'ALTER TABLE user_printer_assignments DROP COLUMN department;',
  'SELECT "Column does not exist, no action needed.";'
));

PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Verification query
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_printer_assignments'
ORDER BY ORDINAL_POSITION;
