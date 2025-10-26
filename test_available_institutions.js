const db = require('./server/config/database');

(async () => {
    try {
        console.log('Checking institutions...\n');
        
        // Check all institutions
        const [all] = await db.query('SELECT institution_id, name, user_id, status FROM institutions LIMIT 10');
        console.log('Sample institutions:');
        all.forEach(inst => {
            console.log(`  - ${inst.name} (${inst.institution_id}): user_id=${inst.user_id}, status=${inst.status}`);
        });
        
        // Check available institutions (no user_id assigned)
        const [available] = await db.query(
            'SELECT institution_id, name, user_id, status FROM institutions WHERE user_id IS NULL AND status = "active"'
        );
        console.log(`\n✓ Available institutions for registration: ${available.length}`);
        available.forEach(inst => {
            console.log(`  - ${inst.name} (${inst.institution_id})`);
        });
        
        // Check used institutions
        const [used] = await db.query(
            'SELECT institution_id, name, user_id, status FROM institutions WHERE user_id IS NOT NULL'
        );
        console.log(`\n✗ Already used institutions: ${used.length}`);
        used.forEach(inst => {
            console.log(`  - ${inst.name} (${inst.institution_id}) - Assigned to user_id: ${inst.user_id}`);
        });
        
        await db.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
