const mysql = require('mysql2/promise');

async function checkColumns() {
    const db = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'serviceease_db'
    });

    console.log('\n=== Checking service_requests table ===\n');
    const [cols] = await db.query('SHOW COLUMNS FROM service_requests');
    
    const walkInColumns = ['walk_in_customer_name', 'printer_brand', 'is_walk_in', 'parts_used', 'requires_approval', 'approved_by', 'approved_at'];
    
    console.log('Looking for walk-in columns:');
    walkInColumns.forEach(col => {
        const exists = cols.find(c => c.Field === col);
        if (exists) {
            console.log(`✅ ${col} - EXISTS (${exists.Type})`);
        } else {
            console.log(`❌ ${col} - MISSING`);
        }
    });

    await db.end();
    process.exit(0);
}

checkColumns().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
