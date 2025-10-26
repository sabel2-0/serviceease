const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'serviceease'
    });

    try {
        console.log('Testing Coordinator Approval Audit Logging\n');
        console.log('='.repeat(60));
        
        // Check recent coordinators
        const [pending] = await connection.query(
            'SELECT id, first_name, last_name, email, approval_status FROM users WHERE role = "coordinator" ORDER BY created_at DESC LIMIT 5'
        );
        
        console.log('\nRecent Coordinator Registrations:');
        console.log('-'.repeat(60));
        pending.forEach(coord => {
            console.log(`  ID: ${coord.id} | ${coord.first_name} ${coord.last_name}`);
            console.log(`  Email: ${coord.email}`);
            console.log(`  Status: ${coord.approval_status}`);
            console.log('-'.repeat(60));
        });
        
        // Check recent audit logs
        const [auditLogs] = await connection.query(`
            SELECT 
                al.id,
                al.action,
                al.action_type,
                al.target_type,
                al.target_id,
                al.user_role,
                al.created_at,
                u.first_name,
                u.last_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 
                (al.action LIKE '%coordinator%' OR 
                 al.action LIKE '%Approved%' OR 
                 al.action LIKE '%Rejected%' OR
                 (al.target_type = 'user' AND al.action_type IN ('approve', 'reject')))
            ORDER BY al.created_at DESC
            LIMIT 10
        `);
        
        console.log('\n\nRecent Audit Logs (Coordinator Related):');
        console.log('='.repeat(60));
        
        if (auditLogs.length === 0) {
            console.log('  ⚠️  No audit logs found yet for coordinator approvals.');
            console.log('  📝 Try approving/rejecting a coordinator to test the logging.');
        } else {
            auditLogs.forEach(log => {
                console.log(`\n  Log ID: ${log.id}`);
                console.log(`  Performed by: ${log.first_name} ${log.last_name}`);
                console.log(`  Role: ${log.user_role}`);
                console.log(`  Action: ${log.action}`);
                console.log(`  Type: ${log.action_type}`);
                console.log(`  Target: ${log.target_type} #${log.target_id}`);
                console.log(`  Time: ${log.created_at}`);
                console.log('-'.repeat(60));
            });
        }
        
        const [count] = await connection.query('SELECT COUNT(*) as total FROM audit_logs');
        console.log(`\n\nTotal Audit Logs: ${count[0].total}`);
        
        await connection.end();
        console.log('\n✅ Test completed!\n');
    } catch (error) {
        console.error('Error:', error);
        await connection.end();
        process.exit(1);
    }
})();
