const db = require('./config/database');

(async () => {
    try {
        console.log('Checking service_requests table...\n');
        
        const [cols] = await db.query('DESCRIBE service_requests');
        console.log('Columns:');
        cols.forEach(c => {
            console.log(`  - ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.Key} ${c.Default || ''}`);
        });
        
        // Check sample data
        const [rows] = await db.query('SELECT * FROM service_requests ORDER BY id DESC LIMIT 3');
        console.log('\nRecent service requests:');
        rows.forEach(r => {
            console.log(`\n  ID: ${r.id}, Request: ${r.request_number}`);
            console.log(`    Institution: ${r.institution_id}`);
            console.log(`    Coordinator ID: ${r.coordinator_id || 'NULL'}`);
            console.log(`    Requested By User ID: ${r.requested_by_user_id || 'NULL'}`);
            console.log(`    Status: ${r.status}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
