const db = require('./server/config/database');

async function testQuery() {
    try {
        // Check what's in the printers table
        console.log('=== PRINTERS AT PUBLIC SCHOOL INST-017 ===\n');
        const [printers] = await db.query(`
            SELECT * FROM printers WHERE institution_id = 'INST-017' LIMIT 5
        `);
        console.log(`Found ${printers.length} printers`);
        if (printers.length > 0) {
            console.log(JSON.stringify(printers, null, 2));
        }

        // Check inventory items (parts/printers) at the school
        console.log('\n=== INVENTORY ITEMS AT INST-017 ===\n');
        const [inventory] = await db.query(`
            SELECT * FROM inventory WHERE institution_id = 'INST-017' LIMIT 5
        `);
        console.log(`Found ${inventory.length} inventory items`);
        if (inventory.length > 0) {
            console.log(JSON.stringify(inventory, null, 2));
        }

        // Check user_printer_assignments
        console.log('\n=== USER PRINTER ASSIGNMENTS AT INST-017 ===\n');
        const [assignments] = await db.query(`
            SELECT upa.*, inv.name as printer_name, inv.brand, inv.model 
            FROM user_printer_assignments upa
            LEFT JOIN inventory inv ON upa.inventory_item_id = inv.id
            WHERE upa.institution_id = 'INST-017' 
            LIMIT 5
        `);
        console.log(`Found ${assignments.length} assignments`);
        if (assignments.length > 0) {
            console.log(JSON.stringify(assignments, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

testQuery();
