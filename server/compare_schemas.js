const mysql = require('mysql2/promise');

async function compareSchemas() {
    try {
        // Connect to Railway
        const railway = await mysql.createConnection({
            host: 'trolley.proxy.rlwy.net',
            port: 17038,
            user: 'root',
            password: 'cBradZvPfObqGtuJMzBBWVSYpDKYYQsZ',
            database: 'railway'
        });

        // Connect to Local
        const local = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Natusv1ncere.',
            database: 'serviceease'
        });

        console.log('\n=== RAILWAY voluntary_services STRUCTURE ===');
        const [railwayCols] = await railway.query('DESCRIBE voluntary_services');
        railwayCols.forEach(c => {
            console.log(`${c.Field.padEnd(30)} | ${c.Type.padEnd(30)} | ${c.Null} | ${c.Key}`);
        });

        console.log('\n=== LOCAL maintenance_services STRUCTURE ===');
        const [localCols] = await local.query('DESCRIBE maintenance_services');
        localCols.forEach(c => {
            console.log(`${c.Field.padEnd(30)} | ${c.Type.padEnd(30)} | ${c.Null} | ${c.Key}`);
        });

        await railway.end();
        await local.end();

        console.log('\n=== COMPARISON COMPLETE ===');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

compareSchemas();
