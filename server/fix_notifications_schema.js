const db = require('./config/database');

(async () => {
    try {
        console.log('=== Updating Notifications Table Schema ===\n');
        
        // Step 1: Add missing enum values to type column
        console.log('1. Adding missing notification types to enum...');
        await db.query(`
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
                'error'
            ) NOT NULL
        `);
        console.log('✓ Notification types updated');
        
        // Step 2: Add new schema columns if they don't exist (while keeping legacy columns)
        console.log('\n2. Adding new schema columns...');
        
        // Check if columns exist
        const [cols] = await db.query(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
        `);
        const existingCols = cols.map(c => c.COLUMN_NAME);
        
        if (!existingCols.includes('user_id')) {
            await db.query(`ALTER TABLE notifications ADD COLUMN user_id INT NULL AFTER message`);
            console.log('✓ Added user_id column');
        } else {
            console.log('- user_id column already exists');
        }
        
        if (!existingCols.includes('sender_id')) {
            await db.query(`ALTER TABLE notifications ADD COLUMN sender_id INT NULL AFTER user_id`);
            console.log('✓ Added sender_id column');
        } else {
            console.log('- sender_id column already exists');
        }
        
        if (!existingCols.includes('reference_type')) {
            await db.query(`ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50) NULL AFTER sender_id`);
            console.log('✓ Added reference_type column');
        } else {
            console.log('- reference_type column already exists');
        }
        
        if (!existingCols.includes('reference_id')) {
            await db.query(`ALTER TABLE notifications ADD COLUMN reference_id INT NULL AFTER reference_type`);
            console.log('✓ Added reference_id column');
        } else {
            console.log('- reference_id column already exists');
        }
        
        // Step 3: Verify the schema
        console.log('\n3. Verifying updated schema...');
        const [updatedCols] = await db.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('\nUpdated notifications table structure:');
        updatedCols.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        console.log('\n✓ Notifications table schema updated successfully!');
        
        await db.end();
        process.exit(0);
    } catch(e) {
        console.error('Error:', e);
        await db.end();
        process.exit(1);
    }
})();
