const db = require('./server/config/database');

async function showTables() {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('=== ALL TABLES IN DATABASE ===\n');
        tables.forEach(t => console.log(Object.values(t)[0]));
        
        // Now check user_printer_assignments structure again
        console.log('\n=== USER_PRINTER_ASSIGNMENTS STRUCTURE ===\n');
        const [structure] = await db.query('DESCRIBE user_printer_assignments');
        structure.forEach(col => console.log(`${col.Field} - ${col.Type}`));
        
        // Check what data is in user_printer_assignments for INST-017
        console.log('\n=== DATA IN USER_PRINTER_ASSIGNMENTS FOR INST-017 ===\n');
        const [data] = await db.query(`
            SELECT * FROM user_printer_assignments 
            WHERE institution_id = 'INST-017' 
            LIMIT 3
        `);
        console.log(JSON.stringify(data, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

showTables();
