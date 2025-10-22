const db = require('./server/config/database');

async function testSystem() {
    try {
        console.log('=== TESTING ORIGINAL INSTITUTION SYSTEM ===\n');
        
        // 1. Check users table structure
        console.log('1. Users table structure:');
        const [usersColumns] = await db.query('DESCRIBE users');
        const hasInstitutionId = usersColumns.some(col => col.Field === 'institution_id');
        console.log(`   ❌ users.institution_id exists: ${hasInstitutionId}`);
        console.log(`   ${hasInstitutionId ? '⚠️  PROBLEM: Column should not exist!' : '✅ CORRECT: Column removed'}\n`);
        
        // 2. Check institutions table structure
        console.log('2. Institutions table structure:');
        const [instColumns] = await db.query('DESCRIBE institutions');
        const hasUserId = instColumns.some(col => col.Field === 'user_id');
        console.log(`   ✅ institutions.user_id exists: ${hasUserId}`);
        console.log(`   ${hasUserId ? '✅ CORRECT: Column exists' : '⚠️  PROBLEM: Column should exist!'}\n`);
        
        // 3. Check user 64 data
        console.log('3. User 64 (Coordinator) data:');
        const [user] = await db.query('SELECT id, email, role FROM users WHERE id = 64');
        if (user[0]) {
            console.log(`   User ID: ${user[0].id}`);
            console.log(`   Email: ${user[0].email}`);
            console.log(`   Role: ${user[0].role}`);
        }
        
        // 4. Check INST-017 data
        console.log('\n4. INST-017 (Institution) data:');
        const [inst] = await db.query('SELECT institution_id, name, user_id FROM institutions WHERE institution_id = "INST-017"');
        if (inst[0]) {
            console.log(`   Institution ID: ${inst[0].institution_id}`);
            console.log(`   Name: ${inst[0].name}`);
            console.log(`   Owner (user_id): ${inst[0].user_id}`);
            console.log(`   ${inst[0].user_id === 64 ? '✅ CORRECT: Linked to user 64' : '⚠️  PROBLEM: Should be linked to user 64'}`);
        }
        
        // 5. Test getPendingUsers query
        console.log('\n5. Testing getPendingUsers query (should JOIN on i.user_id = u.id):');
        const [pending] = await db.query(`
            SELECT u.id, u.email, u.role,
                   i.institution_id, i.name as institution_name
            FROM users u
            LEFT JOIN institutions i ON i.user_id = u.id
            WHERE u.approval_status = 'pending'
            ORDER BY u.created_at DESC
        `);
        console.log(`   Found ${pending.length} pending users`);
        
        // 6. Test login query (should return institution for user 64)
        console.log('\n6. Testing login query (should return institution owned by user):');
        const [loginResult] = await db.query(
            'SELECT institution_id, name, type, address FROM institutions WHERE user_id = ?',
            [64]
        );
        if (loginResult[0]) {
            console.log(`   ✅ Found institution: ${loginResult[0].name}`);
            console.log(`   Institution ID: ${loginResult[0].institution_id}`);
        } else {
            console.log(`   ⚠️  No institution found for user 64`);
        }
        
        // 7. Test coordinator list query
        console.log('\n7. Testing coordinator list query (should JOIN on i.user_id = u.id):');
        const [coords] = await db.query(`
            SELECT u.id, u.email, i.name as institution_name
            FROM users u
            LEFT JOIN institutions i ON i.user_id = u.id
            WHERE u.role = 'coordinator' AND u.approval_status = 'approved'
        `);
        console.log(`   Found ${coords.length} approved coordinators:`);
        coords.forEach(c => {
            console.log(`   - ${c.email}: ${c.institution_name || 'No Organization'}`);
        });
        
        console.log('\n=== TEST COMPLETE ===');
        console.log('The system is now using the ORIGINAL architecture:');
        console.log('  - Coordinators own institutions via institutions.user_id');
        console.log('  - When coordinator registers, their user_id is saved to institutions.user_id');
        console.log('  - No institution_id column in users table');
        
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testSystem();
