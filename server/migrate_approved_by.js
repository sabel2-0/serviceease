const mysql = require('mysql2/promise');

async function migrate() {
    const db = await mysql.createConnection({
        host: 'autorack.proxy.rlwy.net',
        port: 20959,
        user: 'root',
        password: 'INrLIYuPCLtPXGjkbhClCZjsVHwjWSfT',
        database: 'railway'
    });

    try {
        console.log('🔧 Adding approved_by column to service_requests table...');
        
        await db.query('ALTER TABLE service_requests ADD COLUMN approved_by INT NULL AFTER completed_at');
        console.log('✅ approved_by column added');
        
        await db.query('CREATE INDEX idx_service_requests_approved_by ON service_requests(approved_by)');
        console.log('✅ Index created');
        
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Column already exists');
        } else if (err.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️ Index already exists');
        } else {
            console.error('❌ Migration error:', err.message);
            throw err;
        }
    } finally {
        await db.end();
    }
}

migrate().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
