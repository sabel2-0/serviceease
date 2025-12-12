const db = require('./config/database');
require('dotenv').config();

async function investigateData() {
    try {
        console.log('Investigating maintenance services data...\n');
        
        // Check all maintenance services
        const [allMS] = await db.query(`
            SELECT COUNT(*) as cnt 
            FROM maintenance_services
        `);
        console.log('Total maintenance services in table:', allMS[0].cnt);
        
        // Check sample institution_ids in maintenance_services
        const [sampleMS] = await db.query(`
            SELECT DISTINCT institution_id 
            FROM maintenance_services 
            LIMIT 10
        `);
        console.log('\nSample institution_ids in maintenance_services:');
        sampleMS.forEach(ms => console.log(`  - ${ms.institution_id}`));
        
        // Check all institutions
        const [allInst] = await db.query(`
            SELECT institution_id, name, type 
            FROM institutions
        `);
        console.log('\nAll institutions:');
        allInst.forEach(i => console.log(`  - ${i.institution_id} (${i.type}) - ${i.name}`));
        
        // Try to match manually
        console.log('\nTrying to match institution_ids...');
        for (const ms of sampleMS) {
            const found = allInst.find(i => i.institution_id === ms.institution_id);
            if (found) {
                console.log(`  ✓ ${ms.institution_id} matches ${found.name} (${found.type})`);
            } else {
                console.log(`  ✗ ${ms.institution_id} - NO MATCH FOUND`);
            }
        }
        
        // Check if there's a case sensitivity issue
        const [msWithDetails] = await db.query(`
            SELECT 
                ms.id,
                ms.institution_id as ms_inst_id,
                ms.status,
                DATE(ms.created_at) as created
            FROM maintenance_services ms
            ORDER BY ms.created_at DESC
            LIMIT 10
        `);
        console.log('\nRecent maintenance services (showing institution_ids):');
        msWithDetails.forEach(s => console.log(`  ID ${s.id}: ${s.ms_inst_id} - ${s.status} - ${s.created}`));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

investigateData();
