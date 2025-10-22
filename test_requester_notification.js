// Test: Start a service request to trigger requester notification
const db = require('./server/config/database');
const axios = require('axios');

async function testNotification() {
    try {
        console.log('🔍 Finding a pending request...');
        const [requests] = await db.query(`
            SELECT id, request_number, requested_by_user_id, status 
            FROM service_requests 
            WHERE status = 'pending' 
            LIMIT 1
        `);
        
        if (requests.length === 0) {
            console.log('❌ No pending requests found');
            process.exit(1);
        }
        
        const request = requests[0];
        console.log(`✅ Found request: ${request.request_number} (ID: ${request.id})`);
        
        const [requester] = await db.query(
            'SELECT id, first_name, last_name, email FROM users WHERE id = ?',
            [request.requested_by_user_id]
        );
        
        console.log(`👤 Requester: ${requester[0].first_name} ${requester[0].last_name} (ID: ${requester[0].id})`);
        
        // Get technician token (you'll need to login as technician)
        console.log('\n📝 To test, login as technician (ID 57) and start request', request.request_number);
        console.log('   Then check notifications for requester ID:', requester[0].id);
        
        // Check current notifications for this requester
        const [currentNotifs] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
            [requester[0].id]
        );
        console.log(`\n📬 Current notifications for requester: ${currentNotifs[0].count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testNotification();
