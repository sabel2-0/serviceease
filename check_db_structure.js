const db = require('./server/config/database');

async function checkDatabaseStructure() {
    try {
        console.log('=== CHECKING DATABASE STRUCTURE ===\n');

        // Check institutions table
        console.log('1. INSTITUTIONS TABLE:');
        const [institutions] = await db.query('DESCRIBE institutions');
        console.log(institutions.map(col => `  ${col.Field} (${col.Type})`).join('\n'));

        // Check technician_assignments table
        console.log('\n2. TECHNICIAN_ASSIGNMENTS TABLE:');
        const [techAssignments] = await db.query('DESCRIBE technician_assignments');
        console.log(techAssignments.map(col => `  ${col.Field} (${col.Type})`).join('\n'));

        // Check printers table
        console.log('\n3. PRINTERS TABLE:');
        const [printers] = await db.query('DESCRIBE printers');
        console.log(printers.map(col => `  ${col.Field} (${col.Type})`).join('\n'));

        // Check user_printer_assignments table
        console.log('\n4. USER_PRINTER_ASSIGNMENTS TABLE:');
        const [userPrinters] = await db.query('DESCRIBE user_printer_assignments');
        console.log(userPrinters.map(col => `  ${col.Field} (${col.Type})`).join('\n'));

        // Check voluntary_services table
        console.log('\n5. VOLUNTARY_SERVICES TABLE:');
        const [volServices] = await db.query('DESCRIBE voluntary_services');
        console.log(volServices.map(col => `  ${col.Field} (${col.Type})`).join('\n'));

        // Check actual data
        console.log('\n=== CHECKING ACTUAL DATA ===\n');

        const [publicSchools] = await db.query(`
            SELECT institution_id, name, type, status 
            FROM institutions 
            WHERE type = 'public_school' 
            LIMIT 5
        `);
        console.log(`PUBLIC SCHOOLS: ${publicSchools.length} found`);
        publicSchools.forEach(s => console.log(`  - ${s.institution_id}: ${s.name}`));

        const [techAssigns] = await db.query(`
            SELECT * FROM technician_assignments WHERE technician_id = 57
        `);
        console.log(`\nTECHNICIAN 57 ASSIGNMENTS: ${techAssigns.length} found`);
        techAssigns.forEach(a => console.log(`  - ${a.institution_id} (assigned: ${a.assigned_at})`));

        // Try the actual query from the API
        console.log('\n=== TESTING API QUERY ===\n');
        const [result] = await db.query(`
            SELECT 
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                i.address,
                i.status,
                COUNT(DISTINCT p.id) as total_printers
            FROM technician_assignments ta
            INNER JOIN institutions i ON ta.institution_id = i.institution_id
            LEFT JOIN printers p ON p.institution_id = i.institution_id
            WHERE ta.technician_id = 57
                AND i.type = 'public_school'
                AND i.status = 'active'
            GROUP BY i.institution_id, i.name, i.type, i.address, i.status
            ORDER BY i.name ASC
        `, [57]);
        
        console.log(`QUERY RESULT: ${result.length} schools`);
        console.log(JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkDatabaseStructure();
