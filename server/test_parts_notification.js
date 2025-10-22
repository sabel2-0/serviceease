const db = require('./config/database');

(async () => {
    try {
        console.log('=== Testing Parts Request Notification Creation ===\n');
        
        // Get a technician and a part
        const [techs] = await db.query(`SELECT id, first_name, last_name FROM users WHERE role = 'technician' LIMIT 1`);
        const [parts] = await db.query(`SELECT id, name, quantity FROM printer_parts WHERE quantity > 10 LIMIT 1`);
        
        if (techs.length === 0 || parts.length === 0) {
            console.log('No technician or parts found. Please create them first.');
            await db.end();
            process.exit(1);
        }
        
        const tech = techs[0];
        const part = parts[0];
        
        console.log(`Using Technician: ${tech.first_name} ${tech.last_name} (ID: ${tech.id})`);
        console.log(`Using Part: ${part.name} (ID: ${part.id}, Stock: ${part.quantity})\n`);
        
        // Create a test parts request
        console.log('1. Creating parts request...');
        const [result] = await db.query(`
            INSERT INTO parts_requests (
                part_id, technician_id, quantity_requested, reason, priority, status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
        `, [part.id, tech.id, 5, 'Test request for notification verification', 'medium']);
        
        const requestId = result.insertId;
        console.log(`✓ Parts request created (ID: ${requestId})`);
        
        // Manually create notification using the new schema
        console.log('\n2. Creating notification for admins...');
        const [notifResult] = await db.query(`
            INSERT INTO notifications (
                title, message, type, user_id, sender_id, 
                reference_type, reference_id, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            'New Parts Request',
            `${tech.first_name} ${tech.last_name} has requested 5 units of ${part.name}`,
            'parts_request',
            null, // null = all admins
            tech.id,
            'parts_request',
            requestId,
            'medium'
        ]);
        
        console.log(`✓ Notification created (ID: ${notifResult.insertId})`);
        
        // Verify the notification was created
        console.log('\n3. Verifying notification in database...');
        const [notifs] = await db.query(`
            SELECT * FROM notifications WHERE id = ?
        `, [notifResult.insertId]);
        
        if (notifs.length > 0) {
            console.log('\n✓ Notification verified:');
            console.log(JSON.stringify(notifs[0], null, 2));
        }
        
        // Check all parts request notifications
        console.log('\n4. All parts request notifications:');
        const [allPartsNotifs] = await db.query(`
            SELECT id, type, title, message, user_id, sender_id, created_at
            FROM notifications 
            WHERE type = 'parts_request' OR reference_type = 'parts_request'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        console.log(JSON.stringify(allPartsNotifs, null, 2));
        
        console.log('\n✓ Test completed successfully!');
        
        await db.end();
        process.exit(0);
    } catch(e) {
        console.error('Error:', e);
        await db.end();
        process.exit(1);
    }
})();
