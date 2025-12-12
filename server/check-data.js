const db = require('./config/database');
require('dotenv').config();

async function checkData() {
    try {
        const [dbInfo] = await db.query('SELECT DATABASE() as db_name');
        console.log('Connected to database:', dbInfo[0].db_name);
        
        const [tables] = await db.query('SHOW TABLES');
        console.log('\nAvailable tables:', tables.length);
        
        const [msCount] = await db.query('SELECT COUNT(*) as cnt FROM maintenance_services');
        console.log('maintenance_services count:', msCount[0].cnt);
        
        const [msBackupCount] = await db.query('SELECT COUNT(*) as cnt FROM maintenance_services_backup_final');
        console.log('maintenance_services_backup_final count:', msBackupCount[0].cnt);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
