require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const db = await mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    const [r] = await db.query('SELECT id, name, category, item_type FROM printer_items WHERE name LIKE "%drum%"');
    console.log('Drum items:', r);
    
    // Fix the item_type to printer_part
    if (r.length > 0) {
        await db.query('UPDATE printer_items SET item_type = "printer_part" WHERE name LIKE "%drum%"');
        console.log('\nUpdated drum items to printer_part');
        
        const [r2] = await db.query('SELECT id, name, category, item_type FROM printer_items WHERE name LIKE "%drum%"');
        console.log('After update:', r2);
    }
    
    await db.end();
})();
