const mysql = require('./server/node_modules/mysql2/promise');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Natusv1ncere.',
            database: 'serviceease'
        });

        console.log('Checking completion data for Request #6...\n');

        const [requests] = await db.query(`
            SELECT 
                id, 
                request_number, 
                completion_photo_url, 
                resolution_notes,
                status,
                technician_id
            FROM service_requests 
            WHERE id = 6
        `);

        if (requests.length > 0) {
            const req = requests[0];
            console.log('Service Request:');
            console.log(`  ID: ${req.id}`);
            console.log(`  Number: ${req.request_number}`);
            console.log(`  Status: ${req.status}`);
            console.log(`  Technician: ${req.technician_id}`);
            console.log(`  Resolution Notes: ${req.resolution_notes || 'NULL'}`);
            console.log(`  Completion Photo URL: ${req.completion_photo_url || 'NULL'}`);
        } else {
            console.log('Request #6 not found');
        }

        console.log('\nParts Used:');
        const [parts] = await db.query(`
            SELECT 
                spu.id,
                spu.service_request_id,
                spu.part_id,
                spu.quantity_used,
                spu.notes,
                pp.name as part_name,
                pp.brand,
                pp.unit,
                pp.category
            FROM service_parts_used spu
            JOIN printer_items pp ON spu.part_id = pp.id
            WHERE spu.service_request_id = 6
        `);

        if (parts.length > 0) {
            parts.forEach(part => {
                console.log(`  - ${part.part_name} (${part.brand}): ${part.quantity_used} ${part.unit || 'pieces'}`);
                console.log(`    Part ID: ${part.part_id}, Category: ${part.category || 'N/A'}`);
            });
        } else {
            console.log('  No parts found');
        }

        await db.end();
    } catch (error) {
        console.error('Error:', error);
    }
})();
