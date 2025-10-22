const db = require('./config/database');

async function checkCoordinators() {
    console.log('Checking coordinators...');
    
    try {
        // First check the table structure
        const [columns] = await db.execute('DESCRIBE users');
        console.log('Users table columns:');
        columns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));
        
        console.log('\n--- Coordinators ---');
        const [results] = await db.execute('SELECT id, email, role, approval_status FROM users WHERE role = "coordinator" ORDER BY id');
        
        console.log('Coordinators found:', results.length);
        results.forEach(c => {
            console.log(`  ID: ${c.id}, Email: ${c.email}, Approval Status: ${c.approval_status}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
    
    process.exit();
}

checkCoordinators();