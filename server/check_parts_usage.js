const db = require('./config/database');

async function checkPartsUsage() {
    console.log('=== Checking Parts Usage in Service Requests ===');
    
    try {
        // Check what parts tables exist and their relationships
        console.log('\n1. PRINTER_PARTS table:');
        const [partsColumns] = await db.execute('DESCRIBE printer_parts');
        partsColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        console.log('\n2. SERVICE_APPROVALS table:');
        const [approvalsColumns] = await db.execute('DESCRIBE service_approvals');
        approvalsColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check if there's a parts usage table or field
        console.log('\n3. Checking for parts used in service request 51:');
        const [serviceApproval] = await db.execute(`
            SELECT sa.*, sr.request_number, sr.description
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            WHERE sa.service_request_id = 51
        `);
        
        if (serviceApproval.length > 0) {
            console.log('Service approval data:', serviceApproval[0]);
            
            // Check if there's a separate parts usage table
            console.log('\n4. Checking for parts usage tables...');
            const [tables] = await db.execute(`
                SHOW TABLES LIKE '%parts%'
            `);
            console.log('Parts-related tables:', tables);
            
            // Check technician inventory changes
            console.log('\n5. Checking technician inventory for technician 23:');
            const [inventory] = await db.execute(`
                SELECT ti.*, pp.name as part_name, pp.brand, pp.unit
                FROM technician_inventory ti
                LEFT JOIN printer_parts pp ON ti.part_id = pp.id
                WHERE ti.technician_id = 23
                ORDER BY ti.updated_at DESC
                LIMIT 10
            `);
            
            if (inventory.length > 0) {
                console.log('Recent inventory:');
                inventory.forEach(inv => {
                    console.log(`   Part: ${inv.part_name} (${inv.brand}) | Quantity: ${inv.quantity} ${inv.unit} | Updated: ${inv.updated_at}`);
                });
            }
        }
        
        // Check technician inventory for parts history
        console.log('\n4. TECHNICIAN_INVENTORY table:');
        const [inventoryColumns] = await db.execute('DESCRIBE technician_inventory');
        inventoryColumns.forEach(col => console.log(`   ${col.Field} (${col.Type})`));
        
        // Check if there are any parts records
        console.log('\n5. Sample parts data:');
        const [sampleParts] = await db.execute(`
            SELECT pp.id, pp.name, pp.brand, pp.model, pp.unit, pp.price
            FROM printer_parts pp
            ORDER BY pp.id
            LIMIT 5
        `);
        
        if (sampleParts.length > 0) {
            console.log('Sample parts:');
            sampleParts.forEach(part => {
                console.log(`   ${part.id}: ${part.name} (${part.brand} ${part.model}) - ${part.unit} @ $${part.price}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit();
}

checkPartsUsage();