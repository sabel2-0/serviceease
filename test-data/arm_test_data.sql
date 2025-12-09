-- Association Rule Mining Test Data
-- This will populate realistic data for ARM analysis
-- Run after clearing database with clear_database_keep_admin.sql

USE serviceease;

-- Step 1: Create test institutions
INSERT INTO institutions (institution_id, name, type, address, status, user_id) VALUES
('INST001', 'Tech University Manila', 'university', '123 University Ave, Manila', 'active', 1),
('INST002', 'Business College Makati', 'college', '456 Business St, Makati', 'active', 1),
('INST003', 'Science High School QC', 'high_school', '789 Science Rd, Quezon City', 'active', 1);

-- Step 2: Create test users (institution_users and technicians)
-- Get admin password hash to reuse for test accounts
SET @admin_password = (SELECT password FROM users WHERE email = 'serviceeaseph@gmail.com' LIMIT 1);

INSERT INTO users (first_name, last_name, email, password, role, approval_status, is_email_verified, status, token_version) VALUES
-- Institution Users
('Maria', 'Santos', 'maria.santos@techuniv.edu.ph', @admin_password, 'institution_user', 'approved', 1, 'active', 0),
('Juan', 'Cruz', 'juan.cruz@techuniv.edu.ph', @admin_password, 'institution_user', 'approved', 1, 'active', 0),
('Ana', 'Reyes', 'ana.reyes@bizcollege.edu.ph', @admin_password, 'institution_user', 'approved', 1, 'active', 0),
('Pedro', 'Gomez', 'pedro.gomez@scihs.edu.ph', @admin_password, 'institution_user', 'approved', 1, 'active', 0),
-- Technicians (password will be same as admin: Yopop321.)
('Carlo', 'Tech', 'carlo.tech@serviceease.ph', @admin_password, 'technician', 'approved', 1, 'active', 0),
('Rosa', 'Repair', 'rosa.repair@serviceease.ph', @admin_password, 'technician', 'approved', 1, 'active', 0),
('Mike', 'Fix', 'mike.fix@serviceease.ph', @admin_password, 'technician', 'approved', 1, 'active', 0);

-- Step 2.5: Assign technicians to institutions
INSERT INTO technician_assignments (technician_id, institution_id, assigned_by, assigned_at, is_active) VALUES
-- Carlo Tech assigned to Tech University Manila
(6, 'INST001', 1, NOW(), TRUE),
-- Rosa Repair assigned to Business College Makati
(7, 'INST002', 1, NOW(), TRUE),
-- Mike Fix assigned to Science High School QC
(8, 'INST003', 1, NOW(), TRUE);

-- Step 3: Create printers (inventory)
INSERT INTO printers (category, name, brand, model, serial_number, quantity, location, status) VALUES
-- HP Printers
('printer', 'HP LaserJet Pro M404n', 'HP', 'LaserJet Pro M404n', 'HPLJ001', 1, 'Room 101', 'assigned'),
('printer', 'HP LaserJet Pro MFP M428fdw', 'HP', 'LaserJet Pro MFP M428fdw', 'HPLJ002', 1, 'Library', 'assigned'),
('printer', 'HP OfficeJet Pro 9015e', 'HP', 'OfficeJet Pro 9015e', 'HPOJ001', 1, 'Admin Office', 'assigned'),
-- Canon Printers
('printer', 'Canon Laser Pro 213', 'Canon', 'Laser Pro 213', 'CNLP001', 1, 'Room 201', 'assigned'),
('printer', 'Canon imageRUNNER 2425', 'Canon', 'imageRUNNER 2425', 'CNIR001', 1, 'Faculty Room', 'assigned'),
-- Epson Printers
('printer', 'Epson EcoTank L3150', 'Epson', 'EcoTank L3150', 'EPET001', 1, 'Computer Lab 1', 'assigned'),
('printer', 'Epson WorkForce WF-7720', 'Epson', 'WorkForce WF-7720', 'EPWF001', 1, 'Registrar', 'assigned'),
-- Brother Printers
('printer', 'Brother HL-L2350DW', 'Brother', 'HL-L2350DW', 'BRHL001', 1, 'Room 301', 'assigned'),
('printer', 'Brother MFC-L2750DW', 'Brother', 'MFC-L2750DW', 'BRMF001', 1, 'Accounting', 'assigned');

-- Step 3.5: Assign printers to institutions
INSERT INTO institution_printer_assignments (institution_id, printer_id, assigned_at, status) VALUES
-- Tech University Manila (INST001) - HP printers
('INST001', 1, NOW(), 'assigned'),  -- HP LaserJet Pro M404n
('INST001', 2, NOW(), 'assigned'),  -- HP LaserJet Pro MFP M428fdw
('INST001', 3, NOW(), 'assigned'),  -- HP OfficeJet Pro 9015e
-- Business College Makati (INST002) - Canon printers
('INST002', 4, NOW(), 'assigned'),  -- Canon Laser Pro 213
('INST002', 5, NOW(), 'assigned'),  -- Canon imageRUNNER 2425
-- Science High School QC (INST003) - Epson and Brother printers
('INST003', 6, NOW(), 'assigned'),  -- Epson EcoTank L3150
('INST003', 7, NOW(), 'assigned'),  -- Epson WorkForce WF-7720
('INST003', 8, NOW(), 'assigned'),  -- Brother HL-L2350DW
('INST003', 9, NOW(), 'assigned');  -- Brother MFC-L2750DW

