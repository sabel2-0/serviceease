-- Sample data setup for ServiceEase Technician System Demo
-- Run this after the main schema setup to create test data

-- Create a test technician user (password: 'password123')
INSERT IGNORE INTO users (email, password, first_name, last_name, role, email_verified, created_at) VALUES
('alex.technician@serviceease.com', '$2b$10$rOvH5CSGDX/NMz7Z/NZZ3.7nJvGgJ8ZWZvZkZZzZ6Z7Z8Z9ZnZzZ0Z', 'Alex', 'Rodriguez', 'technician', TRUE, NOW());

-- Get the technician ID
SET @tech_id = (SELECT id FROM users WHERE email = 'alex.technician@serviceease.com');

-- Create test institutions if they don't exist
INSERT IGNORE INTO institutions (institution_id, name, type, address, contact_person, contact_email, contact_phone, created_at) VALUES
('ELEM001', 'Pajo Elementary School', 'elementary', 'Room 405, Pajo Elementary School, Lapu-Lapu City', 'Maria Santos', 'maria.santos@pajo.edu.ph', '+63 32 495 1234', NOW()),
('HIGH001', 'Cordova National High School', 'high_school', 'Main Building, Cordova National High School, Cordova', 'John Cruz', 'john.cruz@cordova.edu.ph', '+63 32 495 5678', NOW()),
('UNIV001', 'Cebu Technology University', 'university', 'IT Department, CTU Main Campus, Cebu City', 'Dr. Lisa Garcia', 'lisa.garcia@ctu.edu.ph', '+63 32 495 9012', NOW());

-- Assign technician to institutions
INSERT IGNORE INTO technician_assignments (technician_id, institution_id, assigned_by, is_active) VALUES
(@tech_id, 'ELEM001', 1, TRUE),
(@tech_id, 'HIGH001', 1, TRUE),
(@tech_id, 'UNIV001', 1, TRUE);

-- Create inventory items (printers)
INSERT IGNORE INTO inventory_items (name, brand, model, serial_number, institution_id, location, status, created_at) VALUES
('Office Printer A', 'HP', 'LaserJet Pro MFP M227fdw', 'HP001LJ227001', 'ELEM001', 'Main Office', 'active', NOW()),
('Library Printer', 'Canon', 'imageCLASS MF264dw', 'CN001MF264001', 'ELEM001', 'Library', 'active', NOW()),
('Faculty Printer', 'Brother', 'HL-L2350DW', 'BR001HLL2350001', 'HIGH001', 'Faculty Room', 'active', NOW()),
('Computer Lab Printer', 'HP', 'LaserJet Pro P1102w', 'HP001P1102001', 'HIGH001', 'Computer Lab', 'active', NOW()),
('IT Department Printer', 'Canon', 'imageCLASS LBP6230dn', 'CN001LBP6230001', 'UNIV001', 'IT Department', 'active', NOW());

-- Create sample service requests
INSERT IGNORE INTO service_requests 
(request_number, institution_id, service_type, priority, status, description, location, inventory_item_id, contact_person, contact_phone, created_at, assigned_technician_id, assigned_at) 
VALUES
('2025-0001', 'ELEM001', 'repair', 'high', 'assigned', 'HP LaserJet Pro MFP M227fdw not printing black ink properly. Print quality is faded and streaky.', 'Main Office', 
 (SELECT id FROM inventory_items WHERE serial_number = 'HP001LJ227001'), 'Maria Santos', '+63 32 495 1234', NOW() - INTERVAL 2 DAY, @tech_id, NOW() - INTERVAL 2 DAY),

('2025-0002', 'ELEM001', 'maintenance', 'medium', 'new', 'Canon imageCLASS MF264dw showing paper jam error repeatedly. Need maintenance check.', 'Library', 
 (SELECT id FROM inventory_items WHERE serial_number = 'CN001MF264001'), 'Library Staff', '+63 32 495 1234', NOW() - INTERVAL 1 DAY, @tech_id, NOW() - INTERVAL 1 DAY),

('2025-0003', 'HIGH001', 'repair', 'urgent', 'in_progress', 'Brother HL-L2350DW completely stopped working. No power light, no response.', 'Faculty Room', 
 (SELECT id FROM inventory_items WHERE serial_number = 'BR001HLL2350001'), 'John Cruz', '+63 32 495 5678', NOW() - INTERVAL 3 HOUR, @tech_id, NOW() - INTERVAL 2 HOUR),

('2025-0004', 'HIGH001', 'installation', 'low', 'assigned', 'Set up network printing for HP LaserJet Pro P1102w in Computer Lab. Configure for student access.', 'Computer Lab', 
 (SELECT id FROM inventory_items WHERE serial_number = 'HP001P1102001'), 'IT Coordinator', '+63 32 495 5678', NOW() - INTERVAL 6 HOUR, @tech_id, NOW() - INTERVAL 6 HOUR),

