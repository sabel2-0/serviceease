const db = require('./config/database');

async function checkApprovalRelatedTables() {
    try {
        console.log('=== Checking Tables Required for Approval Process ===\n');

        const tablesToCheck = [
            'service_approvals',
            'service_requests', 
            'technician_inventory',
            'service_request_history',
            'notifications'
        ];

        for (const tableName of tablesToCheck) {
            console.log(`${tableName.toUpperCase()} TABLE:`);
            try {
                const [columns] = await db.query(`DESCRIBE ${tableName}`);
                console.log('   ✅ Table exists with columns:');
                columns.forEach(col => {
                    console.log(`     - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
                });
            } catch (error) {
                console.log(`   ❌ Table does not exist: ${error.message}`);
            }
            console.log('');
        }

        // Test the specific queries used in the approve endpoint
        console.log('=== Testing Approval Queries ===\n');
        
        // Test technician inventory query
        console.log('1. Testing technician_inventory query...');
        try {
            const [result] = await db.query(`
                SELECT technician_id, part_id, quantity 
                FROM technician_inventory 
                LIMIT 1
            `);
            console.log('   ✅ technician_inventory query works');
        } catch (error) {
            console.log(`   ❌ technician_inventory query failed: ${error.message}`);
        }

        // Test service_request_history query
        console.log('2. Testing service_request_history query...');
        try {
            const [result] = await db.query(`
                SELECT request_id, previous_status, new_status, changed_by, notes 
                FROM service_request_history 
                LIMIT 1
            `);
            console.log('   ✅ service_request_history query works');
        } catch (error) {
            console.log(`   ❌ service_request_history query failed: ${error.message}`);
        }

        // Test notifications query
        console.log('3. Testing notifications query...');
        try {
            const [result] = await db.query(`
                SELECT user_id, type, title, message, data, created_at 
                FROM notifications 
                LIMIT 1
            `);
            console.log('   ✅ notifications query works');
        } catch (error) {
            console.log(`   ❌ notifications query failed: ${error.message}`);
        }

        console.log('\n=== Table check completed ===');
        process.exit(0);
    } catch (error) {
        console.error('Error checking approval tables:', error);
        process.exit(1);
    }
}

checkApprovalRelatedTables();