-- Step 3.6: Assign printers to individual institution users
INSERT INTO user_printer_assignments (user_id, printer_id, institution_id, department, assigned_at) VALUES
-- Maria Santos (INST001 - Tech University Manila) - HP printers
(2, 1, 'INST001', 'IT Department', NOW()),        -- HP LaserJet Pro M404n
(2, 2, 'INST001', 'IT Department', NOW()),        -- HP LaserJet Pro MFP M428fdw
(2, 3, 'INST001', 'IT Department', NOW()),        -- HP OfficeJet Pro 9015e
-- Juan Cruz (INST001 - Tech University Manila) - HP printers
(3, 1, 'INST001', 'Academic Affairs', NOW()),     -- HP LaserJet Pro M404n
(3, 2, 'INST001', 'Academic Affairs', NOW()),     -- HP LaserJet Pro MFP M428fdw
(3, 3, 'INST001', 'Academic Affairs', NOW()),     -- HP OfficeJet Pro 9015e
-- Ana Reyes (INST002 - Business College Makati) - Canon printers
(4, 4, 'INST002', 'Administration', NOW()),       -- Canon Laser Pro 213
(4, 5, 'INST002', 'Administration', NOW()),       -- Canon imageRUNNER 2425
-- Pedro Gomez (INST003 - Science High School QC) - Epson and Brother printers
(5, 6, 'INST003', 'Computer Lab', NOW()),         -- Epson EcoTank L3150
(5, 7, 'INST003', 'Computer Lab', NOW()),         -- Epson WorkForce WF-7720
(5, 8, 'INST003', 'Computer Lab', NOW()),         -- Brother HL-L2350DW
(5, 9, 'INST003', 'Computer Lab', NOW());         -- Brother MFC-L2750DW

-- Step 4: Create printer parts
INSERT INTO printer_parts (name, brand, category, quantity, minimum_stock, status, item_type) VALUES
-- HP Parts
('HP Toner CF259A', 'HP', 'toner', 100, 10, 'in_stock', 'printer_part'),
('HP Drum Unit', 'HP', 'drum', 80, 8, 'in_stock', 'printer_part'),
('HP Fuser Assembly', 'HP', 'fuser', 50, 5, 'in_stock', 'printer_part'),
('HP Transfer Roller', 'HP', 'roller', 60, 6, 'in_stock', 'printer_part'),
('HP Pickup Roller', 'HP', 'roller', 120, 12, 'in_stock', 'printer_part'),
('HP Separation Pad', 'HP', 'other-consumable', 100, 10, 'in_stock', 'consumable'),
-- Canon Parts
('Canon Toner 051', 'Canon', 'toner', 90, 9, 'in_stock', 'printer_part'),
('Canon Drum Unit', 'Canon', 'drum', 70, 7, 'in_stock', 'printer_part'),
('Canon Fuser Unit', 'Canon', 'fuser', 45, 5, 'in_stock', 'printer_part'),
('Canon Feed Roller', 'Canon', 'roller', 110, 11, 'in_stock', 'printer_part'),
('Canon Separation Pad', 'Canon', 'other-consumable', 95, 10, 'in_stock', 'consumable'),
-- Epson Parts
('Epson Ink 502', 'Epson', 'ink', 150, 15, 'in_stock', 'consumable'),
('Epson Printhead', 'Epson', 'printhead', 40, 4, 'in_stock', 'printer_part'),
('Epson Waste Ink Pad', 'Epson', 'other-consumable', 80, 8, 'in_stock', 'consumable'),
('Epson Paper Feed Roller', 'Epson', 'roller', 100, 10, 'in_stock', 'printer_part'),
('Epson Maintenance Box', 'Epson', 'other-consumable', 60, 6, 'in_stock', 'consumable'),
-- Brother Parts
('Brother Toner TN-760', 'Brother', 'toner', 85, 8, 'in_stock', 'printer_part'),
('Brother Drum DR-730', 'Brother', 'drum', 65, 6, 'in_stock', 'printer_part'),
('Brother Fuser Unit', 'Brother', 'fuser', 42, 4, 'in_stock', 'printer_part'),
('Brother Transfer Belt', 'Brother', 'transfer-belt', 55, 5, 'in_stock', 'printer_part'),
('Brother Pickup Roller', 'Brother', 'roller', 105, 10, 'in_stock', 'printer_part');

