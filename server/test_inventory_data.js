const mysql = require('mysql2/promise');

async function checkInventory() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });
    
    console.log('\n=== Current Inventory Items ===');
    const [rows] = await db.query('SELECT id, brand, model, serial_number, status FROM inventory_items LIMIT 5');
    console.table(rows);
    
    await db.end();
}

checkInventory().catch(console.error);
