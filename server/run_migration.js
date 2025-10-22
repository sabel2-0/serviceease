const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Starting database migration...');
        
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'config', 'update_parts_brand_migration.sql'), 'utf8');
        
        // Split SQL statements (basic approach)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    console.log('Executing:', statement.substring(0, 50) + '...');
                    await db.query(statement);
                    console.log('✓ Statement executed successfully');
                } catch (error) {
                    if (error.message.includes('Duplicate column name') || 
                        error.message.includes('already exists')) {
                        console.log('⚠ Statement skipped (already exists):', error.message);
                    } else {
                        console.error('✗ Statement failed:', error.message);
                    }
                }
            }
        }
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();