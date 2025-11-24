const mysql = require('mysql2/promise');

async function checkTables() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    try {
        console.log('\n=== Checking service_parts_used table ===');
        const [columns1] = await connection.query('DESCRIBE service_parts_used');
        console.table(columns1);

        console.log('\n=== Sample data from service_parts_used ===');
        const [data1] = await connection.query('SELECT * FROM service_parts_used LIMIT 5');
        console.table(data1);

        console.log('\n=== Checking printer_parts table ===');
        const [columns2] = await connection.query('DESCRIBE printer_parts');
        console.table(columns2);

        console.log('\n=== Sample data from printer_parts ===');
        const [data2] = await connection.query('SELECT id, name, brand, quantity FROM printer_parts LIMIT 10');
        console.table(data2);

        console.log('\n=== Checking technician_inventory table ===');
        const [techInvColumns] = await connection.query('DESCRIBE technician_inventory');
        console.table(techInvColumns);

        console.log('\n=== Sample data from technician_inventory ===');
        const [techInvData] = await connection.query('SELECT * FROM technician_inventory LIMIT 10');
        console.table(techInvData);

        console.log('\n=== Checking service_requests table status ===');
        const [requests] = await connection.query('SELECT id, request_number, status, assigned_technician_id FROM service_requests ORDER BY id DESC LIMIT 5');
        console.table(requests);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkTables();
