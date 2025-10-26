const db = require('./server/config/database');

(async () => {
    try {
        console.log('Testing Coordinator Approval Audit Logging\n');
        console.log('='.repeat(60));
        
        // Check if there are any pending coordinators
        const [pending] = await db.query(
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
        
        // Check recent audit logs related to coordinator approvals
        const [auditLogs] = await db.query(`
            SELECT 
                al.id,
                al.action,
                al.action_type,
                al.target_type,
                al.target_id,
                al.user_role,
                al.created_at,
                u.first_name,
                u.last_name,
                u.email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 
                (al.action LIKE '%coordinator%' OR 
                 al.action LIKE '%Approved%' OR 
                 al.action LIKE '%Rejected%' OR
                 al.target_type = 'user' AND al.action_type IN ('approve', 'reject'))
            ORDER BY al.created_at DESC
            LIMIT 10
        `);
        
        console.log('\n\nRecent Audit Logs (Coordinator Related):');
        console.log('='.repeat(60));
        
        if (auditLogs.length === 0) {
            console.log('  ⚠️  No audit logs found yet for coordinator approvals.');
            console.log('  📝 Try approving/rejecting a coordinator and check again.');
        } else {
            auditLogs.forEach(log => {
                console.log(`\n  Log ID: ${log.id}`);
                console.log(`  Performed by: ${log.first_name} ${log.last_name} (${log.email})`);
                console.log(`  Role: ${log.user_role}`);
                console.log(`  Action: ${log.action}`);
                console.log(`  Type: ${log.action_type}`);
                console.log(`  Target: ${log.target_type} #${log.target_id}`);
                console.log(`  Time: ${log.created_at}`);
                console.log('-'.repeat(60));
            });
        }
        
        // Count total audit logs
        const [count] = await db.query('SELECT COUNT(*) as total FROM audit_logs');
        console.log(`\n\nTotal Audit Logs in Database: ${count[0].total}`);
        
        await db.end();
        console.log('\n✅ Test completed successfully!\n');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
