-- Delete all data from tables except the admin user
-- This script will preserve the admin user (id=1, serviceeaseph@gmail.com)
-- Execute this script carefully as it will delete most of your data

USE `railway`;

-- Disable safe update mode and foreign key checks temporarily
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- Delete from tables that don't reference users table
TRUNCATE TABLE `arm_analysis_cache`;

-- Delete audit logs except admin's
DELETE FROM `audit_logs` WHERE `user_id` != 1;

-- Delete institution-related data
DELETE FROM `institution_printer_assignments`;
DELETE FROM `institutions`;

-- Delete item requests (all technicians will be deleted except if admin)
DELETE FROM `items_request`;

-- Delete maintenance services
TRUNCATE TABLE `maintenance_services`;

-- Delete notifications
TRUNCATE TABLE `notifications`;

-- Delete password reset tokens for non-admin users
DELETE FROM `password_reset_tokens` WHERE `user_id` != 1;

-- Delete printer items
TRUNCATE TABLE `printer_items`;

-- Delete printers
TRUNCATE TABLE `printers`;

-- Delete service approvals
TRUNCATE TABLE `service_approvals`;

-- Delete service items used
TRUNCATE TABLE `service_items_used`;

-- Delete service request history
TRUNCATE TABLE `service_request_history`;

-- Delete service requests
TRUNCATE TABLE `service_requests`;

-- Delete technician assignments
TRUNCATE TABLE `technician_assignments`;

-- Delete technician inventory
TRUNCATE TABLE `technician_inventory`;

-- Delete temp user photos for non-admin users
DELETE FROM `temp_user_photos` WHERE `user_id` != 1;

-- Delete user printer assignments for non-admin users
DELETE FROM `user_printer_assignments` WHERE `user_id` != 1;

-- Delete verification tokens for non-admin users
DELETE FROM `verification_tokens` WHERE `user_id` != 1;

-- Delete all users except admin (id=1)
DELETE FROM `users` WHERE `id` != 1;

-- Re-enable foreign key checks and safe update mode
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- Reset AUTO_INCREMENT values (optional - for clean IDs)
ALTER TABLE `arm_analysis_cache` AUTO_INCREMENT = 1;
ALTER TABLE `audit_logs` AUTO_INCREMENT = 1;
ALTER TABLE `institution_printer_assignments` AUTO_INCREMENT = 1;
ALTER TABLE `institutions` AUTO_INCREMENT = 1;
ALTER TABLE `items_request` AUTO_INCREMENT = 1;
ALTER TABLE `maintenance_services` AUTO_INCREMENT = 1;
ALTER TABLE `notifications` AUTO_INCREMENT = 1;
ALTER TABLE `password_reset_tokens` AUTO_INCREMENT = 1;
ALTER TABLE `printer_items` AUTO_INCREMENT = 1;
ALTER TABLE `printers` AUTO_INCREMENT = 1;
ALTER TABLE `service_approvals` AUTO_INCREMENT = 1;
ALTER TABLE `service_items_used` AUTO_INCREMENT = 1;
ALTER TABLE `service_request_history` AUTO_INCREMENT = 1;
ALTER TABLE `service_requests` AUTO_INCREMENT = 1;
ALTER TABLE `technician_assignments` AUTO_INCREMENT = 1;
ALTER TABLE `technician_inventory` AUTO_INCREMENT = 1;
ALTER TABLE `temp_user_photos` AUTO_INCREMENT = 1;
ALTER TABLE `user_printer_assignments` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 2;
ALTER TABLE `verification_tokens` AUTO_INCREMENT = 1;

-- Verify admin user still exists
SELECT * FROM `users` WHERE `id` = 1;

-- Show summary
SELECT 'Data deletion complete. Only admin user preserved.' AS Status;
