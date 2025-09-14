const db = require('../config/database');

async function listUsers() {
    const [rows] = await db.query(
        'SELECT id, first_name, last_name, email, role, approval_status, is_email_verified FROM users ORDER BY id DESC LIMIT 100'
    );
    console.table(rows);
}

async function promoteByEmail(email) {
    const [rows] = await db.query('SELECT id, email, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
        console.error(`No user found with email: ${email}`);
        process.exit(1);
    }
    const userId = rows[0].id;
    await db.query(
        'UPDATE users SET role = "admin", approval_status = "approved", is_email_verified = TRUE, updated_at = NOW() WHERE id = ?',
        [userId]
    );
    const [updated] = await db.query('SELECT id, email, role, approval_status, is_email_verified FROM users WHERE id = ?', [userId]);
    console.table(updated);
}

(async () => {
    try {
        const [, , action, value] = process.argv;
        if (!action || action === 'list') {
            await listUsers();
            process.exit(0);
        }
        if (action === 'promote' && value) {
            await promoteByEmail(value);
            process.exit(0);
        }
        console.log('Usage:');
        console.log('  node server/scripts/promote_to_admin.js list');
        console.log('  node server/scripts/promote_to_admin.js promote user@example.com');
        process.exit(1);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();


