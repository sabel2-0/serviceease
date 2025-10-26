CREATE TABLE IF NOT EXISTS voluntary_services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL,
    printer_id INT NOT NULL,
    institution_id VARCHAR(50) NOT NULL,
    
    -- Service Details
    service_description TEXT NOT NULL,
    parts_used TEXT,
    time_spent INT COMMENT 'Time spent in minutes',
    before_photos TEXT COMMENT 'JSON array of photo URLs',
    after_photos TEXT COMMENT 'JSON array of photo URLs',
    
    -- Approval Status
    status ENUM('pending_coordinator', 'coordinator_approved', 'pending_requester', 'completed', 'rejected') DEFAULT 'pending_coordinator',
    coordinator_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requester_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    
    -- Review Notes
    coordinator_notes TEXT,
    requester_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coordinator_reviewed_at TIMESTAMP NULL,
    coordinator_reviewed_by INT NULL,
    requester_reviewed_at TIMESTAMP NULL,
    requester_reviewed_by INT NULL,
    completed_at TIMESTAMP NULL,
    
    -- Foreign Keys
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (requester_reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_technician (technician_id),
    INDEX idx_printer (printer_id),
    INDEX idx_institution (institution_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
