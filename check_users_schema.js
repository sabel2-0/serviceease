const db = require('./server/config/database');

async function checkSchema() {
    try {
        console.log('=== USERS TABLE STRUCTURE ===');
        const [usersColumns] = await db.query('DESCRIBE users');
        console.table(usersColumns);
        
        console.log('\n=== INSTITUTIONS TABLE STRUCTURE ===');
        const [instColumns] = await db.query('DESCRIBE institutions');
        console.table(instColumns);
        
        console.log('\n=== Check for user_institutions table ===');
        const [tables] = await db.query("SHOW TABLES LIKE 'user_institutions'");
        if (tables.length > 0) {
            console.log('user_institutions table EXISTS');
            const [cols] = await db.query('DESCRIBE user_institutions');
            console.table(cols);
        } else {
            console.log('user_institutions table DOES NOT EXIST');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
