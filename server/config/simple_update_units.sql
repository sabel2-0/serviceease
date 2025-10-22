-- Simple update to add units support

-- Check if unit column exists in printer_parts
SHOW COLUMNS FROM printer_parts LIKE 'unit';

-- Add unit column to printer_parts
ALTER TABLE printer_parts ADD COLUMN unit VARCHAR(50) DEFAULT 'pieces';

-- Check if job_order_parts table exists and create it if needed
CREATE TABLE IF NOT EXISTS job_order_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_order_id INT NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity_used INT NOT NULL,
    unit VARCHAR(50) DEFAULT 'pieces',
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_order_id) REFERENCES job_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Update some common parts with appropriate units
UPDATE printer_parts SET unit = 'milliliters' WHERE name LIKE '%ink%' OR name LIKE '%toner%';
UPDATE printer_parts SET unit = 'sheets' WHERE name LIKE '%paper%';
UPDATE printer_parts SET unit = 'pieces' WHERE unit = 'pieces';