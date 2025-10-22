-- Technician Inventory Schema
-- This table tracks parts assigned to individual technicians

CREATE TABLE IF NOT EXISTS technician_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    assigned_by INT NULL, -- Admin who assigned the parts
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT NULL, -- Optional notes about the assignment
    
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES printer_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure one record per technician-part combination
    UNIQUE KEY unique_technician_part (technician_id, part_id),
    
    INDEX idx_technician_id (technician_id),
    INDEX idx_part_id (part_id),
    INDEX idx_assigned_at (assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;