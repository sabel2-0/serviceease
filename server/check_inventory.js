const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'serviceease'
        });

        console.log('\n=== TECHNICIAN 2 INVENTORY ===');
        const [techInventory] = await db.query(`
            SELECT 
                ti.id,
                ti.technician_id,
                ti.item_id,
                ti.quantity,
                pp.name,
                pp.brand,
                pp.is_universal
            FROM technician_inventory ti
            JOIN printer_items pp ON ti.item_id = pp.id
            WHERE ti.technician_id = 2
            ORDER BY ti.id
        `);
        console.table(techInventory);

        console.log('\n=== ALL PRINTER PARTS ===');
        const [allParts] = await db.query(`
            SELECT 
                id,
                name,
                brand,
                quantity,
                is_universal
            FROM printer_items
            ORDER BY id
        `);
        console.table(allParts);

        console.log('\n=== SERVICE ITEMS USED (Last 5) ===');
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.service_request_id,
                spu.item_id,
                spu.quantity_used,
                pp.name,
                pp.brand,
                pp.is_universal
            FROM service_items_used spu
            JOIN printer_items pp ON spu.item_id = pp.id
            ORDER BY spu.id DESC
            LIMIT 5
        `);
        console.table(partsUsed);

        await db.end();
    } catch (error) {
        console.error('Error:', error);
    }
})();
