const db = require('../config/database');

async function approveCoordinator(email, institutionId) {
    const [rows] = await db.query('SELECT id, email, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
        console.error(`No user found with email: ${email}`);
        process.exit(1);
    }
    const userId = rows[0].id;
    await db.query(
        'UPDATE users SET approval_status = "approved", institution_id = ?, updated_at = NOW() WHERE id = ?',
        [institutionId, userId]
    );
    const [updated] = await db.query('SELECT id, email, role, approval_status, institution_id FROM users WHERE id = ?', [userId]);
    console.table(updated);
}

(async () => {
    try {
        const [, , action, email, institutionId] = process.argv;
        if (action === 'approve' && email && institutionId) {
            await approveCoordinator(email, institutionId);
            process.exit(0);
        }
        console.log('Usage:');
        console.log('  node server/scripts/approve_coordinator.js approve user@example.com INST-004');
        process.exit(1);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
