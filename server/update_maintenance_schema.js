const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'serviceease'
};

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        
        // Check current columns
        const [rows] = await conn.query('SHOW COLUMNS FROM maintenance_services');
        console.log('\nCurrent columns in maintenance_services:');
        rows.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
        
        // Add completion_photo column if it doesn't exist
        const hasCompletionPhoto = rows.some(r => r.Field === 'completion_photo');
        if (!hasCompletionPhoto) {
            console.log('\nAdding completion_photo column...');
            await conn.query('ALTER TABLE maintenance_services ADD COLUMN completion_photo VARCHAR(500) AFTER parts_used');
            console.log('✓ completion_photo column added successfully');
        } else {
            console.log('\n✓ completion_photo column already exists');
        }
        
        await conn.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