-- Step 5: Create service requests with realistic patterns
-- Pattern 1: HP LaserJet - Paper jam issues (Pickup Roller + Separation Pad + Toner)
-- Mix of statuses: some pending, some in_progress, some completed for realistic data
INSERT INTO service_requests (request_number, institution_id, requested_by, technician_id, printer_id, priority, status, location, description, created_at, started_at, completed_at, resolution_notes) VALUES
('SR-2025-0001', 'INST001', 3, 6, 1, 'high', 'in_progress', 'Room 101', 'Paper jam and faded prints', '2024-12-01 08:00:00', '2024-12-01 08:30:00', NULL, NULL),
('SR-2025-0002', 'INST001', 3, 6, 1, 'medium', 'completed', 'Room 101', 'Frequent paper jams', '2024-11-28 09:00:00', '2024-11-28 09:30:00', '2024-11-28 11:00:00', 'Replaced pickup roller and separation pad'),
('SR-2025-0003', 'INST001', 2, 6, 1, 'high', 'completed', 'Room 101', 'Paper not feeding properly', '2024-11-20 10:00:00', '2024-11-20 10:30:00', '2024-11-20 12:00:00', 'Fixed paper feed mechanism'),
('SR-2025-0004', 'INST001', 3, 5, 1, 'medium', 'completed', 'Room 101', 'Multiple paper jams daily', '2024-11-15 11:00:00', '2024-11-15 11:30:00', '2024-11-15 13:30:00', 'Complete paper path maintenance'),
('SR-2025-0005', 'INST001', 2, 7, 1, 'high', 'completed', 'Room 101', 'Paper jam with fading', '2024-11-10 08:30:00', '2024-11-10 09:00:00', '2024-11-10 11:00:00', 'Replaced feed components and toner'),

-- Pattern 2: HP LaserJet - Print quality issues (Toner + Drum Unit)
('SR-2025-0006', 'INST001', 3, 6, 2, 'medium', 'completed', 'Library', 'Faded prints and streaks', '2024-11-25 09:00:00', '2024-11-25 09:30:00', '2024-11-25 11:00:00', 'Replaced toner cartridge'),
('SR-2025-0007', 'INST001', 3, 6, 2, 'high', 'in_progress', 'Library', 'Vertical lines on prints', '2024-12-05 10:00:00', '2024-12-05 10:30:00', NULL, NULL),
('SR-2025-0008', 'INST001', 3, 5, 2, 'medium', 'completed', 'Library', 'Print quality degraded', '2024-11-22 11:00:00', '2024-11-22 11:30:00', '2024-11-22 13:00:00', 'Replaced imaging components'),
('SR-2025-0009', 'INST001', 2, 7, 2, 'high', 'completed', 'Library', 'Streaks and spots on paper', '2024-11-18 09:30:00', '2024-11-18 10:00:00', '2024-11-18 12:00:00', 'New drum and toner installed'),
('SR-2025-0010', 'INST001', 3, 6, 2, 'medium', 'completed', 'Library', 'Fading and uneven prints', '2024-11-12 08:00:00', '2024-11-12 08:30:00', '2024-11-12 10:30:00', 'Complete toner system service'),

-- Pattern 3: Canon - Drum + Fuser issues
('SR-2025-0011', 'INST002', 4, 5, 4, 'high', 'completed', 'Room 201', 'Lines on printout', '2024-12-03 08:00:00', '2024-12-03 08:30:00', '2024-12-03 10:30:00', 'Replaced drum unit and fuser'),
('SR-2025-0012', 'INST002', 4, 6, 4, 'medium', 'completed', 'Room 201', 'Print quality issues', '2024-11-27 09:00:00', '2024-11-27 09:30:00', '2024-11-27 11:30:00', 'Drum and fuser replacement'),
('SR-2025-0013', 'INST002', 4, 5, 4, 'high', 'completed', 'Room 201', 'Smudged prints', '2024-11-21 10:00:00', '2024-11-21 10:30:00', '2024-11-21 12:00:00', 'Fixed with drum and fuser'),
('SR-2025-0014', 'INST002', 4, 7, 4, 'medium', 'completed', 'Room 201', 'Vertical streaks appearing', '2024-11-16 11:00:00', '2024-11-16 11:30:00', '2024-11-16 13:30:00', 'Imaging unit service'),
('SR-2025-0015', 'INST002', 4, 6, 4, 'high', 'completed', 'Room 201', 'Poor print output', '2024-11-11 08:30:00', '2024-11-11 09:00:00', '2024-11-11 11:00:00', 'Replaced drum and fuser'),

-- Pattern 4: Canon - Paper feed issues (Feed Roller + Separation Pad + Toner)
('SR-2025-0016', 'INST002', 4, 5, 5, 'medium', 'completed', 'Faculty Room', 'Paper jam issues', '2024-12-04 09:00:00', '2024-12-04 09:30:00', '2024-12-04 11:30:00', 'Paper feed system maintenance'),
('SR-2025-0017', 'INST002', 4, 6, 5, 'high', 'completed', 'Faculty Room', 'Multiple sheets feeding', '2024-11-29 10:00:00', '2024-11-29 10:30:00', '2024-11-29 12:00:00', 'Replaced feed roller and separation pad'),
('SR-2025-0018', 'INST002', 4, 7, 5, 'medium', 'completed', 'Faculty Room', 'Paper not feeding', '2024-11-24 11:00:00', '2024-11-24 11:30:00', '2024-11-24 13:00:00', 'Feed mechanism repair'),
('SR-2025-0019', 'INST002', 4, 5, 5, 'high', 'completed', 'Faculty Room', 'Jam with faded prints', '2024-11-19 09:30:00', '2024-11-19 10:00:00', '2024-11-19 12:00:00', 'Complete feed system service'),
('SR-2025-0020', 'INST002', 4, 6, 5, 'medium', 'completed', 'Faculty Room', 'Frequent jams', '2024-11-13 08:00:00', '2024-11-13 08:30:00', '2024-11-13 10:30:00', 'Rollers and pad replaced'),

