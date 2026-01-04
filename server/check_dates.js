require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const db = await mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    // Check MySQL timezone
    const [tz] = await db.query(`SELECT @@global.time_zone, @@session.time_zone, NOW() as mysql_now`);
    console.log('=== MySQL Timezone ===');
    console.log(JSON.stringify(tz, null, 2));
    
    console.log('\n=== All Maintenance Services ===');
    const [ms] = await db.query(`
        SELECT id, 
               DATE_FORMAT(completed_at, '%Y-%m-%d') as service_date_mysql, 
               completed_at,
               status, 
               institution_id 
        FROM maintenance_services 
        WHERE status IN ('completed', 'rejected') 
        ORDER BY completed_at DESC LIMIT 20
    `);
    console.log(JSON.stringify(ms, null, 2));
    
    console.log('\n=== Services completed on/after Jan 5 2026 UTC ===');
    const [jan5] = await db.query(`
        SELECT id, request_number, 
               DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s') as completed_mysql, 
               completed_at,
               status
        FROM service_requests 
        WHERE completed_at >= '2026-01-05 00:00:00'
        ORDER BY completed_at DESC LIMIT 10
    `);
    console.log(JSON.stringify(jan5, null, 2));
    
    await db.end();
    process.exit(0);
})();
