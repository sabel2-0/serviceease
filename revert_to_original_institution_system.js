const db = require('./server/config/database');

async function revertToOriginalSystem() {
    try {
        console.log('=== REVERTING TO ORIGINAL INSTITUTION SYSTEM ===\n');
        
        // Step 1: Migrate data from users.institution_id to institutions.user_id
        console.log('Step 1: Migrating data from users.institution_id to institutions.user_id...');
        const [usersWithInstitutions] = await db.query(`
            SELECT id, institution_id 
            FROM users 
            WHERE institution_id IS NOT NULL AND role = 'coordinator'
        `);
        
        console.log(`Found ${usersWithInstitutions.length} coordinators with institution_id set`);
        
        for (const user of usersWithInstitutions) {
            console.log(`  Setting institutions.user_id = ${user.id} for institution ${user.institution_id}`);
            await db.query(`
                UPDATE institutions 
                SET user_id = ? 
                WHERE institution_id = ?
            `, [user.id, user.institution_id]);
        }
        
        // Step 2: Drop the foreign key constraint first
        console.log('\nStep 2: Dropping foreign key constraint on users.institution_id...');
        try {
            await db.query(`
                ALTER TABLE users 
                DROP FOREIGN KEY users_ibfk_1
            `);
            console.log('  Foreign key constraint dropped');
        } catch (error) {
            console.log('  Foreign key constraint does not exist or already dropped');
        }
        
        // Step 3: Remove the institution_id column from users table
        console.log('\nStep 3: Removing institution_id column from users table...');
        try {
            await db.query(`ALTER TABLE users DROP COLUMN institution_id`);
            console.log('  Column removed');
        } catch (error) {
            console.log('  Column does not exist or already removed');
        }
        
        // Step 4: Verify the changes
        console.log('\n=== VERIFICATION ===');
        console.log('\nUsers table structure:');
        const [usersColumns] = await db.query('DESCRIBE users');
        const hasInstitutionId = usersColumns.some(col => col.Field === 'institution_id');
        console.log(`  institution_id column exists: ${hasInstitutionId}`);
        
        console.log('\nInstitutions with owners:');
        const [institutions] = await db.query('SELECT institution_id, name, user_id FROM institutions WHERE user_id IS NOT NULL');
        console.table(institutions);
        
        console.log('\n✅ Migration complete!');
        console.log('The system now uses institutions.user_id to link coordinators to their institutions.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

revertToOriginalSystem();
