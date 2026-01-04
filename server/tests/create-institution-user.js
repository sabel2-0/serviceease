require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Check if institution_user already exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', ['test.requester@gmail.com']);
        if (existing.length > 0) {
            console.log('Institution user already exists with ID:', existing[0].id);
            await db.end();
            return;
        }

        // Create institution_user
        const password = await bcrypt.hash('Test@123', 10);
        const [result] = await db.query(
            `INSERT INTO users (first_name, last_name, email, password, role, status, approval_status, is_email_verified, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            ['Test', 'Requester', 'test.requester@gmail.com', password, 'institution_user', 'active', 'approved', 1]
        );
        const userId = result.insertId;
        console.log('Created institution_user with ID:', userId);

        // Get a printer from INST-001
        const [printers] = await db.query('SELECT id, name FROM printers WHERE institution_id = ? LIMIT 1', ['INST-001']);
        if (printers.length > 0) {
            // Assign printer to institution_user
            await db.query('INSERT INTO user_printer_assignments (user_id, printer_id, assigned_at) VALUES (?, ?, NOW())', [userId, printers[0].id]);
            console.log('Assigned printer', printers[0].id, printers[0].name, 'to institution_user');
        } else {
            console.log('No printers found for INST-001');
        }

        console.log('\nInstitution user credentials:');
        console.log('Email: test.requester@gmail.com');
        console.log('Password: Test@123');

    } catch (e) {
        console.error('Error:', e.message);
    }
    
    await db.end();
})();
