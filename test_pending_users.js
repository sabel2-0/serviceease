const db = require('./server/config/database');

(async () => {
    try {
        console.log('=== Testing getPendingUsers Query ===\n');
        
        const [rows] = await db.query(`
            SELECT u.*, tp.front_id_photo, tp.back_id_photo, tp.selfie_photo,
                   i.institution_id, i.name as institution_name,
                   i.type as institution_type, i.address as institution_address
            FROM users u
            LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
            LEFT JOIN institutions i ON u.institution_id = i.institution_id
            WHERE u.approval_status = 'pending'
            ORDER BY u.created_at DESC
        `);
        
        console.log(`Found ${rows.length} pending user(s)\n`);
        
        rows.forEach(user => {
            console.log('─'.repeat(60));
            console.log(`User: ${user.first_name} ${user.last_name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`User Institution ID: ${user.institution_id}`);
            console.log(`Institution Name: ${user.institution_name}`);
            console.log(`Institution Type: ${user.institution_type}`);
            console.log(`Institution Address: ${user.institution_address}`);
            console.log(`Front ID Photo: ${user.front_id_photo || 'null'}`);
            console.log(`Back ID Photo: ${user.back_id_photo || 'null'}`);
            console.log(`Selfie Photo: ${user.selfie_photo || 'null'}`);
            console.log(`Created: ${user.created_at}`);
            console.log('─'.repeat(60));
            console.log('');
        });
        
        if (rows.length === 0) {
            console.log('✅ No pending users found. All registrations have been processed.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