-- Pattern 5: Epson - Ink + Printhead issues
('SR-2025-0021', 'INST003', 5, 7, 6, 'high', 'completed', 'Computer Lab 1', 'Colors not printing', '2024-12-05 08:00:00', '2024-12-05 08:30:00', '2024-12-05 10:30:00', 'Replaced ink and printhead'),
('SR-2025-0022', 'INST003', 5, 5, 6, 'medium', 'completed', 'Computer Lab 1', 'Print quality poor', '2024-11-30 09:00:00', '2024-11-30 09:30:00', '2024-11-30 11:00:00', 'Ink and printhead service'),
('SR-2025-0023', 'INST003', 5, 6, 6, 'high', 'completed', 'Computer Lab 1', 'Nozzle check failed', '2024-11-26 10:00:00', '2024-11-26 10:30:00', '2024-11-26 12:00:00', 'New printhead and ink'),
('SR-2025-0024', 'INST003', 5, 7, 6, 'medium', 'completed', 'Computer Lab 1', 'Missing colors', '2024-11-23 11:00:00', '2024-11-23 11:30:00', '2024-11-23 13:30:00', 'Printhead cleaning and ink replacement'),
('SR-2025-0025', 'INST003', 5, 5, 6, 'high', 'completed', 'Computer Lab 1', 'Ink not flowing', '2024-11-17 08:30:00', '2024-11-17 09:00:00', '2024-11-17 11:00:00', 'Complete ink system service'),

-- Pattern 6: Brother - Drum + Toner issues
('SR-2025-0026', 'INST003', 5, 6, 8, 'medium', 'completed', 'Room 301', 'Faded prints', '2024-12-06 09:00:00', '2024-12-06 09:30:00', '2024-12-06 11:00:00', 'Replaced drum and toner'),
('SR-2025-0027', 'INST003', 5, 7, 8, 'high', 'completed', 'Room 301', 'Lines on printout', '2024-12-01 10:00:00', '2024-12-01 10:30:00', '2024-12-01 12:00:00', 'Drum and toner replacement'),
('SR-2025-0028', 'INST003', 5, 5, 8, 'medium', 'completed', 'Room 301', 'Print quality degraded', '2024-11-26 11:00:00', '2024-11-26 11:30:00', '2024-11-26 13:00:00', 'Imaging unit service'),
('SR-2025-0029', 'INST003', 5, 6, 8, 'high', 'completed', 'Room 301', 'Streaks appearing', '2024-11-21 09:30:00', '2024-11-21 10:00:00', '2024-11-21 12:00:00', 'Replaced consumables'),
('SR-2025-0030', 'INST003', 5, 7, 8, 'medium', 'completed', 'Room 301', 'Uneven printing', '2024-11-16 08:00:00', '2024-11-16 08:30:00', '2024-11-16 10:30:00', 'Drum and toner installed'),

