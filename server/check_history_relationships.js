const db = require('./config/database');

async function checkHistoryTables() {
    console.log('=== Checking Service History Related Tables ===');
    
    try {
        // Check service_request_history table
        console.log('\n1. SERVICE_REQUEST_HISTORY table:');
        const [historyColumns] = await db.execute('DESCRIBE service_request_history');
        historyColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check service_requests table
        console.log('\n2. SERVICE_REQUESTS table:');
        const [serviceColumns] = await db.execute('DESCRIBE service_requests');
        serviceColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check users table for technician info
        console.log('\n3. USERS table (technician info):');
        const [userColumns] = await db.execute('DESCRIBE users');
        userColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check institutions table
        console.log('\n4. INSTITUTIONS table:');
        const [instColumns] = await db.execute('DESCRIBE institutions');
        instColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Sample data from service_request_history
        console.log('\n5. Sample SERVICE_REQUEST_HISTORY data:');
        const [historyData] = await db.execute(`
            SELECT srh.*, sr.description, sr.status as request_status, sr.request_number
            FROM service_request_history srh
            LEFT JOIN service_requests sr ON srh.request_id = sr.id
            ORDER BY srh.created_at DESC
            LIMIT 5
        `);
        
        if (historyData.length > 0) {
            historyData.forEach(record => {
                console.log(`   ID: ${record.id}, Service Request: ${record.service_request_id}, Status: ${record.status}, Date: ${record.created_at}`);
            });
        } else {
            console.log('   No history records found');
        }
        
        // Check for technician assignments
        console.log('\n6. TECHNICIAN_ASSIGNMENTS table:');
        const [techAssignColumns] = await db.execute('DESCRIBE technician_assignments');
        techAssignColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit();
}

checkHistoryTables();