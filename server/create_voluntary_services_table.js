const db = require('./config/database');

async function createTable() {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS voluntary_services (
                id INT PRIMARY KEY AUTO_INCREMENT,
                technician_id INT NOT NULL,
                printer_id INT NOT NULL,
                institution_id VARCHAR(50) NOT NULL,
                service_description TEXT NOT NULL,
                parts_used TEXT,
                time_spent INT,
                before_photos TEXT,
                after_photos TEXT,
                status ENUM('pending_coordinator', 'coordinator_approved', 'pending_requester', 'completed', 'rejected') DEFAULT 'pending_coordinator',
                coordinator_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                requester_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                coordinator_notes TEXT,
                requester_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                coordinator_reviewed_at TIMESTAMP NULL,
                coordinator_reviewed_by INT NULL,
                requester_reviewed_at TIMESTAMP NULL,
                requester_reviewed_by INT NULL,
                completed_at TIMESTAMP NULL,
                INDEX idx_technician (technician_id),
                INDEX idx_printer (printer_id),
                INDEX idx_institution (institution_id),
                INDEX idx_status (status),
                INDEX idx_created (created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await db.query(sql);
        console.log('✅ voluntary_services table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        process.exit(1);
    }
}

createTable();