-- Additional mixed patterns for better ARM analysis (30 more requests)
('SR-2025-0031', 'INST001', 2, 5, 1, 'medium', 'completed', 'Room 101', 'Paper jam', '2024-11-08 09:00:00', '2024-11-08 09:30:00', '2024-11-08 11:00:00', 'Roller replacement'),
('SR-2025-0032', 'INST001', 3, 6, 1, 'high', 'completed', 'Room 101', 'Feeding issues', '2024-11-05 10:00:00', '2024-11-05 10:30:00', '2024-11-05 12:00:00', 'Feed system repair'),
('SR-2025-0033', 'INST001', 2, 7, 2, 'medium', 'completed', 'Library', 'Quality issues', '2024-11-03 11:00:00', '2024-11-03 11:30:00', '2024-11-03 13:00:00', 'Toner and drum'),
('SR-2025-0034', 'INST002', 4, 5, 4, 'high', 'completed', 'Room 201', 'Smudging', '2024-11-01 08:30:00', '2024-11-01 09:00:00', '2024-11-01 11:00:00', 'Fuser replacement'),
('SR-2025-0035', 'INST002', 4, 6, 5, 'medium', 'completed', 'Faculty Room', 'Paper problems', '2024-10-29 09:00:00', '2024-10-29 09:30:00', '2024-10-29 11:30:00', 'Feed roller service'),
('SR-2025-0036', 'INST003', 5, 7, 6, 'high', 'completed', 'Computer Lab 1', 'No color output', '2024-10-27 10:00:00', '2024-10-27 10:30:00', '2024-10-27 12:00:00', 'Ink and printhead'),
('SR-2025-0037', 'INST003', 5, 5, 8, 'medium', 'completed', 'Room 301', 'Faded text', '2024-10-25 11:00:00', '2024-10-25 11:30:00', '2024-10-25 13:30:00', 'Toner replacement'),
('SR-2025-0038', 'INST001', 3, 6, 1, 'high', 'completed', 'Room 101', 'Multiple jams', '2024-10-23 09:30:00', '2024-10-23 10:00:00', '2024-10-23 12:00:00', 'Complete maintenance'),
('SR-2025-0039', 'INST001', 2, 5, 2, 'medium', 'completed', 'Library', 'Streaking', '2024-10-21 08:00:00', '2024-10-21 08:30:00', '2024-10-21 10:30:00', 'Drum service'),
('SR-2025-0040', 'INST002', 4, 7, 4, 'high', 'completed', 'Room 201', 'Lines on page', '2024-10-19 09:00:00', '2024-10-19 09:30:00', '2024-10-19 11:00:00', 'Drum and fuser'),
('SR-2025-0041', 'INST001', 3, 5, 1, 'medium', 'completed', 'Room 101', 'Paper feed slow', '2024-10-17 10:00:00', '2024-10-17 10:30:00', '2024-10-17 12:00:00', 'Pickup roller'),
('SR-2025-0042', 'INST001', 2, 6, 2, 'high', 'completed', 'Library', 'Fading issue', '2024-10-15 11:00:00', '2024-10-15 11:30:00', '2024-10-15 13:00:00', 'Toner replacement'),
('SR-2025-0043', 'INST002', 4, 7, 5, 'medium', 'completed', 'Faculty Room', 'Double feed', '2024-10-13 08:30:00', '2024-10-13 09:00:00', '2024-10-13 11:00:00', 'Separation pad'),
('SR-2025-0044', 'INST003', 5, 5, 6, 'high', 'completed', 'Computer Lab 1', 'Clogged nozzles', '2024-10-11 09:00:00', '2024-10-11 09:30:00', '2024-10-11 11:30:00', 'Printhead clean'),
('SR-2025-0045', 'INST003', 5, 6, 8, 'medium', 'completed', 'Room 301', 'Light prints', '2024-10-09 10:00:00', '2024-10-09 10:30:00', '2024-10-09 12:00:00', 'Drum and toner'),
('SR-2025-0046', 'INST001', 2, 7, 1, 'high', 'completed', 'Room 101', 'Constant jams', '2024-10-07 11:00:00', '2024-10-07 11:30:00', '2024-10-07 13:30:00', 'Full feed service'),
('SR-2025-0047', 'INST001', 3, 5, 2, 'medium', 'completed', 'Library', 'Spots on prints', '2024-10-05 09:30:00', '2024-10-05 10:00:00', '2024-10-05 12:00:00', 'Drum replacement'),
('SR-2025-0048', 'INST002', 4, 6, 4, 'high', 'completed', 'Room 201', 'Smudged output', '2024-10-03 08:00:00', '2024-10-03 08:30:00', '2024-10-03 10:30:00', 'Fuser service'),
('SR-2025-0049', 'INST002', 4, 7, 5, 'medium', 'completed', 'Faculty Room', 'Paper not picking', '2024-10-01 09:00:00', '2024-10-01 09:30:00', '2024-10-01 11:00:00', 'Feed roller'),
('SR-2025-0050', 'INST003', 5, 5, 6, 'high', 'completed', 'Computer Lab 1', 'Color mismatch', '2024-09-29 10:00:00', '2024-09-29 10:30:00', '2024-09-29 12:00:00', 'Ink and printhead'),
('SR-2025-0051', 'INST001', 2, 6, 1, 'medium', 'completed', 'Room 101', 'Jam with fade', '2024-09-27 11:00:00', '2024-09-27 11:30:00', '2024-09-27 13:00:00', 'Rollers and toner'),
('SR-2025-0052', 'INST001', 3, 7, 2, 'high', 'completed', 'Library', 'Vertical lines', '2024-09-25 08:30:00', '2024-09-25 09:00:00', '2024-09-25 11:00:00', 'Drum unit'),
('SR-2025-0053', 'INST002', 4, 5, 4, 'medium', 'completed', 'Room 201', 'Poor quality', '2024-09-23 09:00:00', '2024-09-23 09:30:00', '2024-09-23 11:30:00', 'Drum and fuser'),
('SR-2025-0054', 'INST002', 4, 6, 5, 'high', 'completed', 'Faculty Room', 'Feed issues', '2024-09-21 10:00:00', '2024-09-21 10:30:00', '2024-09-21 12:00:00', 'Feed mechanism'),
('SR-2025-0055', 'INST003', 5, 7, 6, 'medium', 'completed', 'Computer Lab 1', 'No output', '2024-09-19 11:00:00', '2024-09-19 11:30:00', '2024-09-19 13:30:00', 'Printhead'),
('SR-2025-0056', 'INST003', 5, 5, 8, 'high', 'completed', 'Room 301', 'Faint printing', '2024-09-17 09:30:00', '2024-09-17 10:00:00', '2024-09-17 12:00:00', 'Toner and drum'),
('SR-2025-0057', 'INST001', 2, 6, 1, 'medium', 'completed', 'Room 101', 'Paper path issues', '2024-09-15 08:00:00', '2024-09-15 08:30:00', '2024-09-15 10:30:00', 'Roller service'),
('SR-2025-0058', 'INST001', 3, 7, 2, 'high', 'completed', 'Library', 'Streaks and fade', '2024-09-13 09:00:00', '2024-09-13 09:30:00', '2024-09-13 11:00:00', 'Toner and drum'),
('SR-2025-0059', 'INST002', 4, 5, 4, 'medium', 'completed', 'Room 201', 'Heat issues', '2024-09-11 10:00:00', '2024-09-11 10:30:00', '2024-09-11 12:00:00', 'Fuser replacement'),
('SR-2025-0060', 'INST003', 5, 6, 8, 'high', 'completed', 'Room 301', 'Quality degraded', '2024-09-09 11:00:00', '2024-09-09 11:30:00', '2024-09-09 13:00:00', 'Drum and toner'),
-- Active request for Juan Cruz
('SR-2025-0061', 'INST001', 3, 6, 3, 'high', 'in_progress', 'Admin Office', 'Printer not responding to print jobs', '2024-12-02 14:00:00', '2024-12-02 14:30:00', NULL, NULL);

