const db = require('./server/config/database');

(async () => {
    try {
        console.log('Checking voluntary_services table structure...\n');
        
        // Check if requester_id column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'voluntary_services' 
            AND COLUMN_NAME = 'requester_id'
        `);
        
        if (columns.length === 0) {
            console.log('Adding requester_id column...');
            await db.query(`
                ALTER TABLE voluntary_services 
                ADD COLUMN requester_id INT NULL AFTER institution_id
            `);
            console.log('✅ requester_id column added');
            
            // Add index
            await db.query(`
                ALTER TABLE voluntary_services 
                ADD INDEX idx_requester (requester_id)
            `);
            console.log('✅ Index idx_requester added');
        } else {
            console.log('✅ requester_id column already exists');
        }
        
        // Show current structure
        const [structure] = await db.query('DESCRIBE voluntary_services');
        console.log('\n📋 voluntary_services table structure:');
        structure.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });
        
        await db.end();
        console.log('\n✅ Database update completed!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        await db.end();
        process.exit(1);
    }
})();
