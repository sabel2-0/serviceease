-- Create admin user with a proper hashed password (Admin@123)
INSERT INTO users (first_name, last_name, email, password, role, is_email_verified) 
VALUES ('Admin', 'User', 'admin@serviceease.com', '$2b$10$5QqgHk6z3YQh3UPY0LZQkuuql8B3iKHuDGphqRcujBKSuKtuNcKYi', 'admin', TRUE);
