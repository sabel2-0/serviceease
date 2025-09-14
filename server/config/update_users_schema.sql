-- Add institution_id column to users table if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "institution_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column already exists'",
  "ALTER TABLE users ADD COLUMN institution_id VARCHAR(50) NULL,
   ADD CONSTRAINT fk_users_institution 
   FOREIGN KEY (institution_id) 
   REFERENCES institutions(institution_id) 
   ON DELETE SET NULL"
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;