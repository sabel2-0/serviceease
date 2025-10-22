CREATE TABLE IF NOT EXISTS printer_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category ENUM('toner', 'drum', 'fuser', 'roller', 'ink', 'ink-bottle', 'printhead', 'transfer-belt', 'maintenance-unit', 'power-board', 'mainboard', 'drum-cartridge', 'maintenance-box', 'other', 'other-consumable') NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;