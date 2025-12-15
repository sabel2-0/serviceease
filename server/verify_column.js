const db = require('./config/database');

db.query('DESCRIBE maintenance_services')
    .then(([results]) => {
        console.log('\n✅ Maintenance Services Table Structure:');
        results.forEach(r => {
            if (r.Field.includes('item') || r.Field.includes('part')) {
                console.log(`  ${r.Field}: ${r.Type}`);
            }
        });
        process.exit();
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
