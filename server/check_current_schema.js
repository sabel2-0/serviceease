const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkSchema() {
    const db = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'serviceease',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log('=== USERS TABLE ===');
    const [usersColumns] = await db.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION
    `);
    console.log(usersColumns.filter(c => c.COLUMN_NAME.includes('institution')));

    console.log('\n=== INSTITUTIONS TABLE ===');
    const [instColumns] = await db.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'serviceease' AND TABLE_NAME = 'institutions'
        ORDER BY ORDINAL_POSITION
    `);
    console.log(instColumns.filter(c => c.COLUMN_NAME.includes('user')));

    console.log('\n=== USER 64 DATA ===');
    const [user64] = await db.query('SELECT id, email, role, institution_id FROM users WHERE id = 64');
    console.log(user64);

    console.log('\n=== INST-017 DATA ===');
    const [inst017] = await db.query('SELECT institution_id, name, user_id FROM institutions WHERE institution_id = "INST-017"');
    console.log(inst017);

    await db.end();
}

checkSchema().catch(console.error);
