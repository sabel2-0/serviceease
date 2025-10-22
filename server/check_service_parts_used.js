const db = require('./config/database');

async function checkServicePartsUsed() {
    console.log('=== Checking Service Parts Used Tables ===');
    
    try {
        // Check service_parts_used table
        console.log('\n1. SERVICE_PARTS_USED table:');
        const [partsUsedColumns] = await db.execute('DESCRIBE service_parts_used');
        partsUsedColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check service_request_parts table
        console.log('\n2. SERVICE_REQUEST_PARTS table:');
        const [requestPartsColumns] = await db.execute('DESCRIBE service_request_parts');
        requestPartsColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check parts used for service request 51
        console.log('\n3. Parts used in service request 51 (service_parts_used):');
        const [partsUsed] = await db.execute(`
            SELECT spu.*, pp.name, pp.brand, pp.unit, pp.category
            FROM service_parts_used spu
            LEFT JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE spu.service_request_id = 51
        `);
        
        if (partsUsed.length > 0) {
            console.log('Parts used via service_parts_used:');
            partsUsed.forEach(part => {
                console.log(`   ${part.name} (${part.brand}) | Quantity: ${part.quantity_used} ${part.unit} | Category: ${part.category}`);
            });
        } else {
            console.log('   No parts found in service_parts_used');
        }
        
        // Check parts used for service request 51 via service_request_parts
        console.log('\n4. Parts used in service request 51 (service_request_parts):');
        const [requestParts] = await db.execute(`
            SELECT srp.*, pp.name, pp.brand, pp.unit, pp.category
            FROM service_request_parts srp
            LEFT JOIN printer_parts pp ON srp.part_name = pp.name
            WHERE srp.request_id = 51
        `);
        
        if (requestParts.length > 0) {
            console.log('Parts used via service_request_parts:');
            requestParts.forEach(part => {
                console.log(`   ${part.name} (${part.brand}) | Quantity: ${part.quantity} ${part.unit} | Category: ${part.category}`);
            });
        } else {
            console.log('   No parts found in service_request_parts');
        }
        
        // Check technician inventory (correct column names)
        console.log('\n5. Technician inventory structure:');
        const [inventoryColumns] = await db.execute('DESCRIBE technician_inventory');
        inventoryColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check recent inventory for technician 23
        console.log('\n6. Recent technician inventory:');
        const [inventory] = await db.execute(`
            SELECT ti.*, pp.name as part_name, pp.brand, pp.unit
            FROM technician_inventory ti
            LEFT JOIN printer_parts pp ON ti.part_id = pp.id
            WHERE ti.technician_id = 23
            ORDER BY ti.created_at DESC
            LIMIT 5
        `);
        
        if (inventory.length > 0) {
            console.log('Recent inventory:');
            inventory.forEach(inv => {
                console.log(`   Part: ${inv.part_name} (${inv.brand}) | Quantity: ${inv.quantity} ${inv.unit}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit();
}

checkServicePartsUsed();