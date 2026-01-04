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
    
    console.log('=== SERVICE ITEMS USED PER SERVICE ===\n');
    
    const [services] = await db.query(`
        SELECT 
            siu.service_id, 
            siu.service_type,
            sr.status,
            sr.printer_id,
            p.brand as printer_brand,
            p.model as printer_model,
            GROUP_CONCAT(pi.name) as items_used, 
            COUNT(siu.id) as item_count 
        FROM service_items_used siu 
        JOIN printer_items pi ON siu.item_id = pi.id
        LEFT JOIN service_requests sr ON siu.service_id = sr.id AND siu.service_type = 'service_request'
        LEFT JOIN printers p ON sr.printer_id = p.id
        GROUP BY siu.service_id, siu.service_type, sr.status, sr.printer_id, p.brand, p.model
        ORDER BY siu.service_id
    `);
    
    services.forEach(s => {
        console.log(`Service ${s.service_id} (${s.service_type}) - Status: ${s.status || 'N/A'}`);
        console.log(`  Printer: ${s.printer_brand || 'N/A'} ${s.printer_model || 'N/A'}`);
        console.log(`  Items (${s.item_count}): ${s.items_used}`);
        console.log('');
    });
    
    console.log('=== SUMMARY ===');
    const servicesWithMultipleItems = services.filter(s => s.item_count >= 2).length;
    console.log('Total services with items:', services.length);
    console.log('Services with 2+ items in SAME service:', servicesWithMultipleItems);
    
    // Check completed services specifically
    const [completedWithItems] = await db.query(`
        SELECT 
            sr.id,
            sr.status,
            p.brand,
            p.model,
            GROUP_CONCAT(pi.name) as items,
            COUNT(siu.id) as item_count
        FROM service_requests sr
        JOIN service_items_used siu ON sr.id = siu.service_id AND siu.service_type = 'service_request'
        JOIN printer_items pi ON siu.item_id = pi.id
        LEFT JOIN printers p ON sr.printer_id = p.id
        WHERE sr.status = 'completed'
        GROUP BY sr.id, sr.status, p.brand, p.model
    `);
    
    console.log('\n=== COMPLETED SERVICES WITH ITEMS ===');
    completedWithItems.forEach(s => {
        console.log(`Service ${s.id}: ${s.brand} ${s.model} - ${s.item_count} item(s): ${s.items}`);
    });
    
    const withMultiple = completedWithItems.filter(s => s.item_count >= 2).length;
    console.log('\n=== ARM ANALYSIS ===');
    console.log('Completed services with items:', completedWithItems.length);
    console.log('Completed services with 2+ items in SAME service:', withMultiple);
    console.log('\nFor association rules, you need at least 2 services where the SAME SERVICE has 2+ different items used together.');
    
    await db.end();
})();
