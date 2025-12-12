const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPrintersSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to Railway database');
        
        // Show printers table structure
        const [columns] = await connection.query('DESCRIBE printers');
        
        console.log('\n=== PRINTERS TABLE STRUCTURE ===');
        console.log(columns);
        
        // Check if department column exists
        const hasDepartment = columns.some(col => col.Field === 'department');
        console.log('\n=== DEPARTMENT COLUMN EXISTS? ===');
        console.log(hasDepartment ? 'YES ✓' : 'NO ✗');
        
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkPrintersSchema();
