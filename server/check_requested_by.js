const db = require('./config/database');

async function checkRequestedBy() {
    try {
        console.log('🔍 Checking service_requests table for requested_by_user_id...\n');
        
        // Check service requests with both columns
        const [requests] = await db.query(`
            SELECT 
                sr.id, 
                sr.request_number, 
                sr.status,
                sr.requested_by_user_id,
                sr.coordinator_id,
                u.first_name,
                u.last_name,
                u.role
            FROM service_requests sr
            LEFT JOIN users u ON sr.requested_by_user_id = u.id
            ORDER BY sr.created_at DESC 
            LIMIT 10
        `);
        console.log('📋 Recent Service Requests:');
        console.table(requests);
        
    } catch (error) {
        console.error('❌ Error checking requested_by:', error);
    } finally {
        await db.end();
        process.exit(0);
    }
}

checkRequestedBy();
