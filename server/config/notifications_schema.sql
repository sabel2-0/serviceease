-- Create notifications table for system-wide notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error', 'parts_request', 'parts_approved', 'parts_denied') NOT NULL DEFAULT 'info',
    user_id INT,  -- NULL means notification is for all admins
    sender_id INT,  -- Who sent the notification
    reference_type ENUM('parts_request', 'service_request', 'user_registration', 'system') DEFAULT NULL,
    reference_id INT DEFAULT NULL,  -- ID of the referenced entity
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read),
    INDEX idx_reference (reference_type, reference_id),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email_notifications BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    notification_types JSON DEFAULT NULL,  -- Store which types of notifications user wants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_prefs (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;