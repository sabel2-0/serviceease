const mysql = require('mysql2/promise');

async function addWalkInColumns() {
    const db = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    console.log('\n=== Adding walk-in service request columns ===\n');

    const columns = [
        { name: 'walk_in_customer_name', sql: 'ALTER TABLE service_requests ADD COLUMN walk_in_customer_name VARCHAR(255) DEFAULT NULL' },
        { name: 'printer_brand', sql: 'ALTER TABLE service_requests ADD COLUMN printer_brand VARCHAR(100) DEFAULT NULL' },
        { name: 'is_walk_in', sql: 'ALTER TABLE service_requests ADD COLUMN is_walk_in BOOLEAN DEFAULT FALSE' },
        { name: 'parts_used', sql: 'ALTER TABLE service_requests ADD COLUMN parts_used TEXT DEFAULT NULL' },
        { name: 'requires_approval', sql: 'ALTER TABLE service_requests ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE' },
        { name: 'approved_by', sql: 'ALTER TABLE service_requests ADD COLUMN approved_by INT DEFAULT NULL' },
        { name: 'approved_at', sql: 'ALTER TABLE service_requests ADD COLUMN approved_at DATETIME DEFAULT NULL' }
    ];

    for (const col of columns) {
        try {
            await db.query(col.sql);
            console.log(`✅ Added column: ${col.name}`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`⏭️  Column already exists: ${col.name}`);
            } else {
                console.log(`❌ Error adding ${col.name}:`, error.message);
            }
        }
    }

    console.log('\n=== Verifying columns ===\n');
    const [cols] = await db.query('SHOW COLUMNS FROM service_requests');
    
    columns.forEach(col => {
        const exists = cols.find(c => c.Field === col.name);
        if (exists) {
            console.log(`✅ ${col.name} - VERIFIED (${exists.Type})`);
        } else {
            console.log(`❌ ${col.name} - STILL MISSING`);
        }
    });

    await db.end();
    console.log('\n✅ Done!\n');
    process.exit(0);
}

addWalkInColumns().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