-- Step 6: Link parts to service requests (realistic patterns)
-- HP Pattern: Pickup Roller + Separation Pad + Toner (requests 1-5, 31-32, 38, 41, 46, 51, 57)
INSERT INTO service_parts_used (service_request_id, part_id, quantity_used, used_by, used_at, notes) VALUES
(1, 5, 1, 5, '2024-12-01 09:30:00', 'HP Pickup Roller replacement'),
(1, 6, 1, 5, '2024-12-01 09:45:00', 'HP Separation Pad replacement'),
(1, 1, 1, 5, '2024-12-01 10:00:00', 'HP Toner CF259A replacement'),
(2, 5, 1, 5, '2024-11-25 10:00:00', 'HP Pickup Roller'),
(2, 6, 1, 5, '2024-11-25 10:15:00', 'HP Separation Pad'),
(2, 1, 1, 5, '2024-11-25 10:30:00', 'HP Toner'),
(3, 5, 1, 6, '2024-11-20 11:00:00', 'Pickup roller'),
(3, 6, 1, 6, '2024-11-20 11:15:00', 'Separation pad'),
(3, 1, 1, 6, '2024-11-20 11:30:00', 'Toner'),
(4, 5, 1, 5, '2024-11-15 12:00:00', 'HP Pickup Roller'),
(4, 6, 1, 5, '2024-11-15 12:15:00', 'HP Separation Pad'),
(4, 1, 1, 5, '2024-11-15 12:30:00', 'HP Toner'),
(5, 5, 1, 7, '2024-11-10 09:45:00', 'Pickup roller'),
(5, 6, 1, 7, '2024-11-10 10:00:00', 'Separation pad'),
(5, 1, 1, 7, '2024-11-10 10:15:00', 'Toner'),
(31, 5, 1, 5, '2024-11-08 10:00:00', 'Pickup roller'),
(31, 6, 1, 5, '2024-11-08 10:15:00', 'Separation pad'),
(32, 5, 1, 6, '2024-11-05 11:00:00', 'HP Pickup Roller'),
(32, 6, 1, 6, '2024-11-05 11:15:00', 'HP Separation Pad'),
(32, 1, 1, 6, '2024-11-05 11:30:00', 'HP Toner'),
(38, 5, 1, 6, '2024-10-23 10:30:00', 'Pickup roller'),
(38, 6, 1, 6, '2024-10-23 10:45:00', 'Separation pad'),
(38, 1, 1, 6, '2024-10-23 11:00:00', 'Toner'),
(41, 5, 1, 5, '2024-10-17 11:00:00', 'HP Pickup Roller'),
(41, 6, 1, 5, '2024-10-17 11:15:00', 'HP Separation Pad'),
(46, 5, 1, 7, '2024-10-07 12:00:00', 'Pickup roller'),
(46, 6, 1, 7, '2024-10-07 12:15:00', 'Separation pad'),
(46, 1, 1, 7, '2024-10-07 12:30:00', 'Toner'),
(51, 5, 1, 6, '2024-09-27 12:00:00', 'HP Pickup Roller'),
(51, 6, 1, 6, '2024-09-27 12:15:00', 'HP Separation Pad'),
(51, 1, 1, 6, '2024-09-27 12:30:00', 'HP Toner'),
(57, 5, 1, 6, '2024-09-15 09:30:00', 'Pickup roller'),
(57, 6, 1, 6, '2024-09-15 09:45:00', 'Separation pad'),

