-- Technician Inventory Schema
-- This table tracks parts assigned to individual technicians

CREATE TABLE IF NOT EXISTS technician_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    assigned_by INT NULL, -- Admin who assigned the parts
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT NULL, -- Optional notes about the assignment
    
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES printer_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure one record per technician-part combination
    UNIQUE KEY unique_technician_part (technician_id, part_id),
    
    INDEX idx_technician_id (technician_id),
    INDEX idx_part_id (part_id),
    INDEX idx_assigned_at (assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update parts_requests table to include more categories
ALTER TABLE printer_parts 
MODIFY COLUMN category ENUM(
    'toner', 'drum', 'fuser', 'roller', 'ink', 'ink-bottle', 'printhead', 
    'transfer-belt', 'maintenance-unit', 'power-board', 'mainboard', 
    'drum-cartridge', 'maintenance-box', 'other', 'other-consumable',
    -- New consumable categories
    'paper', 'cleaning-supplies', 'tools', 'cables', 'batteries',
    'lubricants', 'replacement-parts', 'software', 'labels'
) NOT NULL DEFAULT 'other';

-- Add an enum to indicate if part is consumable or printer part
ALTER TABLE printer_parts 
ADD COLUMN part_type ENUM('consumable', 'printer_part') DEFAULT 'printer_part' AFTER category;

-- Add unit column to specify measurement unit (pieces, sheets, bottles, etc.)
ALTER TABLE printer_parts 
ADD COLUMN unit VARCHAR(50) DEFAULT 'pieces' AFTER part_type;

-- Add minimum stock level for reorder alerts
ALTER TABLE printer_parts 
ADD COLUMN min_stock_level INT DEFAULT 5 AFTER unit;

-- Update the stock column name to quantity for consistency
ALTER TABLE printer_parts 
CHANGE COLUMN stock quantity INT NOT NULL DEFAULT 0;