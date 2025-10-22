const db = require('./config/database');

/**
 * Migration: Reverse institution-user relationship
 * 
 * Changes:
 * 1. Add user_id column to institutions table (institutions belong to users)
 * 2. Remove institution_id column from users table (users no longer belong to institutions)
 * 3. Remove verification_token column from users table (no longer needed)
 * 
 * Business Logic Change:
 * - OLD: User belongs to an institution (many users → one institution)
 * - NEW: Institution belongs to a user (many institutions → one user, but typically one-to-one)
 * 
 * This migration:
 * - Migrates existing data: Sets institutions.user_id based on users.institution_id
 * - Handles multiple users from same institution (only first coordinator gets ownership)
 */

async function migrateInstitutionOwnership() {
    console.log('🚀 Starting institution ownership migration...\n');
    
    try {
        // Step 1: Add user_id column to institutions table
        console.log('Step 1: Adding user_id column to institutions table...');
        
        const [userIdColCheck] = await db.query(`
            SELECT COUNT(*) as cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'institutions'
              AND COLUMN_NAME = 'user_id'
        `);
        
        if (userIdColCheck[0].cnt === 0) {
            await db.query(`
                ALTER TABLE institutions 
                ADD COLUMN user_id INT NULL AFTER institution_id,
                ADD CONSTRAINT fk_institutions_user 
                    FOREIGN KEY (user_id) REFERENCES users(id) 
                    ON DELETE SET NULL
            `);
            console.log('✅ Added user_id column to institutions table\n');
        } else {
            console.log('ℹ️  user_id column already exists in institutions table\n');
        }

        // Step 2: Migrate data - assign institutions to users
        console.log('Step 2: Migrating institution ownership data...');
        
        // For each institution, find the first coordinator who belongs to it and assign ownership
        const [institutions] = await db.query(`
            SELECT i.institution_id, i.id, i.name
            FROM institutions i
            WHERE i.user_id IS NULL
        `);
        
        console.log(`Found ${institutions.length} institutions without ownership`);
        
        let assignedCount = 0;
        let unassignedCount = 0;
        
        for (const inst of institutions) {
            // Find first coordinator/requester with this institution_id
            const [users] = await db.query(`
                SELECT id, first_name, last_name, role
                FROM users
                WHERE institution_id = ?
                  AND role IN ('coordinator', 'requester')
                ORDER BY 
                    CASE role 
                        WHEN 'coordinator' THEN 1 
                        WHEN 'requester' THEN 2 
                        ELSE 3 
                    END,
                    created_at ASC
                LIMIT 1
            `, [inst.institution_id]);
            
            if (users.length > 0) {
                const user = users[0];
                await db.query(`
                    UPDATE institutions 
                    SET user_id = ? 
                    WHERE institution_id = ?
                `, [user.id, inst.institution_id]);
                
                console.log(`  ✅ Assigned "${inst.name}" to ${user.first_name} ${user.last_name} (${user.role})`);
                assignedCount++;
            } else {
                console.log(`  ⚠️  No user found for institution "${inst.name}" (${inst.institution_id})`);
                unassignedCount++;
            }
        }
        
        console.log(`\n📊 Migration summary: ${assignedCount} assigned, ${unassignedCount} unassigned\n`);

        // Step 3: Show data before removing columns
        console.log('Step 3: Sample data before column removal:');
        const [sampleBefore] = await db.query(`
            SELECT u.id, u.email, u.role, u.institution_id, u.verification_token,
                   i.institution_id as inst_id, i.name as institution_name, i.user_id
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            LIMIT 3
        `);
        console.table(sampleBefore);

        // Step 4: Remove verification_token column from users
        console.log('\nStep 4: Removing verification_token column from users table...');
        
        try {
            const [verificationTokenCheck] = await db.query(`
                SELECT COUNT(*) as cnt
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME = 'verification_token'
            `);
            
            if (verificationTokenCheck[0].cnt > 0) {
                await db.query(`ALTER TABLE users DROP COLUMN verification_token`);
                console.log('✅ Removed verification_token column\n');
            } else {
                console.log('ℹ️  verification_token column already removed\n');
            }
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️  verification_token column does not exist\n');
            } else {
                throw error;
            }
        }

        // Step 5: Remove institution_id column from users (and foreign key)
        console.log('Step 5: Removing institution_id column from users table...');
        
        try {
            // First drop the foreign key constraint if it exists
            try {
                await db.query(`ALTER TABLE users DROP FOREIGN KEY fk_users_institution`);
                console.log('  ✅ Dropped foreign key constraint fk_users_institution');
            } catch (e) {
                console.log('  ℹ️  Foreign key fk_users_institution does not exist or already dropped');
            }
            
            // Then drop the column
            const [institutionIdCheck] = await db.query(`
                SELECT COUNT(*) as cnt
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME = 'institution_id'
            `);
            
            if (institutionIdCheck[0].cnt > 0) {
                await db.query(`ALTER TABLE users DROP COLUMN institution_id`);
                console.log('  ✅ Removed institution_id column from users table\n');
            } else {
                console.log('  ℹ️  institution_id column already removed from users table\n');
            }
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('  ℹ️  institution_id column does not exist\n');
            } else {
                throw error;
            }
        }

        // Step 6: Verify final structure
        console.log('Step 6: Verifying final table structures...\n');
        
        console.log('📋 Users table columns:');
        const [usersCols] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `);
        console.table(usersCols);
        
        console.log('\n📋 Institutions table columns:');
        const [instCols] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'institutions'
            ORDER BY ORDINAL_POSITION
        `);
        console.table(instCols);

        // Step 7: Show sample data after migration
        console.log('\nStep 7: Sample data after migration:');
        const [sampleAfter] = await db.query(`
            SELECT u.id, u.email, u.role,
                   i.institution_id, i.name as institution_name, i.user_id
            FROM users u
            LEFT JOIN institutions i ON i.user_id = u.id
            LIMIT 5
        `);
        console.table(sampleAfter);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📌 Summary:');
        console.log('   - Added: institutions.user_id (FK to users.id)');
        console.log('   - Removed: users.institution_id');
        console.log('   - Removed: users.verification_token');
        console.log('   - Data migrated: Institutions now belong to users');
        console.log('   - New relationship: Users can own multiple institutions (though typically one-to-one)');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        await db.end();
        process.exit(0);
    }
}

// Run migration
migrateInstitutionOwnership().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
