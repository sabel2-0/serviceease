const mysql = require('./server/node_modules/mysql2/promise');

async function checkAssignments() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'serviceease'
    });
    
    console.log('\n=== USER_PRINTER_ASSIGNMENTS ===');
    const [assignments] = await db.query('SELECT * FROM user_printer_assignments LIMIT 10');
    console.log(JSON.stringify(assignments, null, 2));
    
    console.log('\n=== MAINTENANCE_SERVICES ===');
    const [services] = await db.query('SELECT id, printer_id, requester_id, technician_id FROM maintenance_services WHERE id = 3');
    console.log(JSON.stringify(services, null, 2));
    
    console.log('\n=== CHECK IF USER 6 HAS ACCESS TO PRINTER FROM SERVICE 3 ===');
    const [check] = await db.query(`
        SELECT vs.id, vs.printer_id, vs.requester_id, upa.user_id
        FROM maintenance_services vs
        LEFT JOIN user_printer_assignments upa ON upa.printer_id = vs.printer_id AND upa.user_id = 6
        WHERE vs.id = 3
    `);
    console.log(JSON.stringify(check, null, 2));
    
    await db.end();
}

checkAssignments().catch(console.error);
