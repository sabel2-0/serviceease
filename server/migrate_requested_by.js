const db = require('./config/database');

async function runMigration() {
    try {
        console.log('=== Starting Migration ===\n');
        
        // Step 1: Add new column requested_by_user_id
        console.log('Step 1: Adding requested_by_user_id column...');
        try {
            await db.query(`
                ALTER TABLE service_requests 
                ADD COLUMN requested_by_user_id INT NULL AFTER coordinator_id
            `);
            console.log('✓ Column added');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ Column already exists');
            } else {
                throw err;
            }
        }
        
        // Step 2: Add foreign key constraint
        console.log('\nStep 2: Adding foreign key constraint...');
        try {
            await db.query(`
                ALTER TABLE service_requests 
                ADD CONSTRAINT fk_service_requests_requested_by 
                    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('✓ Foreign key added');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('✓ Foreign key already exists');
            } else {
                throw err;
            }
        }
        
        // Step 3: Migrate existing data
        console.log('\nStep 3: Migrating existing data from coordinator_id to requested_by_user_id...');
        const [result] = await db.query(`
            UPDATE service_requests 
            SET requested_by_user_id = coordinator_id 
            WHERE coordinator_id IS NOT NULL AND requested_by_user_id IS NULL
        `);
        console.log(`✓ Migrated ${result.affectedRows} records`);
        
        // Step 4: Add index
        console.log('\nStep 4: Adding index...');
        try {
            await db.query(`
                CREATE INDEX idx_requested_by_user ON service_requests(requested_by_user_id)
            `);
            console.log('✓ Index added');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('✓ Index already exists');
            } else {
                throw err;
            }
        }
        
        // Verify migration
        console.log('\n=== Verification ===');
        const [rows] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN requested_by_user_id IS NOT NULL THEN 1 ELSE 0 END) as migrated FROM service_requests');
        console.log(`Total service requests: ${rows[0].total}`);
        console.log(`Records with requested_by_user_id: ${rows[0].migrated}`);
        
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
