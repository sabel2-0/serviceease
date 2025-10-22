const db = require('./server/config/database');

async function checkPhotoData() {
    try {
        console.log('Checking temp_user_photos table...\n');
        
        // Check the table structure
        const [columns] = await db.query('DESCRIBE temp_user_photos');
        console.log('Table structure:');
        console.table(columns);
        
        // Check existing data
        const [photos] = await db.query('SELECT * FROM temp_user_photos');
        console.log('\nExisting photo records:');
        console.table(photos);
        
        // Check users with pending status
        const [users] = await db.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.approval_status,
                   tp.front_id_photo, tp.back_id_photo, tp.selfie_photo
            FROM users u
            LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
            WHERE u.approval_status = 'pending'
        `);
        console.log('\nPending users with photo info:');
        console.table(users);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPhotoData();
