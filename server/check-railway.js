const mysql = require('mysql2/promise');

async function checkRailway() {
    const connection = await mysql.createConnection({
        host: 'trolley.proxy.rlwy.net',
        port: 17038,
        user: 'root',
        password: 'cBradZvPfObqGtuJMzBBwVSYpDKYYQsZ',
        database: 'railway'
    });

    try {
        console.log('Connected to Railway database!\n');
        
        const [msCount] = await connection.query('SELECT COUNT(*) as total FROM maintenance_services');
        console.log('Total maintenance_services:', msCount[0].total);
        
        const [services] = await connection.query('SELECT id, institution_id, printer_id, status, DATE(created_at) as date FROM maintenance_services LIMIT 5');
        console.log('\nFirst 5 services:');
        services.forEach(s => console.log('  ID', s.id, '- Institution:', s.institution_id, '- Printer:', s.printer_id, '- Date:', s.date, '- Status:', s.status));
        
        const [institutions] = await connection.query('SELECT institution_id, name, type FROM institutions WHERE type = "public_school"');
        console.log('\nPublic schools:', institutions.length);
        institutions.forEach(i => console.log('  ', i.institution_id, '-', i.name));
        
        const [publicServices] = await connection.query('SELECT COUNT(*) as total FROM maintenance_services ms JOIN institutions i ON ms.institution_id = i.institution_id WHERE i.type = "public_school"');
        console.log('\nMaintenance services for public schools:', publicServices[0].total);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

checkRailway();
