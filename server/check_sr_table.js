const db = require('./config/database');

async function checkServiceRequestsTable() {
    try {
        console.log('=== SERVICE_REQUESTS TABLE STRUCTURE ===\n');
        const [columns] = await db.query('DESCRIBE service_requests');
        columns.forEach(col => {
            console.log(`${col.Field.padEnd(30)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default}`);
        });
        console.log('\n=== Done ===');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkServiceRequestsTable();
