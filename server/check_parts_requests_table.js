const db = require('./config/database');

async function checkTables() {
    try {
        console.log('PARTS_REQUESTS TABLE:');
        const [cols] = await db.query('DESCRIBE parts_requests');
        cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));
        
        console.log('\nSERVICE_REQUEST_PARTS TABLE:');
        const [cols2] = await db.query('DESCRIBE service_request_parts');
        cols2.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
