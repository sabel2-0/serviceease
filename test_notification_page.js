const db = require('./server/config/database');

async function testNotifications() {
    try {
        // Get coordinator user
        const [coordinators] = await db.query(
            'SELECT id, first_name, last_name, email FROM users WHERE role = ? LIMIT 1',
            ['coordinator']
        );
        
        if (coordinators.length === 0) {
            console.log('No coordinators found');
            process.exit(0);
        }
        
        const coordinator = coordinators[0];
        console.log('Testing notifications for coordinator:', coordinator);
        
        // Check existing notifications
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [coordinator.id]
        );
        
        console.log('\nExisting notifications:', notifications.length);
        if (notifications.length > 0) {
            console.log(JSON.stringify(notifications, null, 2));
        }
        
        // Create a test notification
        const [result] = await db.query(
            `INSERT INTO notifications (user_id, type, title, message, priority, reference_type, reference_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                coordinator.id,
                'info',  // Using 'info' instead of 'printer_assigned'
                'New Printer Assigned',
                'A printer has been assigned to your institution by an administrator.',
                'high',
                'inventory_item',
                1
            ]
        );
        
        console.log('\n✅ Test notification created! ID:', result.insertId);
        console.log('Refresh the notifications page to see it.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testNotifications();
