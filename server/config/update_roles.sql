-- Update the users table to include coordinator role in the enum
ALTER TABLE users MODIFY role ENUM('admin', 'coordinator', 'operations_officer', 'technician') NOT NULL;
