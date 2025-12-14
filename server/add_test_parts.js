// Quick script to add test parts data for service request #7
const db = require('./config/database');

async function addTestParts() {
    try {
        console.log('Adding test parts for service request #7...');
        
        // Insert a test part (Canon Toner - item_id 3)
        await db.query(
            `INSERT INTO service_items_used (service_request_id, item_id, quantity_used, notes, used_by, used_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [7, 3, 1, 'Canon Toner Cartridge - retroactively added for testing', 3]
        );
        
        console.log('✓ Successfully added test parts data');
        console.log('You can now refresh the technician history page to see the parts');
        
        process.exit(0);
    } catch (error) {
        console.error('Error adding test parts:', error);
        process.exit(1);
    }
}

addTestParts();


