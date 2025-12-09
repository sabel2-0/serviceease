CREATE TABLE IF NOT EXISTS printer_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category ENUM('toner', 'drum', 'fuser', 'roller', 'ink', 'ink-bottle', 'printhead', 'transfer-belt', 'maintenance-unit', 'power-board', 'mainboard', 'drum-cartridge', 'maintenance-box', 'other', 'other-consumable', 'paper', 'cleaning-supplies', 'tools', 'cables', 'batteries', 'lubricants', 'replacement-parts', 'software', 'labels') NOT NULL DEFAULT 'other',
    item_type ENUM('consumable', 'printer_part') DEFAULT 'printer_part',
    quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT DEFAULT 5,
    status ENUM('in_stock', 'low_stock', 'out_of_stock') NOT NULL DEFAULT 'in_stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_universal TINYINT(1) DEFAULT 0 COMMENT 'True if part works with all brands/models',
    unit VARCHAR(50) DEFAULT 'pieces',
    page_yield INT DEFAULT NULL COMMENT 'Approximate number of pages the consumable can print',
    ink_volume DECIMAL(10,2) DEFAULT NULL COMMENT 'Volume of ink in milliliters for ink bottles',
    color VARCHAR(50) DEFAULT NULL COMMENT 'Color of ink/toner (black, cyan, magenta, yellow, etc.)',
    KEY idx_parts_universal (is_universal),
    KEY idx_parts_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;