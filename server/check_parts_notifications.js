const db = require('./config/database');

(async () => {
    try {
        console.log('=== Checking Parts Requests ===');
        const [parts] = await db.query('SELECT * FROM parts_requests ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent parts requests:', parts.length > 0 ? parts : 'No parts requests found');
        
        console.log('\n=== Checking Notifications Table Schema ===');
        const [cols] = await db.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('Notifications table columns:', cols);
        
        console.log('\n=== Checking All Notifications ===');
        const [allNotifs] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        console.log('Recent notifications (all types):', allNotifs.length > 0 ? allNotifs : 'No notifications found');
        
        console.log('\n=== Checking Parts Request Notifications Specifically ===');
        const [partsNotifs] = await db.query(`
            SELECT * FROM notifications 
            WHERE type = 'parts_request' OR type = 'parts_approved' OR type = 'parts_denied'
               OR reference_type = 'parts_request'
            ORDER BY created_at DESC LIMIT 5
        `);
        console.log('Parts-related notifications:', partsNotifs.length > 0 ? partsNotifs : 'No parts notifications found');
        
        console.log('\n=== Checking Technician Users ===');
        const [techs] = await db.query(`SELECT id, first_name, last_name, email FROM users WHERE role = 'technician' LIMIT 5`);
        console.log('Technician users:', techs);
        
        await db.end();
        process.exit(0);
    } catch(e) {
        console.error('Error:', e);
        await db.end();
        process.exit(1);
    }
})();
