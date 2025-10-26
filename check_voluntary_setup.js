const db = require('./server/config/database');

console.log('Checking database for voluntary services setup...\n');

// Check institutions
db.query(
    `SELECT institution_id, name, type, status FROM institutions WHERE type = 'public_school'`,
    (err, schools) => {
        if (err) {
            console.error('❌ Error fetching public schools:', err.message);
        } else {
            console.log(`📚 Found ${schools.length} public schools:`);
            schools.forEach(s => console.log(`  - ${s.institution_id}: ${s.name} (${s.status})`));
        }

        // Check technician assignments for user 57
        db.query(
            `SELECT ta.*, i.name as institution_name, i.type as institution_type 
             FROM technician_assignments ta 
             LEFT JOIN institutions i ON ta.institution_id = i.institution_id
             WHERE ta.technician_id = 57`,
            (err, assignments) => {
                if (err) {
                    console.error('\n❌ Error fetching assignments:', err.message);
                } else {
                    console.log(`\n👤 Found ${assignments.length} assignments for technician 57:`);
                    assignments.forEach(a => console.log(`  - ${a.institution_id}: ${a.institution_name} (${a.institution_type})`));
                }

                // Check printers at public schools
                db.query(
                    `SELECT p.*, i.name as institution_name
                     FROM printers p
                     JOIN institutions i ON p.institution_id = i.institution_id
                     WHERE i.type = 'public_school'
                     LIMIT 5`,
                    (err, printers) => {
                        if (err) {
                            console.error('\n❌ Error fetching printers:', err.message);
                        } else {
                            console.log(`\n🖨️ Found ${printers.length} printers at public schools (showing first 5):`);
                            printers.forEach(p => console.log(`  - ${p.brand} ${p.model} at ${p.institution_name}`));
                        }

                        // Check user_printer_assignments
                        db.query(
                            `SELECT COUNT(*) as count FROM user_printer_assignments 
                             WHERE institution_id IN (SELECT institution_id FROM institutions WHERE type = 'public_school')`,
                            (err, result) => {
                                if (err) {
                                    console.error('\n❌ Error checking printer assignments:', err.message);
                                } else {
                                    console.log(`\n🔗 Found ${result[0].count} printer assignments at public schools`);
                                }
                                process.exit(0);
                            }
                        );
                    }
                );
            }
        );
    }
);
