const db = require('./config/database');

async function checkAllTableStructures() {
    try {
        console.log('=== Checking Database Table Structures ===\n');

        // Check users table
        console.log('1. USERS TABLE:');
        const [userColumns] = await db.query('DESCRIBE users');
        userColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Check service_requests table
        console.log('\n2. SERVICE_REQUESTS TABLE:');
        const [srColumns] = await db.query('DESCRIBE service_requests');
        srColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Check service_approvals table
        console.log('\n3. SERVICE_APPROVALS TABLE:');
        const [saColumns] = await db.query('DESCRIBE service_approvals');
        saColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Check institutions table
        console.log('\n4. INSTITUTIONS TABLE:');
        const [instColumns] = await db.query('DESCRIBE institutions');
        instColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n=== Table structure check completed ===');
        process.exit(0);
    } catch (error) {
        console.error('Error checking table structures:', error);
        process.exit(1);
    }
}

checkAllTableStructures();