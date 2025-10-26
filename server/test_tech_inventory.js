const db = require('./config/database');

async function test() {
    try {
        // Get a technician
        const [techs] = await db.query('SELECT id, first_name, email FROM users WHERE role = "technician" LIMIT 1');
        
        if (techs.length === 0) {
            console.log('❌ No technicians found');
            process.exit(0);
        }
        
        const tech = techs[0];
        console.log(`✅ Technician: ${tech.first_name} (${tech.email})`);
        
        // Check inventory
        const [inv] = await db.query('SELECT COUNT(*) as cnt FROM technician_inventory WHERE technician_id = ?', [tech.id]);
        console.log(`📦 Inventory count: ${inv[0].cnt}`);
        
        if (inv[0].cnt === 0) {
            console.log('\n⚠️  Technician has NO inventory!');
            console.log('💡 Add some parts to test the voluntary service form');
        } else {
            // Show some parts
            const [parts] = await db.query(`
                SELECT pp.name, pp.brand, ti.quantity
                FROM technician_inventory ti
                JOIN printer_parts pp ON ti.part_id = pp.id
                WHERE ti.technician_id = ?
                LIMIT 5
            `, [tech.id]);
            
            console.log('\n📋 Sample parts:');
            parts.forEach(p => console.log(`  - ${p.brand} ${p.name} (qty: ${p.quantity})`));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

test();
