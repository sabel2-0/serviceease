const mysql = require('mysql2/promise');

async function testDeduction() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    try {
        console.log('\n=== BEFORE APPROVAL ===');
        console.log('\nTechnician Inventory:');
        const [invBefore] = await conn.query(`
            SELECT ti.*, pp.name, pp.brand 
            FROM technician_inventory ti
            JOIN printer_parts pp ON ti.part_id = pp.id
            WHERE ti.technician_id = 3
        `);
        console.table(invBefore);

        console.log('\nService Request 7 Details:');
        const [sr] = await conn.query(`
            SELECT id, request_number, status, assigned_technician_id, resolved_by, is_walk_in
            FROM service_requests 
            WHERE id = 7
        `);
        console.table(sr);

        console.log('\nParts Used in Service Request 7:');
        const [parts] = await conn.query(`
            SELECT spu.*, pp.name, pp.brand
            FROM service_parts_used spu
            JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE spu.service_request_id = 7
        `);
        console.table(parts);

        // Calculate expected inventory after deduction
        console.log('\n=== EXPECTED AFTER DEDUCTION ===');
        const partsTotals = {};
        parts.forEach(p => {
            if (!partsTotals[p.part_id]) {
                partsTotals[p.part_id] = 0;
            }
            partsTotals[p.part_id] += p.quantity_used;
        });

        invBefore.forEach(inv => {
            const used = partsTotals[inv.part_id] || 0;
            console.log(`${inv.name} (${inv.brand}): ${inv.quantity} - ${used} = ${inv.quantity - used}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await conn.end();
    }
}

testDeduction();
