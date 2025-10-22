const db = require('./server/config/database');

async function dropColumn() {
    try {
        // Check for foreign keys
        console.log('=== Checking for foreign keys on users.institution_id ===');
        const [fks] = await db.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'serviceease' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'institution_id' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        console.log('Foreign keys found:', fks);
        
        for (const fk of fks) {
            console.log(`Dropping foreign key: ${fk.CONSTRAINT_NAME}`);
            await db.query(`ALTER TABLE users DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }
        
        // Now drop the column
        console.log('\n=== Dropping institution_id column ===');
        await db.query(`ALTER TABLE users DROP COLUMN institution_id`);
        console.log('✅ Column dropped successfully');
        
        // Verify
        const [cols] = await db.query('DESCRIBE users');
        const hasColumn = cols.some(col => col.Field === 'institution_id');
        console.log(`\ninstitution_id column exists: ${hasColumn}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

dropColumn();
