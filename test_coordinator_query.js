const db = require('./server/config/database');

(async () => {
    try {
        const [rows] = await db.query(`
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.status,
                u.institution_id,
                i.name as institution_name,
                i.type as institution_type
            FROM users u 
            LEFT JOIN institutions i ON u.institution_id = i.institution_id 
            WHERE u.role = 'coordinator' AND u.approval_status = 'approved'
        `);
        
        console.log('=== Coordinators Query Result ===\n');
        console.table(rows);
        
        // Format for display
        const formatted = rows.map(row => ({
            ...row,
            institutions: row.institution_name || 'No Organization'
        }));
        
        console.log('\n=== Formatted for UI ===\n');
        console.table(formatted);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
