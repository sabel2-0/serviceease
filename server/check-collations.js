const db = require('./config/database');
require('dotenv').config();

async function checkCollations() {
    try {
        console.log('Checking table collations...\n');
        
        // Check institutions table
        const [instCols] = await db.query(`
            SELECT COLUMN_NAME, COLLATION_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'institutions' 
                AND COLUMN_NAME = 'institution_id'
        `);
        console.log('institutions.institution_id:', instCols[0]);
        
        // Check maintenance_services table
        const [msCols] = await db.query(`
            SELECT COLUMN_NAME, COLLATION_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'maintenance_services' 
                AND COLUMN_NAME = 'institution_id'
        `);
        console.log('maintenance_services.institution_id:', msCols[0]);
        
        // Check service_requests table
        const [srCols] = await db.query(`
            SELECT COLUMN_NAME, COLLATION_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'service_requests' 
                AND COLUMN_NAME = 'institution_id'
        `);
        console.log('service_requests.institution_id:', srCols[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCollations();