-- HP Pattern: Toner + Drum Unit (requests 6-10, 33, 39, 42, 47, 52, 58)
(6, 1, 1, 6, '2024-12-02 10:00:00', 'HP Toner CF259A'),
(6, 2, 1, 6, '2024-12-02 10:15:00', 'HP Drum Unit'),
(7, 1, 1, 6, '2024-11-28 11:00:00', 'Toner'),
(7, 2, 1, 6, '2024-11-28 11:15:00', 'Drum'),
(8, 1, 1, 5, '2024-11-22 12:00:00', 'HP Toner'),
(8, 2, 1, 5, '2024-11-22 12:15:00', 'HP Drum'),
(9, 1, 1, 7, '2024-11-18 10:45:00', 'Toner CF259A'),
(9, 2, 1, 7, '2024-11-18 11:00:00', 'Drum Unit'),
(10, 1, 1, 6, '2024-11-12 09:30:00', 'HP Toner'),
(10, 2, 1, 6, '2024-11-12 09:45:00', 'HP Drum'),
(33, 1, 1, 7, '2024-11-03 12:00:00', 'Toner'),
(33, 2, 1, 7, '2024-11-03 12:15:00', 'Drum'),
(39, 2, 1, 5, '2024-10-21 09:30:00', 'HP Drum Unit'),
(39, 1, 1, 5, '2024-10-21 09:45:00', 'HP Toner'),
(42, 1, 1, 6, '2024-10-15 12:00:00', 'HP Toner CF259A'),
(42, 2, 1, 6, '2024-10-15 12:15:00', 'HP Drum Unit'),
(47, 2, 1, 5, '2024-10-05 10:45:00', 'Drum Unit'),
(47, 1, 1, 5, '2024-10-05 11:00:00', 'Toner'),
(52, 2, 1, 7, '2024-09-25 09:45:00', 'HP Drum Unit'),
(52, 1, 1, 7, '2024-09-25 10:00:00', 'HP Toner'),
(58, 1, 1, 7, '2024-09-13 10:00:00', 'Toner CF259A'),
(58, 2, 1, 7, '2024-09-13 10:15:00', 'Drum Unit'),

-- Canon Pattern: Drum + Fuser (requests 11-15, 34, 40, 48, 53, 59)
(11, 8, 1, 5, '2024-12-03 09:30:00', 'Canon Drum Unit'),
(11, 9, 1, 5, '2024-12-03 09:45:00', 'Canon Fuser Unit'),
(12, 8, 1, 6, '2024-11-27 10:30:00', 'Drum Unit'),
(12, 9, 1, 6, '2024-11-27 10:45:00', 'Fuser Unit'),
(13, 8, 1, 5, '2024-11-21 11:00:00', 'Canon Drum'),
(13, 9, 1, 5, '2024-11-21 11:15:00', 'Canon Fuser'),
(14, 8, 1, 7, '2024-11-16 12:30:00', 'Drum Unit'),
(14, 9, 1, 7, '2024-11-16 12:45:00', 'Fuser Unit'),
(15, 8, 1, 6, '2024-11-11 10:00:00', 'Canon Drum'),
(15, 9, 1, 6, '2024-11-11 10:15:00', 'Canon Fuser'),
(34, 9, 1, 5, '2024-11-01 09:45:00', 'Canon Fuser Unit'),
(34, 8, 1, 5, '2024-11-01 10:00:00', 'Canon Drum Unit'),
(40, 8, 1, 7, '2024-10-19 10:00:00', 'Drum'),
(40, 9, 1, 7, '2024-10-19 10:15:00', 'Fuser'),
(48, 9, 1, 6, '2024-10-03 09:30:00', 'Canon Fuser Unit'),
(48, 8, 1, 6, '2024-10-03 09:45:00', 'Canon Drum Unit'),
(53, 8, 1, 5, '2024-09-23 10:30:00', 'Drum Unit'),
(53, 9, 1, 5, '2024-09-23 10:45:00', 'Fuser Unit'),
(59, 9, 1, 5, '2024-09-11 11:00:00', 'Canon Fuser'),
(59, 8, 1, 5, '2024-09-11 11:15:00', 'Canon Drum'),

-- Canon Pattern: Feed Roller + Separation Pad + Toner (requests 16-20, 35, 43, 49, 54)
(16, 10, 1, 5, '2024-12-04 10:30:00', 'Canon Feed Roller'),
(16, 11, 1, 5, '2024-12-04 10:45:00', 'Canon Separation Pad'),
(16, 7, 1, 5, '2024-12-04 11:00:00', 'Canon Toner 051'),
(17, 10, 1, 6, '2024-11-29 11:00:00', 'Feed Roller'),
(17, 11, 1, 6, '2024-11-29 11:15:00', 'Separation Pad'),
(18, 10, 1, 7, '2024-11-24 12:00:00', 'Canon Feed Roller'),
(18, 11, 1, 7, '2024-11-24 12:15:00', 'Canon Separation Pad'),
(19, 10, 1, 5, '2024-11-19 10:45:00', 'Feed Roller'),
(19, 11, 1, 5, '2024-11-19 11:00:00', 'Separation Pad'),
(19, 7, 1, 5, '2024-11-19 11:15:00', 'Toner'),
(20, 10, 1, 6, '2024-11-13 09:30:00', 'Canon Feed Roller'),
(20, 11, 1, 6, '2024-11-13 09:45:00', 'Canon Separation Pad'),
(35, 10, 1, 6, '2024-10-29 10:30:00', 'Feed Roller'),
(35, 11, 1, 6, '2024-10-29 10:45:00', 'Separation Pad'),
(43, 11, 1, 7, '2024-10-13 09:45:00', 'Canon Separation Pad'),
(43, 10, 1, 7, '2024-10-13 10:00:00', 'Canon Feed Roller'),
(49, 10, 1, 7, '2024-10-01 10:00:00', 'Feed Roller'),
(49, 11, 1, 7, '2024-10-01 10:15:00', 'Separation Pad'),
(54, 10, 1, 6, '2024-09-21 11:00:00', 'Canon Feed Roller'),
(54, 11, 1, 6, '2024-09-21 11:15:00', 'Canon Separation Pad'),

-- Epson Pattern: Ink + Printhead (requests 21-25, 36, 44, 50, 55)
(21, 12, 2, 7, '2024-12-05 09:30:00', 'Epson Ink 502'),
(21, 13, 1, 7, '2024-12-05 09:45:00', 'Epson Printhead'),
(22, 12, 2, 5, '2024-11-30 10:00:00', 'Ink 502'),
(22, 13, 1, 5, '2024-11-30 10:15:00', 'Printhead'),
(23, 12, 2, 6, '2024-11-26 11:00:00', 'Epson Ink'),
(23, 13, 1, 6, '2024-11-26 11:15:00', 'Epson Printhead'),
(24, 12, 2, 7, '2024-11-23 12:30:00', 'Ink 502'),
(24, 13, 1, 7, '2024-11-23 12:45:00', 'Printhead'),
(25, 12, 2, 5, '2024-11-17 09:45:00', 'Epson Ink 502'),
(25, 13, 1, 5, '2024-11-17 10:00:00', 'Epson Printhead'),
(36, 12, 2, 7, '2024-10-27 11:00:00', 'Ink'),
(36, 13, 1, 7, '2024-10-27 11:15:00', 'Printhead'),
(44, 13, 1, 5, '2024-10-11 10:30:00', 'Epson Printhead'),
(44, 12, 2, 5, '2024-10-11 10:45:00', 'Epson Ink 502'),
(50, 12, 2, 5, '2024-09-29 11:00:00', 'Ink 502'),
(50, 13, 1, 5, '2024-09-29 11:15:00', 'Printhead'),
(55, 13, 1, 7, '2024-09-19 12:30:00', 'Epson Printhead'),
(55, 12, 2, 7, '2024-09-19 12:45:00', 'Epson Ink'),

-- Brother Pattern: Drum + Toner (requests 26-30, 37, 45, 56, 60)
(26, 17, 1, 6, '2024-12-06 10:00:00', 'Brother Drum DR-730'),
(26, 16, 1, 6, '2024-12-06 10:15:00', 'Brother Toner TN-760'),
(27, 17, 1, 7, '2024-12-01 11:00:00', 'Drum DR-730'),
(27, 16, 1, 7, '2024-12-01 11:15:00', 'Toner TN-760'),
(28, 17, 1, 5, '2024-11-26 12:00:00', 'Brother Drum'),
(28, 16, 1, 5, '2024-11-26 12:15:00', 'Brother Toner'),
(29, 17, 1, 6, '2024-11-21 10:45:00', 'Drum'),
(29, 16, 1, 6, '2024-11-21 11:00:00', 'Toner'),
(30, 17, 1, 7, '2024-11-16 09:30:00', 'Brother Drum DR-730'),
(30, 16, 1, 7, '2024-11-16 09:45:00', 'Brother Toner TN-760'),
(37, 16, 1, 5, '2024-10-25 12:00:00', 'Toner TN-760'),
(37, 17, 1, 5, '2024-10-25 12:15:00', 'Drum DR-730'),
(45, 17, 1, 6, '2024-10-09 11:00:00', 'Brother Drum'),
(45, 16, 1, 6, '2024-10-09 11:15:00', 'Brother Toner'),
(56, 16, 1, 5, '2024-09-17 10:45:00', 'Toner'),
(56, 17, 1, 5, '2024-09-17 11:00:00', 'Drum'),
(60, 17, 1, 6, '2024-09-09 12:00:00', 'Brother Drum DR-730'),
(60, 16, 1, 6, '2024-09-09 12:15:00', 'Brother Toner TN-760');

-- Verification queries
SELECT '✅ Test Data Summary' as status;
SELECT 
    COUNT(*) as total_institutions,
    (SELECT COUNT(*) FROM users WHERE role = 'institution_user') as institution_users,
    (SELECT COUNT(*) FROM users WHERE role = 'technician') as technicians,
    (SELECT COUNT(*) FROM printers) as printers,
    (SELECT COUNT(*) FROM printer_parts) as parts,
    (SELECT COUNT(*) FROM service_requests WHERE status = 'completed') as completed_requests,
    (SELECT COUNT(*) FROM service_parts_used) as parts_used_records
FROM institutions;

SELECT '✅ Ready for ARM Analysis!' as message;
SELECT 'Run: cd server && node scripts/association_rule_mining.py analyze_printer "HP" "LaserJet Pro M404n" 0.08 0.4' as next_step;
