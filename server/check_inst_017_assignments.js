const db = require('./config/database');

async function checkAssignments() {
    try {
        console.log('=== Checking Technician Assignments ===\n');
        
        // Check all assignments for institution INST-017
        const [assignments] = await db.query(`
            SELECT 
                ta.id,
                ta.technician_id,
                ta.institution_id,
                ta.is_active,
                ta.created_at,
                ta.updated_at,
                u.first_name,
                u.last_name,
                u.email
            FROM technician_assignments ta
            LEFT JOIN users u ON ta.technician_id = u.id
            WHERE ta.institution_id = 'INST-017'
            ORDER BY ta.created_at DESC
        `);
        
        console.log(`Found ${assignments.length} assignments for INST-017:\n`);
        assignments.forEach(a => {
            console.log(`  ID: ${a.id}`);
            console.log(`  Technician: ${a.first_name} ${a.last_name} (ID: ${a.technician_id})`);
            console.log(`  Active: ${a.is_active ? 'YES' : 'NO'}`);
            console.log(`  Created: ${a.created_at}`);
            console.log(`  Updated: ${a.updated_at}`);
            console.log('---');
        });
        
        // Check what the API would return (only active)
        const [activeAssignments] = await db.query(`
            SELECT 
                ta.id,
                ta.technician_id,
                ta.institution_id,
                u.first_name,
                u.last_name
            FROM technician_assignments ta
            LEFT JOIN users u ON ta.technician_id = u.id
            WHERE ta.institution_id = 'INST-017' AND ta.is_active = TRUE
        `);
        
        console.log(`\nActive assignments that API would return: ${activeAssignments.length}`);
        activeAssignments.forEach(a => {
            console.log(`  - ${a.first_name} ${a.last_name} (ID: ${a.id})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAssignments();
