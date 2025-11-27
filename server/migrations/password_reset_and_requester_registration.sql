-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Requester Registration Requests Table
CREATE TABLE IF NOT EXISTS requester_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    institution_id VARCHAR(50) NOT NULL,
    institution_type ENUM('public_school', 'lgu', 'hospital') NOT NULL,
    
    -- ID Verification Photos
    id_front_url VARCHAR(500),
    id_back_url VARCHAR(500),
    selfie_url VARCHAR(500),
    
    -- Printer Serial Numbers and Brands (JSON array)
    printer_serial_numbers JSON NOT NULL COMMENT 'Array of {serial_number, brand}',
    
    -- Verification
    email_verification_token VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at DATETIME,
    
    -- Status
    status ENUM('pending_verification', 'pending_coordinator', 'approved', 'rejected') DEFAULT 'pending_verification',
    coordinator_reviewed_at DATETIME,
    coordinator_reviewed_by INT,
    coordinator_notes TEXT,
    
    -- Matched printer IDs (set by system after validation)
    matched_printer_ids JSON COMMENT 'Array of inventory_item_ids that matched serial numbers',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (coordinator_reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_institution (institution_id),
    INDEX idx_status (status),
    INDEX idx_email_token (email_verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add email_verification columns to users table if not exists
-- Note: These will error if columns already exist, which is expected
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) AFTER email;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT TRUE AFTER email_verification_token;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME AFTER email_verified;
