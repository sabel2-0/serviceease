-- Job Orders Schema for ServiceEase
-- This schema handles job completion records and parts tracking

-- Create job_orders table
CREATE TABLE IF NOT EXISTS job_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    technician_id INT NOT NULL,
    
    -- Service completion details
    actions_performed TEXT NOT NULL,
    additional_notes TEXT,
    
    -- Client acknowledgment
    client_name VARCHAR(255) NOT NULL,
    client_signature LONGTEXT NOT NULL, -- Base64 encoded signature image
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_request_id (request_id),
    INDEX idx_technician_id (technician_id),
    INDEX idx_created_at (created_at)
);

-- Create job_order_parts table for tracking parts used in each job
CREATE TABLE IF NOT EXISTS job_order_parts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_order_id INT NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity_used INT NOT NULL DEFAULT 1,
    recorded_by INT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (job_order_id) REFERENCES job_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_job_order_id (job_order_id),
    INDEX idx_part_name (part_name)
);

-- Update service_requests table to add new fields for enhanced tracking
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Create inventory tracking table for parts movement history
CREATE TABLE IF NOT EXISTS parts_inventory_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    part_id INT,
    part_name VARCHAR(255) NOT NULL,
    movement_type ENUM('stock_in', 'stock_out', 'adjustment') NOT NULL,
    quantity_change INT NOT NULL, -- Positive for additions, negative for usage
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_type ENUM('job_order', 'manual_adjustment', 'initial_stock') NOT NULL,
    reference_id INT, -- job_order_id, adjustment_id, etc.
    notes TEXT,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (part_id) REFERENCES printer_parts(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_part_id (part_id),
    INDEX idx_part_name (part_name),
    INDEX idx_movement_type (movement_type),
    INDEX idx_reference_type_id (reference_type, reference_id),
    INDEX idx_created_at (created_at)
);

-- Create trigger to automatically log inventory changes
DELIMITER //

CREATE TRIGGER IF NOT EXISTS log_parts_inventory_change
AFTER UPDATE ON printer_parts
FOR EACH ROW
BEGIN
    -- Only log if stock actually changed
    IF OLD.stock != NEW.stock THEN
        INSERT INTO parts_inventory_log (
            part_id,
            part_name,
            movement_type,
            quantity_change,
            previous_stock,
            new_stock,
            reference_type,
            notes,
            recorded_by
        ) VALUES (
            NEW.id,
            NEW.name,
            CASE 
                WHEN NEW.stock > OLD.stock THEN 'stock_in'
                ELSE 'stock_out'
            END,
            NEW.stock - OLD.stock,
            OLD.stock,
            NEW.stock,
            'manual_adjustment',
            CONCAT('Stock updated from ', OLD.stock, ' to ', NEW.stock),
            1 -- System user ID, should be replaced with actual user context
        );
    END IF;
END//

DELIMITER ;

-- Insert some sample printer parts if table is empty
INSERT IGNORE INTO printer_parts (name, category, stock) VALUES
('HP Toner Cartridge 85A', 'toner', 10),
('Canon Toner Cartridge 337', 'toner', 8),
('Brother Toner TN-2025', 'toner', 12),
('HP Drum Unit 85A', 'drum', 5),
('Canon Drum Unit 337', 'drum', 6),
('Fuser Unit HP LaserJet', 'fuser', 3),
('Pickup Roller HP', 'roller', 15),
('Transfer Roller Canon', 'roller', 10),
('Paper Feed Roller', 'roller', 20),
('Maintenance Kit HP', 'other', 4),
('Cleaning Kit Canon', 'other', 7),
('Power Supply Unit', 'other', 2);