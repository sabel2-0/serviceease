const db = require('./config/database');

(async () => {
    try {
        console.log('Checking service enhancement tables...');
        
        // Check service_parts_used table
        const [partsUsed] = await db.query('SHOW TABLES LIKE "service_parts_used"');
        console.log('service_parts_used table exists:', partsUsed.length > 0);
        
        // Check service_approvals table
        const [approvals] = await db.query('SHOW TABLES LIKE "service_approvals"');
        console.log('service_approvals table exists:', approvals.length > 0);
        
        // Check if pending_approval status exists in service_requests
        const [enumValues] = await db.query(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'status'
        `);
        
        if (enumValues.length > 0) {
            const statusEnum = enumValues[0].COLUMN_TYPE;
            console.log('Service request status enum:', statusEnum);
            console.log('Has pending_approval status:', statusEnum.includes('pending_approval'));
        }
        
        // Check technician_inventory table
        const [inventory] = await db.query('SHOW TABLES LIKE "technician_inventory"');
        console.log('technician_inventory table exists:', inventory.length > 0);
        
        if (inventory.length > 0) {
            // Check if there's any inventory data
            const [inventoryCount] = await db.query('SELECT COUNT(*) as count FROM technician_inventory');
            console.log('Technician inventory records:', inventoryCount[0].count);
        }
        
        console.log('✅ Database schema check completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking database:', error);
        process.exit(1);
    }
})();