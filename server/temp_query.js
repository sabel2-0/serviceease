const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Natusv1ncere.',
    database: process.env.DB_NAME || 'serviceease',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function runQuery() {
    try {
        const [rows] = await promisePool.query(`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'serviceease'
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
        `);

        console.log('Database Schema:');
        console.log('================');
        rows.forEach(row => {
            console.log(`${row.TABLE_NAME}.${row.COLUMN_NAME}: ${row.DATA_TYPE} ${row.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${row.COLUMN_DEFAULT ? `DEFAULT ${row.COLUMN_DEFAULT}` : ''}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error executing query:', error);
        process.exit(1);
    }
}

runQuery();