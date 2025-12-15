const db = require('./config/database');
const fs = require('fs');

async function runMigration() {
    try {
        const sql = fs.readFileSync('../rename_parts_used_to_items_used_maintenance_services.sql', 'utf8');
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                const [results] = await db.query(statement);
                console.log('✅ Success:', JSON.stringify(results, null, 2));
            }
        }
        
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
