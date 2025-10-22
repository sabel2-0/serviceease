const db = require('./config/database');

(async () => {
    try {
        const [tables] = await db.query('SHOW TABLES LIKE "%parts%"');
        console.log('Parts tables:', tables);
        process.exit();
    } catch(err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
