const db = require('./server/config/database');

async function checkInventory() {
    try {
        console.log('=== INVENTORY_ITEMS TABLE STRUCTURE ===\n');
        const [structure] = await db.query('DESCRIBE inventory_items');
        structure.forEach(col => console.log(`${col.Field} - ${col.Type}`));
        
        console.log('\n=== INVENTORY ITEMS AT INST-017 ===\n');
        const [items] = await db.query(`
            SELECT * FROM inventory_items 
            WHERE institution_id = 'INST-017' 
            LIMIT 5
        `);
        console.log(JSON.stringify(items, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkInventory();
