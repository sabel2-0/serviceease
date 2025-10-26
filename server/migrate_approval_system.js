const mysql = require('mysql2/promise');

async function migrateApprovalSystem() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    console.log('Starting approval system migration...\n');

    try {
        // Step 1: Create service_parts_used table if it doesn't exist
        console.log('1. Creating service_parts_used table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS service_parts_used (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_request_id INT NOT NULL,
                part_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                part_brand VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ service_parts_used table created/verified\n');

        // Step 2: Migrate existing parts_used data to service_parts_used table
        console.log('2. Migrating existing parts_used data...');
        const [requests] = await db.query(`
            SELECT id, parts_used FROM service_requests 
            WHERE parts_used IS NOT NULL AND parts_used != ''
        `);
        
        if (requests.length > 0) {
            console.log(`   Found ${requests.length} requests with parts_used data`);
            for (const request of requests) {
                // Simple migration: store as one row with the full text
                await db.query(`
                    INSERT INTO service_parts_used (service_request_id, part_name, quantity, notes)
                    VALUES (?, 'Parts Used', 1, ?)
                `, [request.id, request.parts_used]);
            }
            console.log(`   ✅ Migrated ${requests.length} parts_used entries\n`);
        } else {
            console.log('   ℹ️  No parts_used data to migrate\n');
        }

        // Step 3: Migrate approval data to service_approvals table
        console.log('3. Migrating approval data to service_approvals...');
        const [approvedRequests] = await db.query(`
            SELECT id, approved_by, approved_at, resolution_notes 
            FROM service_requests 
            WHERE approved_by IS NOT NULL
        `);
        
        if (approvedRequests.length > 0) {
            console.log(`   Found ${approvedRequests.length} approved requests`);
            for (const request of approvedRequests) {
                // Check if already exists in service_approvals
                const [existing] = await db.query(`
                    SELECT id FROM service_approvals WHERE service_request_id = ?
                `, [request.id]);
                
                if (existing.length === 0) {
                    await db.query(`
                        INSERT INTO service_approvals 
                        (service_request_id, status, coordinator_id, reviewed_at, coordinator_notes)
                        VALUES (?, 'approved', ?, ?, ?)
                    `, [request.id, request.approved_by, request.approved_at, request.resolution_notes]);
                }
            }
            console.log(`   ✅ Migrated ${approvedRequests.length} approval records\n`);
        } else {
            console.log('   ℹ️  No approval data to migrate\n');
        }

        // Step 4: Remove the 4 columns from service_requests
        console.log('4. Removing deprecated columns from service_requests...');
        
        const columnsToRemove = ['parts_used', 'requires_approval', 'approved_by', 'approved_at'];
        for (const column of columnsToRemove) {
            try {
                await db.query(`ALTER TABLE service_requests DROP COLUMN ${column}`);
                console.log(`   ✅ Removed column: ${column}`);
            } catch (error) {
                if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`   ℹ️  Column ${column} doesn't exist (already removed)`);
                } else {
                    throw error;
                }
            }
        }
        console.log('\n✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Update backend API to use service_parts_used table');
        console.log('2. Update backend API to use service_approvals table');
        console.log('3. Update frontend to fetch from proper tables');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    } finally {
        await db.end();
    }
}

migrateApprovalSystem().catch(console.error);
