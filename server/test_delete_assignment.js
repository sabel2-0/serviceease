const db = require('./config/database');

async function testDeleteAssignment() {
    try {
        console.log('=== Testing Technician Assignment Deletion ===\n');
        
        // First, check if there are any active assignments
        const [activeAssignments] = await db.query(`
            SELECT 
                ta.id,
                ta.institution_id,
                ta.technician_id,
                ta.is_active,
                u.first_name,
                u.last_name,
                i.name as institution_name
            FROM technician_assignments ta
            JOIN users u ON ta.technician_id = u.id
            JOIN institutions i ON ta.institution_id = i.institution_id
            ORDER BY ta.id DESC
            LIMIT 5
        `);
        
        console.log('Recent assignments in database:');
        activeAssignments.forEach(a => {
            console.log(`  ID: ${a.id}, Technician: ${a.first_name} ${a.last_name}, Institution: ${a.institution_name}, Active: ${a.is_active}`);
        });
        
        console.log('\n=== Test Complete ===');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testDeleteAssignment();
