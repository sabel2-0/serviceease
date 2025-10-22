const db = require('./config/database');

(async () => {
    try {
        console.log('Checking technician_inventory table...\n');
        
        // Check if table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'technician_inventory'");
        console.log('Tables found:', tables);
        
        if (tables.length > 0) {
            // Get table structure
            const [cols] = await db.query('DESCRIBE technician_inventory');
            console.log('\nTable structure:');
            cols.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default || ''}`);
            });
            
            // Get sample data
            const [rows] = await db.query('SELECT * FROM technician_inventory LIMIT 5');
            console.log(`\nSample data (${rows.length} rows):`);
            console.log(rows);
            
            // Count total rows
            const [count] = await db.query('SELECT COUNT(*) as total FROM technician_inventory');
            console.log(`\nTotal rows: ${count[0].total}`);
        } else {
            console.log('\n❌ technician_inventory table does NOT exist!');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
