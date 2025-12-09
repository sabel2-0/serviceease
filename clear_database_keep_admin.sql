-- Clear all data from tables but keep admin user
-- WARNING: This will delete all data except the admin user!
-- Updated to match current database structure (December 8, 2025)

USE serviceease;

-- Disable foreign key checks and safe update mode temporarily
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- Clear all tables in order (respecting dependencies)

-- Clear service-related tables
TRUNCATE TABLE service_request_history;
TRUNCATE TABLE service_approvals;
TRUNCATE TABLE service_parts_used;
TRUNCATE TABLE service_requests;

-- Clear maintenance services (preventive maintenance)
TRUNCATE TABLE maintenance_services;

-- Clear parts-related tables
TRUNCATE TABLE parts_requests;

-- Clear technician inventory BEFORE printer_parts (FK dependency)
TRUNCATE TABLE technician_inventory;

-- Clear printer parts
TRUNCATE TABLE printer_parts;

-- Clear printer assignment tables
TRUNCATE TABLE user_printer_assignments;
TRUNCATE TABLE institution_printer_assignments;

-- Clear printers
TRUNCATE TABLE printers;

-- Clear technician assignments
TRUNCATE TABLE technician_assignments;

-- Clear notifications
TRUNCATE TABLE notifications;

-- Clear audit logs
TRUNCATE TABLE audit_logs;

-- Clear temp user photos
TRUNCATE TABLE temp_user_photos;

-- Clear password reset and verification tokens
TRUNCATE TABLE password_reset_tokens;
TRUNCATE TABLE verification_tokens;

-- Clear ARM analysis cache
TRUNCATE TABLE arm_analysis_cache;

-- Clear institutions (DELETE to respect FK constraints)
DELETE FROM institutions;

-- Clear users EXCEPT admin (role = 'admin')
DELETE FROM users WHERE role != 'admin';

-- Reset auto_increment counter for users table
SET @max_id = (SELECT COALESCE(MAX(id), 0) FROM users);
SET @sql = CONCAT('ALTER TABLE users AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-enable foreign key checks and safe update mode
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- Verification: Show remaining data
SELECT '=== DATABASE CLEANUP COMPLETE ===' as status;
SELECT 'Remaining admin users:' as info;
SELECT id, first_name, last_name, email, role, status FROM users;

SELECT 'All other tables cleared!' as info;
SELECT CONCAT('Total tables cleared: 21') as summary;
