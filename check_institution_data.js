const db = require('./server/config/database');

async function checkData() {
    try {
        console.log('=== USER 64 DATA ===');
        const [user] = await db.query('SELECT id, email, role, institution_id FROM users WHERE id = 64');
        console.table(user);
        
        console.log('\n=== INST-017 DATA ===');
        const [inst] = await db.query('SELECT institution_id, name, user_id FROM institutions WHERE institution_id = "INST-017"');
        console.table(inst);
        
        console.log('\n=== ALL INSTITUTIONS ===');
        const [allInst] = await db.query('SELECT institution_id, name, user_id FROM institutions');
        console.table(allInst);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
