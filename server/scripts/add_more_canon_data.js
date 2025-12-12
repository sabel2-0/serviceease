/**
 * Add more test data specifically for Canon Laser Pro 213
 */

const db = require('../config/database');

async function addMoreCanonData() {
    try {
        console.log('🚀 Adding more test data for Canon Laser Pro 213...\n');

        // Get Canon Laser Pro 213 printer
        const [printers] = await db.query(
            'SELECT id, brand, model FROM printers WHERE brand = "Canon" AND model = "Laser Pro 213" LIMIT 1'
        );

        if (printers.length === 0) {
            console.log('❌ Canon Laser Pro 213 not found!');
            return;
        }

        const printer = printers[0];
        console.log(`✅ Found printer: ${printer.brand} ${printer.model} (ID: ${printer.id})\n`);

        // Get Canon parts
        const [parts] = await db.query(
            'SELECT id, name FROM printer_parts WHERE brand = "Canon"'
        );

        console.log(`✅ Found ${parts.length} Canon parts\n`);

        // Get users
        const [users] = await db.query('SELECT id FROM users WHERE role = "institution_user" LIMIT 5');
        const [techs] = await db.query('SELECT id FROM users WHERE role = "technician" LIMIT 3');
        const [institutions] = await db.query('SELECT institution_id FROM institutions LIMIT 1');

        // Common issue patterns for Canon printers
        const issuePatterns = [
            {
                description: 'Paper jam and print quality issues',
                parts: ['Canon Feed Roller', 'Canon Separation Pad', 'Canon Toner 051'],
            },
            {
                description: 'Fading prints and streaks',
                parts: ['Canon Toner 051', 'Canon Drum Unit'],
            },
            {
                description: 'Frequent paper jams',
                parts: ['Canon Feed Roller', 'Canon Separation Pad'],
            },
            {
                description: 'Poor print quality and lines',
                parts: ['Canon Drum Unit', 'Canon Toner 051', 'Canon Fuser Unit'],
            },
            {
                description: 'Smudged prints',
                parts: ['Canon Fuser Unit', 'Canon Toner 051'],
            }
        ];

        const locations = ['Room 101', 'Room 201', 'Library', 'Admin Office', 'Computer Lab'];

        // Add 15 more service requests
        for (let i = 0; i < 15; i++) {
            const pattern = issuePatterns[i % issuePatterns.length];
            const institution_user = users[i % users.length];
            const tech = techs[i % techs.length];
            
            // Random date within last 90 days
            const daysAgo = Math.floor(Math.random() * 90) + 1;
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() - daysAgo);

            // Create service request
            const requestNumber = `SR-2025-${String(2000 + i).padStart(4, '0')}`;
            
            const [requestResult] = await db.query(
                `INSERT INTO service_requests 
                (request_number, institution_id, requested_by, technician_id, 
                 printer_id, priority, status, description, created_at, 
                 started_at, completed_at, resolution_notes)
                VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
                [
                    requestNumber,
                    institutions[0].institution_id,
                    institution_user.id,
                    tech.id,
                    printer.id,
                    ['medium', 'high'][Math.floor(Math.random() * 2)],
                    pattern.description,
                    requestDate,
                    new Date(requestDate.getTime() + 30 * 60000),
                    new Date(requestDate.getTime() + 120 * 60000),
                    `Fixed ${pattern.description} on Canon Laser Pro 213`
                ]
            );

            const serviceRequestId = requestResult.insertId;

            // Add parts used
            for (const partName of pattern.parts) {
                const part = parts.find(p => p.name === partName);
                if (part) {
                    await db.query(
                        `INSERT INTO service_parts_used (service_request_id, part_id, quantity_used, used_by, used_at, notes)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            serviceRequestId,
                            part.id,
                            Math.floor(Math.random() * 2) + 1,
                            tech.id,
                            new Date(requestDate.getTime() + 90 * 60000),
                            `Used for ${pattern.description}`
                        ]
                    );
                }
            }

            console.log(`✅ Created request ${i + 1}/15: ${requestNumber}`);
        }

        console.log('\n✅ Successfully added 15 more service requests for Canon Laser Pro 213!');
        
        // Show updated statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT sr.id) as total_requests,
                COUNT(DISTINCT spu.id) as total_parts_used
            FROM service_requests sr
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            WHERE sr.printer_id = ? AND sr.status = 'completed'
        `, [printer.id]);

        console.log('\n📊 Updated Statistics for Canon Laser Pro 213:');
        console.log(`   Total Completed Requests: ${stats[0].total_requests}`);
        console.log(`   Total Parts Used: ${stats[0].total_parts_used}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error adding test data:', error);
        process.exit(1);
    }
}

addMoreCanonData();




