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
    
    console.log('\n=== ARM Data Requirements Check ===\n');
    
    // Check completed service requests
    const [r1] = await db.query('SELECT COUNT(*) as cnt FROM service_requests WHERE status="completed"');
    console.log('1. Completed service requests:', r1[0].cnt);
    
    // Check service_items_used records (correct table name)
    const [r2] = await db.query('SELECT COUNT(*) as cnt FROM service_items_used WHERE service_type="service_request"');
    console.log('2. Service items used records (for service_requests):', r2[0].cnt);
    
    // Check completed requests with parts
    const [r3] = await db.query(`
        SELECT sr.id, p.brand, p.model, COUNT(siu.id) as parts_count 
        FROM service_requests sr 
        INNER JOIN service_items_used siu ON sr.id = siu.service_id AND siu.service_type = 'service_request'
        LEFT JOIN printers p ON sr.printer_id = p.id
        WHERE sr.status = 'completed'
        GROUP BY sr.id, p.brand, p.model
    `);
    console.log('3. Completed requests with parts linked:', r3.length);
    
    if (r3.length > 0) {
        console.log('\n   Sample (up to 5):');
        r3.slice(0, 5).forEach(r => console.log(`   - Request ${r.id}: ${r.brand} ${r.model} - ${r.parts_count} parts`));
    }
    
    // Check by printer brand
    const [r4] = await db.query(`
        SELECT p.brand, p.model, COUNT(DISTINCT sr.id) as service_count
        FROM service_requests sr
        INNER JOIN service_items_used siu ON sr.id = siu.service_id AND siu.service_type = 'service_request'
        INNER JOIN printers p ON sr.printer_id = p.id
        WHERE sr.status = 'completed'
        GROUP BY p.brand, p.model
        ORDER BY service_count DESC
    `);
    
    console.log('\n4. Services with parts by printer type:');
    r4.forEach(r => console.log(`   - ${r.brand} ${r.model}: ${r.service_count} completed service(s)`));
    
    // Check printer_items table
    const [r5] = await db.query('SELECT COUNT(*) as cnt FROM printer_items');
    console.log('\n5. Total printer items in inventory:', r5[0].cnt);
    
    console.log('\n=== ARM Requirements ===');
    console.log('- Minimum 2 completed services with parts for same printer brand/model');
    console.log('- Default min_support: 0.1 (10%) - pattern must appear in 10% of services');
    console.log('- Default min_confidence: 0.5 (50%) - rule must be correct 50% of the time');
    console.log('- For best results: 5+ completed services per printer type with 2+ parts each\n');
    
    await db.end();
})();
