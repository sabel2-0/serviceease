-- First, remove any existing admin user
DELETE FROM users WHERE email = 'admin@serviceease.com';

-- Create admin user with the correct password hash
INSERT INTO users (first_name, last_name, email, password, role, is_email_verified) 
VALUES ('Admin', 'User', 'admin@serviceease.com', '$2b$10$5QqgHk6z3YQh3UPY0LZQkuuql8B3iKHuDGphqRcujBKSuKtuNcKYi', 'admin', TRUE);
