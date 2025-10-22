// Check users and notifications
const db = require('./server/config/database');

(async () => {
    try {
        const [users] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id IN (65, 66)');
        console.log('Users:');
        users.forEach(u => console.log(`- ${u.id}: ${u.first_name} ${u.last_name} (${u.email}) - ${u.role}`));
        
        console.log('\n=== Checking notifications for user 66 (Tera Mitenas) ===');
        const [notifs66] = await db.query('SELECT id, title, message, type, user_id, sender_id, created_at FROM notifications WHERE user_id = 66 ORDER BY created_at DESC LIMIT 5');
        if(notifs66.length === 0) {
            console.log('❌ No notifications for user 66');
        } else {
            console.log(`✅ Found ${notifs66.length} notifications:`);
            notifs66.forEach(n => console.log(`  - [${n.type}] ${n.title} - ${n.message.substring(0, 50)}...`));
        }
        
        console.log('\n=== Request 147 was started - checking what happened ===');
        const [req147] = await db.query('SELECT id, request_number, requested_by_user_id, status, started_at, updated_at FROM service_requests WHERE id = 147');
        console.log('Request 147:', req147[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
