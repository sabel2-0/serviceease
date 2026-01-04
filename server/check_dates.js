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
    
    console.log('=== Maintenance Services ===');
    const [ms] = await db.query(`
        SELECT id, DATE(created_at) as service_date, created_at, status, institution_id 
        FROM maintenance_services 
        WHERE status IN ('completed', 'rejected') 
        ORDER BY created_at DESC LIMIT 10
    `);
    console.log(JSON.stringify(ms, null, 2));
    
    console.log('\n=== Service Requests (non-walkin) ===');
    const [sr] = await db.query(`
        SELECT id, request_number, DATE(COALESCE(completed_at, created_at)) as service_date, 
               completed_at, created_at, status, institution_id, is_walk_in
        FROM service_requests 
        WHERE status IN ('completed', 'rejected') 
        AND (is_walk_in = 0 OR is_walk_in IS NULL)
        ORDER BY created_at DESC LIMIT 10
    `);
    console.log(JSON.stringify(sr, null, 2));
    
    await db.end();
    process.exit(0);
})();
