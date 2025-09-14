-- Create the database
CREATE DATABASE IF NOT EXISTS serviceease;
USE serviceease;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operations_officer', 'technician') NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    institution_type VARCHAR(50),
    institution_name VARCHAR(100),
    institution_address TEXT,
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create admin user
INSERT INTO users (first_name, last_name, email, password, role, is_email_verified) 
VALUES ('Admin', 'User', 'admin@serviceease.com', '$2b$10$5QqgHk6z3YQh3UPY0LZQkuuql8B3iKHuDGphqRcujBKSuKtuNcKYi', 'admin', TRUE);

-- Verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(100) NOT NULL,
    type ENUM('email', 'password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Institution details table
CREATE TABLE IF NOT EXISTS institutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Temporary user photos table for registration verification
CREATE TABLE IF NOT EXISTS temp_user_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    front_id_photo VARCHAR(255),
    back_id_photo VARCHAR(255),
    selfie_photo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);