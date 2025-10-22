const db = require('./config/database');

(async () => {
    try {
        console.log('Checking technician users...\n');
        
        const [users] = await db.query(`
            SELECT id, email, first_name, last_name, role
            FROM users
            WHERE role = 'technician'
            ORDER BY id
        `);
        
        console.log(`Found ${users.length} technicians:\n`);
        users.forEach(user => {
            console.log(`ID: ${user.id}`);
            console.log(`  Name: ${user.first_name} ${user.last_name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Role: ${user.role}`);
            console.log('');
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
