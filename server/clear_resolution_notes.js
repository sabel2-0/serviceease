require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // First check what we have
        const [before] = await db.query(
            'SELECT id, status, resolution_notes FROM service_requests WHERE status = ? AND resolution_notes IS NOT NULL',
            ['pending_approval']
        );
        console.log('Pending approval requests with resolution_notes BEFORE:', before.length);
        if (before.length > 0) {
            console.log(before);
        }

        // Clear resolution_notes for pending_approval requests (technician notes should not be there)
        const [result] = await db.query(
            'UPDATE service_requests SET resolution_notes = NULL WHERE status = ? AND resolution_notes IS NOT NULL',
            ['pending_approval']
        );
        console.log('Cleared resolution_notes for pending_approval requests:', result.affectedRows, 'rows');

        // Verify
        const [after] = await db.query(
            'SELECT id, status, resolution_notes FROM service_requests WHERE status = ? AND resolution_notes IS NOT NULL',
            ['pending_approval']
        );
        console.log('Pending approval requests with resolution_notes AFTER:', after.length);

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    }
})();
