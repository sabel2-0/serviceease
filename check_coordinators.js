const mysql = require('mysql2/promise');

async function checkCoordinators() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'serviceease_db'
    });

    console.log('=== Checking available coordinators ===');
    
    const [coordinators] = await connection.execute(`
        SELECT id, email, role, institution_id, is_approved 
        FROM users 
        WHERE role = 'coordinator'
        ORDER BY id
    `);
    
    console.log('Coordinators found:', coordinators.length);
    coordinators.forEach(coord => {
        console.log(`  ID: ${coord.id}, Email: ${coord.email}, Institution: ${coord.institution_id}, Approved: ${coord.is_approved}`);
    });
    
    await connection.end();
}

checkCoordinators().catch(console.error);