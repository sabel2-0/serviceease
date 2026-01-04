require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Update existing records to populate display_amount from amount_consumed
        const [result] = await db.query(`
            UPDATE service_items_used 
            SET display_amount = CONCAT(CAST(amount_consumed AS DECIMAL(10,2)), 'ml')
            WHERE amount_consumed IS NOT NULL 
            AND (display_amount IS NULL OR display_amount = '')
        `);
        
        console.log('Updated display_amount for', result.affectedRows, 'rows');
        
        // Verify the update
        const [rows] = await db.query('SELECT id, amount_consumed, display_amount, consumption_type FROM service_items_used LIMIT 5');
        console.log('Sample rows:', rows);
        
        await db.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
