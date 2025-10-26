const mysql = require('mysql2/promise');

async function fixNotificationType() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    try {
        console.log('🔍 Checking notifications.type column...\n');

        // Check current enum values
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM notifications WHERE Field = 'type'
        `);

        console.log('Current type definition:');
        console.log(columns[0]);
        console.log();

        // Add 'voluntary_service' to the enum if not present
        console.log('🔧 Adding "voluntary_service" to type enum...');
        
        await connection.query(`
            ALTER TABLE notifications 
            MODIFY COLUMN type ENUM(
                'coordinator_registration',
                'service_request',
                'system',
                'parts_request',
                'parts_approved',
                'parts_denied',
                'info',
                'success',
                'warning',
                'error',
                'voluntary_service'
            ) DEFAULT 'system'
        `);

        console.log('✅ Successfully updated notifications.type enum!');
        
        // Verify
        const [updated] = await connection.query(`
            SHOW COLUMNS FROM notifications WHERE Field = 'type'
        `);
        
        console.log('\n✅ Updated type definition:');
        console.log(updated[0]);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixNotificationType();
