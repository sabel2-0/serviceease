const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigration() {
    try {
        console.log('Starting migration...');
        
        const migrationPath = path.join(__dirname, 'migrations', 'password_reset_and_requester_registration.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                try {
                    await db.query(statement);
                    console.log(`✓ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    // Ignore errors for already existing columns
                    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name')) {
                        console.log(`⚠ Statement ${i + 1} skipped (column already exists)`);
                    } else {
                        throw error;
                    }
                }
            }
        }
        
        console.log('\n✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
