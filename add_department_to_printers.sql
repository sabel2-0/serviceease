-- Add department column to printers table
-- This allows tracking which department/office each printer belongs to
-- Useful for schools (e.g., "Principal's Office", "IT Department", "Library")
-- Useful for companies (e.g., "HR Department", "Finance", "Marketing")
-- Useful for government institutions (e.g., "Records Office", "Admin Division")

ALTER TABLE printers 
ADD COLUMN department VARCHAR(255) DEFAULT NULL 
COMMENT 'Department or office where printer is located' 
AFTER location;

-- Update the updated_at timestamp
UPDATE printers SET updated_at = NOW() WHERE department IS NULL;

SELECT 'Department column added to printers table successfully!' as message;
