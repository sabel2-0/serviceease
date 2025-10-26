const db = require('./server/config/database');

(async () => {
    try {
        console.log('Checking Recent Audit Logs...\n');
        
        const [logs] = await db.query(`
            SELECT 
                al.id,
                al.action,
                al.action_type,
                al.target_type,
                al.target_id,
                al.details,
                al.user_role,
                al.created_at,
                u.first_name,
                u.last_name,
                u.email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY al.created_at DESC
            LIMIT 10
        `);
        
        if (logs.length === 0) {
            console.log('No audit logs found in the last hour.');
        } else {
            logs.forEach((log, index) => {
                console.log(`\n${'='.repeat(80)}`);
                console.log(`Log #${index + 1} (ID: ${log.id})`);
                console.log(`${'='.repeat(80)}`);
                console.log(`Timestamp: ${log.created_at}`);
                console.log(`Performed by: ${log.first_name} ${log.last_name} (${log.email})`);
                console.log(`Role: ${log.user_role}`);
                console.log(`Action Type: ${log.action_type}`);
                console.log(`Target: ${log.target_type} #${log.target_id}`);
                console.log(`\nAction Description:`);
                console.log(`  ${log.action}`);
                console.log(`\nDetails:`);
                try {
                    const details = JSON.parse(log.details);
                    console.log(JSON.stringify(details, null, 2));
                } catch (e) {
                    console.log(`  ${log.details}`);
                }
            });
        }
        
        await db.end();
        console.log('\n\n✅ Check completed!\n');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
