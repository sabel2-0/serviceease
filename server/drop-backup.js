const mysql = require('mysql2/promise');

async function dropBackup() {
    const connection = await mysql.createConnection({
        host: 'trolley.proxy.rlwy.net',
        port: 17038,
        user: 'root',
        password: 'cBradZvPfObqGtuJMzBBwVSYpDKYYQsZ',
        database: 'railway'
    });

    try {
        console.log('Dropping maintenance_services_backup_final table...');
        await connection.query('DROP TABLE IF EXISTS maintenance_services_backup_final');
        console.log('Table dropped successfully!');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

dropBackup();
