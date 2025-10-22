const db = require('./server/config/database');

(async () => {
    try {
        console.log('=== Checking users table ===\n');
        
        const [users] = await db.query(`
            SELECT u.id, u.email, u.institution_id, u.role, u.approval_status, i.name as institution_name
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            WHERE u.role IN ('coordinator', 'requester')
            ORDER BY u.id DESC
        `);
        
        console.log('Coordinators and Requesters:');
        console.table(users);
        
        // Check for users with old institution links (institutions.user_id)
        const [oldLinks] = await db.query(`
            SELECT u.id, u.email, u.role, i.institution_id, i.name as institution_name
            FROM institutions i
            JOIN users u ON i.user_id = u.id
            WHERE u.role IN ('coordinator', 'requester')
        `);
        
        if (oldLinks.length > 0) {
            console.log('\n=== Users linked via institutions.user_id (OLD WAY) ===');
            console.table(oldLinks);
            
            console.log('\n=== Migrating to new institution_id column ===');
            for (const link of oldLinks) {
                await db.query(
                    'UPDATE users SET institution_id = ? WHERE id = ?',
                    [link.institution_id, link.id]
                );
                console.log(`✓ Migrated user ${link.id} (${link.email}) to institution ${link.institution_id}`);
            }
            console.log('\nMigration complete!');
        } else {
            console.log('\nNo old institution links found.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
