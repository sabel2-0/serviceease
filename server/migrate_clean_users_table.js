const db = require('./config/database');

/**
 * Migration: Clean up users table by removing redundant institution columns
 * 
 * Changes:
 * - Remove institution_type column (data exists in institutions table)
 * - Remove institution_name column (data exists in institutions table)  
 * - Remove institution_address column (data exists in institutions table)
 * - Remove department column (not used consistently)
 * - Keep institution_id as the only link to institutions table
 * 
 * This migration assumes:
 * 1. Users already have institution_id populated
 * 2. The institutions table contains all institution data
 * 3. Foreign key constraint exists between users.institution_id and institutions.institution_id
 */

async function migrateCleanUsersTable() {
    console.log('🚀 Starting users table cleanup migration...\n');
    
    try {
        // Step 1: Verify institution_id column exists
        console.log('Step 1: Verifying institution_id column exists...');
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'institution_id'
        `);
        
        if (columns.length === 0) {
            throw new Error('❌ institution_id column does not exist in users table! Cannot proceed.');
        }
        console.log('✅ institution_id column exists\n');

        // Step 2: Check how many users have NULL institution_id
        console.log('Step 2: Checking for users with NULL institution_id...');
        const [nullCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE institution_id IS NULL 
              AND role IN ('coordinator', 'requester')
        `);
        
        if (nullCount[0].count > 0) {
            console.log(`⚠️  Warning: ${nullCount[0].count} coordinators/requesters have NULL institution_id`);
            console.log('   These users may need manual data cleanup after migration.\n');
        } else {
            console.log('✅ All coordinators/requesters have institution_id set\n');
        }

        // Step 3: Show sample data before migration
        console.log('Step 3: Sample data before migration:');
        const [sampleBefore] = await db.query(`
            SELECT id, email, role, institution_id, institution_type, institution_name
            FROM users
            LIMIT 3
        `);
        console.table(sampleBefore);

        // Step 4: Drop redundant columns
        console.log('\nStep 4: Dropping redundant columns...');
        
        const columnsToDrop = [
            'institution_type',
            'institution_name', 
            'institution_address',
            'department'
        ];

        for (const columnName of columnsToDrop) {
            try {
                // Check if column exists first
                const [colExists] = await db.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'users'
                      AND COLUMN_NAME = ?
                `, [columnName]);

                if (colExists.length > 0) {
                    await db.query(`ALTER TABLE users DROP COLUMN ${columnName}`);
                    console.log(`  ✅ Dropped column: ${columnName}`);
                } else {
                    console.log(`  ℹ️  Column ${columnName} already dropped`);
                }
            } catch (error) {
                if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`  ℹ️  Column ${columnName} does not exist (already dropped)`);
                } else {
                    throw error;
                }
            }
        }

        // Step 5: Verify final structure
        console.log('\nStep 5: Verifying final table structure...');
        const [finalColumns] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('\n📋 Final users table structure:');
        console.table(finalColumns);

        // Step 6: Show sample data after migration
        console.log('\nStep 6: Sample data after migration:');
        const [sampleAfter] = await db.query(`
            SELECT u.id, u.email, u.role, u.institution_id, i.name as institution_name, i.type as institution_type
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            LIMIT 3
        `);
        console.table(sampleAfter);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📌 Summary:');
        console.log('   - Removed: institution_type, institution_name, institution_address, department');
        console.log('   - Kept: institution_id (FK to institutions table)');
        console.log('   - Institution data now accessed via JOIN with institutions table');
        
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
migrateCleanUsersTable().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
