const db = require('./config/database.js');

async function checkHistoryTable() {
    try {
        const [result] = await db.query('SHOW TABLES LIKE "service_request_history"');
        console.log('History table exists:', result.length > 0);
        
        if (result.length === 0) {
            console.log('Creating service_request_history table...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS service_request_history (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    request_id INT NOT NULL,
                    previous_status ENUM('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'),
                    new_status ENUM('new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold') NOT NULL,
                    changed_by INT NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
                    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
                    
                    INDEX idx_request_id (request_id),
                    INDEX idx_changed_by (changed_by)
                )
            `);
            console.log('History table created successfully');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkHistoryTable();