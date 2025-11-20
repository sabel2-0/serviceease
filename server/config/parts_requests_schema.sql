-- Parts requests table schema
CREATE TABLE IF NOT EXISTS parts_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT NOT NULL,
    technician_id INT NOT NULL,
    quantity_requested INT NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
    admin_response TEXT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (part_id) REFERENCES printer_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_part_id (part_id),
    INDEX idx_technician_id (technician_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- Insert some sample data for testing (optional)
-- INSERT INTO parts_requests (part_id, technician_id, quantity_requested, reason, priority, status) VALUES
-- (1, 1, 5, 'Need ink cartridges for HP printer maintenance', 'medium', 'pending'),
-- (2, 1, 2, 'Toner cartridge replacement for urgent service request', 'high', 'pending');