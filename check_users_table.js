const mysql = require('./server/node_modules/mysql2/promise');

(async () => {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });
    
    const [columns] = await db.query('DESCRIBE users');
    console.log('Users table columns:');
    columns.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
    
    await db.end();
})();
