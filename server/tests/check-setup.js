require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Check printer assignments
    const [upa] = await db.query('SELECT * FROM user_printer_assignments WHERE user_id = 7');
    console.log('Printer assignments for user 7:', upa);
    
    // Assign printer 1 to user 7 if not already
    if (upa.length === 0) {
        await db.query('INSERT INTO user_printer_assignments (user_id, printer_id, assigned_at) VALUES (7, 1, NOW())');
        console.log('Assigned printer 1 to user 7');
    }
    
    // Reset institution_admin password (user 6)
    const pwd = await bcrypt.hash('Test@123', 10);
    await db.query('UPDATE users SET password = ? WHERE id = 6', [pwd]);
    console.log('Reset institution_admin (user 6) password to Test@123');
    
    await db.end();
})();
