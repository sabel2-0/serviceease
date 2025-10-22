-- Create technician_assignments table to manage which technicians are assigned to which clients/institutions
CREATE TABLE IF NOT EXISTS technician_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL,
    institution_id VARCHAR(50) NOT NULL,
    assigned_by INT NOT NULL, -- admin who made the assignment
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure one active assignment per institution
    UNIQUE KEY unique_active_assignment (institution_id, is_active),
    
    -- Indexes for performance
    INDEX idx_technician_id (technician_id),
    INDEX idx_institution_id (institution_id),
    INDEX idx_is_active (is_active)
);

-- Create service_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    institution_id VARCHAR(50) NOT NULL,
    coordinator_id INT, -- who submitted the request
    assigned_technician_id INT, -- auto-assigned based on institution assignment
    
    -- Request details
    service_type ENUM('maintenance', 'repair', 'installation', 'consultation', 'training') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold', 'needs_reassignment') DEFAULT 'new',
    
    -- Equipment information
    equipment_type VARCHAR(100),
    equipment_model VARCHAR(100),
    equipment_serial VARCHAR(100),
    equipment_location VARCHAR(255),
    inventory_item_id INT, -- Link to inventory_items table
    
    -- Request description
    description TEXT NOT NULL,
    problem_description TEXT,
    requested_completion_date DATE,
    location VARCHAR(255), -- Room/area location
    
    -- Contact information
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    
    -- Resolution information
    resolution_notes TEXT,
    resolved_by INT,
    resolved_at TIMESTAMP NULL,
    client_signature LONGTEXT, -- Base64 encoded signature
    client_name VARCHAR(255), -- Client who signed off
    
    -- Timestamps for workflow tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL, -- When technician starts work
    completed_at TIMESTAMP NULL, -- When service is completed
    
    -- Foreign key constraints
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_institution_id (institution_id),
    INDEX idx_coordinator_id (coordinator_id),
    INDEX idx_assigned_technician (assigned_technician_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at)
);

-- Create service_request_history table for tracking status changes
CREATE TABLE IF NOT EXISTS service_request_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    previous_status ENUM('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'),
    new_status ENUM('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold') NOT NULL,
    changed_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_request_id (request_id),
    INDEX idx_changed_by (changed_by)
);

-- Add trigger to auto-generate request numbers
DELIMITER //

CREATE TRIGGER IF NOT EXISTS generate_request_number 
BEFORE INSERT ON service_requests
FOR EACH ROW
BEGIN
    DECLARE next_num INT;
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, 8) AS UNSIGNED)), 0) + 1 
    INTO next_num
    FROM service_requests 
    WHERE request_number LIKE CONCAT(YEAR(NOW()), '-%');
    
    -- Generate request number: YYYY-NNNN (e.g., 2024-0001)
    SET NEW.request_number = CONCAT(YEAR(NOW()), '-', LPAD(next_num, 4, '0'));
END//

DELIMITER ;

-- Add trigger to automatically assign technician based on institution assignment
DELIMITER //

CREATE TRIGGER IF NOT EXISTS auto_assign_technician
BEFORE INSERT ON service_requests
FOR EACH ROW
BEGIN
    DECLARE assigned_tech_id INT;
    
    -- Find the assigned technician for this institution
    SELECT technician_id INTO assigned_tech_id
    FROM technician_assignments 
    WHERE institution_id = NEW.institution_id 
    AND is_active = TRUE
    LIMIT 1;
    
    -- Auto-assign if technician found
    IF assigned_tech_id IS NOT NULL THEN
        SET NEW.assigned_technician_id = assigned_tech_id;
        SET NEW.status = 'assigned';
        SET NEW.assigned_at = NOW();
    END IF;
END//

DELIMITER ;

-- Add trigger to log status changes
DELIMITER //

CREATE TRIGGER IF NOT EXISTS log_status_change
AFTER UPDATE ON service_requests
FOR EACH ROW
BEGIN
    -- Only log if status actually changed
    IF OLD.status != NEW.status THEN
        INSERT INTO service_request_history (
            request_id, 
            previous_status, 
            new_status, 
            changed_by, 
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.assigned_technician_id, -- assuming technician is making the change
            CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
END//

DELIMITER ;
