const mysql = require('mysql2/promise');

async function testEditPrinterModel() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });
    
    console.log('\n=== BEFORE UPDATE ===');
    let [rows] = await db.query('SELECT id, brand, model, serial_number, status FROM inventory_items WHERE brand = "HP" AND model = "Laser Pro 213"');
    console.table(rows);
    
    // Simulate the PUT request that would update the brand and model
    const itemsToUpdate = rows;
    console.log(`\nFound ${itemsToUpdate.length} item(s) to update`);
    
    // Update brand from "HP" to "HP" and model from "Laser Pro 213" to "LaserJet Pro 214"
    for (const item of itemsToUpdate) {
        await db.query(
            `UPDATE inventory_items SET 
                brand = ?,
                model = ?,
                name = CONCAT(?, ' ', ?)
             WHERE id = ?`,
            ['HP', 'LaserJet Pro 214', 'HP', 'LaserJet Pro 214', item.id]
        );
        console.log(`Updated item ID: ${item.id}`);
    }
    
    console.log('\n=== AFTER UPDATE ===');
    [rows] = await db.query('SELECT id, brand, model, name, serial_number, status FROM inventory_items WHERE brand = "HP" AND model = "LaserJet Pro 214"');
    console.table(rows);
    
    // Revert back for demo purposes
    console.log('\n=== REVERTING BACK ===');
    for (const item of rows) {
        await db.query(
            `UPDATE inventory_items SET 
                brand = ?,
                model = ?,
                name = CONCAT(?, ' ', ?)
             WHERE id = ?`,
            ['HP', 'Laser Pro 213', 'HP', 'Laser Pro 213', item.id]
        );
    }
    
    [rows] = await db.query('SELECT id, brand, model, name, serial_number, status FROM inventory_items WHERE brand = "HP" AND model = "Laser Pro 213"');
    console.table(rows);
    console.log('✓ Test completed successfully!');
    
    await db.end();
}

testEditPrinterModel().catch(console.error);