('2025-0005', 'UNIV001', 'consultation', 'medium', 'assigned', 'Canon imageCLASS LBP6230dn print quality declining. Need assessment and recommendations.', 'IT Department', 
 (SELECT id FROM inventory_items WHERE serial_number = 'CN001LBP6230001'), 'Dr. Lisa Garcia', '+63 32 495 9012', NOW() - INTERVAL 4 HOUR, @tech_id, NOW() - INTERVAL 4 HOUR);

-- Update the in_progress request with started_at timestamp
UPDATE service_requests 
SET started_at = NOW() - INTERVAL 2 HOUR 
WHERE request_number = '2025-0003';

-- Create sample completed request with job order
INSERT IGNORE INTO service_requests 
(request_number, institution_id, service_type, priority, status, description, location, inventory_item_id, contact_person, contact_phone, 
 created_at, assigned_technician_id, assigned_at, started_at, completed_at, resolved_by, resolution_notes, client_name, client_signature) 
VALUES
('2025-0000', 'ELEM001', 'repair', 'medium', 'completed', 'Printer toner replacement and cleaning maintenance.', 'Administrative Office', 
 (SELECT id FROM inventory_items WHERE serial_number = 'HP001LJ227001'), 'Admin Staff', '+63 32 495 1234',
 NOW() - INTERVAL 5 DAY, @tech_id, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY + INTERVAL 2 HOUR, @tech_id,
 'Replaced HP Toner Cartridge 85A. Performed thorough cleaning of print heads and internal components. Printer now functioning optimally with clear, crisp prints.',
 'Maria Santos', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

-- Create corresponding job order for the completed request
INSERT IGNORE INTO job_orders (request_id, technician_id, actions_performed, additional_notes, client_name, client_signature, created_at)
SELECT id, @tech_id, 
       'Replaced HP Toner Cartridge 85A. Performed thorough cleaning of print heads and internal components. Tested print quality with multiple test pages.',
       'Recommended monthly cleaning schedule to maintain optimal performance. Advised on proper paper handling to prevent jams.',
       'Maria Santos',
       'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
       NOW() - INTERVAL 4 DAY + INTERVAL 2 HOUR
FROM service_requests WHERE request_number = '2025-0000';

-- Record parts used in the completed job
INSERT IGNORE INTO job_order_parts (job_order_id, part_name, quantity_used, recorded_by, created_at)
SELECT jo.id, 'HP Toner Cartridge 85A', 1, @tech_id, NOW() - INTERVAL 4 DAY + INTERVAL 2 HOUR
FROM job_orders jo 
JOIN service_requests sr ON jo.request_id = sr.id 
WHERE sr.request_number = '2025-0000';

-- Update inventory to reflect parts usage
UPDATE printer_parts SET stock = stock - 1 WHERE name = 'HP Toner Cartridge 85A';

-- Add some service request history for demonstration
INSERT IGNORE INTO service_request_history (request_id, previous_status, new_status, changed_by, notes, created_at)
SELECT id, 'new', 'assigned', @tech_id, 'Auto-assigned to technician based on institution assignment', assigned_at
FROM service_requests WHERE assigned_technician_id = @tech_id AND status != 'new';

INSERT IGNORE INTO service_request_history (request_id, previous_status, new_status, changed_by, notes, created_at)
SELECT id, 'assigned', 'in_progress', @tech_id, 'Technician started working on the request', started_at
FROM service_requests WHERE status = 'in_progress' AND started_at IS NOT NULL;

INSERT IGNORE INTO service_request_history (request_id, previous_status, new_status, changed_by, notes, created_at)
SELECT id, 'in_progress', 'completed', @tech_id, 'Service request completed successfully', completed_at
FROM service_requests WHERE status = 'completed' AND completed_at IS NOT NULL;

-- Display summary of created test data
SELECT 
    'Test Data Summary' AS section,
    'Created' AS status,
    COUNT(*) AS count,
    'service requests' AS type
FROM service_requests 
WHERE assigned_technician_id = @tech_id

UNION ALL

SELECT 
    'Technician Info' AS section,
    'Ready' AS status,
    1 AS count,
    CONCAT('User: alex.technician@serviceease.com (ID: ', @tech_id, ')') AS type

UNION ALL

SELECT 
    'Institutions' AS section,
    'Assigned' AS status,
    COUNT(*) AS count,
    'institutions assigned to technician' AS type
FROM technician_assignments 
WHERE technician_id = @tech_id AND is_active = TRUE

UNION ALL

SELECT 
    'Printer Parts' AS section,
    'Available' AS status,
    COUNT(*) AS count,
    'different parts in inventory' AS type
FROM printer_parts 
WHERE stock > 0;