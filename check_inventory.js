const mysql = require('mysql2/promise');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'serviceease'
        });

        console.log('\n=== TECHNICIAN 2 INVENTORY ===');
        const [techInventory] = await db.query(`
            SELECT 
                ti.id,
                ti.technician_id,
                ti.part_id,
                ti.quantity,
                pp.name,
                pp.brand,
                pp.is_universal
            FROM technician_inventory ti
            JOIN printer_parts pp ON ti.part_id = pp.id
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
            FROM printer_parts
            ORDER BY id
        `);
        console.table(allParts);

        console.log('\n=== SERVICE PARTS USED (Last 5) ===');
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.service_request_id,
                spu.part_id,
                spu.quantity_used,
                pp.name,
                pp.brand,
                pp.is_universal
            FROM service_parts_used spu
            JOIN printer_parts pp ON spu.part_id = pp.id
            ORDER BY spu.id DESC
            LIMIT 5
        `);
        console.table(partsUsed);

        await db.end();
    } catch (error) {
        console.error('Error:', error);
    }
})();
