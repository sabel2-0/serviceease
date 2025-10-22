-- Create table to track parts/consumables used in service requests
CREATE TABLE IF NOT EXISTS service_parts_used (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_request_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity_used INT NOT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    used_by INT NOT NULL,  -- technician who used the part
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_service_request (service_request_id),
    INDEX idx_part_id (part_id),
    INDEX idx_used_by (used_by),
    
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES printer_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table to track service approval workflow
CREATE TABLE IF NOT EXISTS service_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_request_id INT NOT NULL,
    status ENUM('pending_approval', 'approved', 'rejected', 'revision_requested') NOT NULL,
    coordinator_id INT,  -- coordinator who approved/rejected
    technician_notes TEXT,  -- notes from technician when submitting for approval
    coordinator_notes TEXT,  -- notes from coordinator when approving/rejecting
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    
    INDEX idx_service_request (service_request_id),
    INDEX idx_coordinator (coordinator_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at),
    
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add new status options to service_requests table
ALTER TABLE service_requests 
MODIFY COLUMN status ENUM('pending', 'assigned', 'in_progress', 'pending_approval', 'completed', 'cancelled') NOT NULL DEFAULT 'pending';