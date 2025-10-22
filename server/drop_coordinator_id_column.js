const db = require('./config/database');

(async () => {
    try {
        console.log('Removing coordinator_id column from service_requests table...\n');
        
        // Check if column exists
        const [cols] = await db.query("SHOW COLUMNS FROM service_requests LIKE 'coordinator_id'");
        
        if (cols.length === 0) {
            console.log('✅ coordinator_id column does not exist (already removed)');
            process.exit(0);
        }
        
        console.log('Found coordinator_id column, removing it...');
        
        // Drop foreign key constraint if exists
        const [fks] = await db.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'serviceease' 
            AND TABLE_NAME = 'service_requests' 
            AND COLUMN_NAME = 'coordinator_id'
            AND CONSTRAINT_NAME != 'PRIMARY'
        `);
        
        if (fks.length > 0) {
            const fkName = fks[0].CONSTRAINT_NAME;
            console.log(`Dropping foreign key: ${fkName}`);
            await db.query(`ALTER TABLE service_requests DROP FOREIGN KEY ${fkName}`);
        }
        
        // Drop the column
        await db.query('ALTER TABLE service_requests DROP COLUMN coordinator_id');
        console.log('✅ coordinator_id column dropped successfully');
        
        // Verify
        const [newCols] = await db.query('DESCRIBE service_requests');
        console.log('\nRemaining columns:');
        newCols.forEach(c => console.log(`  - ${c.Field}`));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
