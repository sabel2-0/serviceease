/**
 * Script to populate test data for Association Rule Mining
 * Creates realistic service requests and parts usage data
 */

const db = require('../config/database');

// Printer brands and models with common parts
const printerData = [
    {
        brand: 'HP',
        models: ['LaserJet Pro M404n', 'LaserJet Pro MFP M428fdw', 'OfficeJet Pro 9015e'],
        parts: ['HP Toner CF259A', 'HP Drum Unit', 'HP Fuser Assembly', 'HP Transfer Roller', 'HP Pickup Roller']
    },
    {
        brand: 'Canon',
        models: ['Laser Pro 213', 'imageRUNNER 2425', 'PIXMA G6020'],
        parts: ['Canon Toner 051', 'Canon Drum Unit', 'Canon Fuser Unit', 'Canon Feed Roller', 'Canon Separation Pad']
    },
    {
        brand: 'Epson',
        models: ['EcoTank L3150', 'WorkForce WF-7720', 'Expression Premium XP-7100'],
        parts: ['Epson Ink 502', 'Epson Printhead', 'Epson Waste Ink Pad', 'Epson Paper Feed Roller', 'Epson Maintenance Box']
    },
    {
        brand: 'Brother',
        models: ['HL-L2350DW', 'MFC-L2750DW', 'DCP-L2550DW'],
        parts: ['Brother Toner TN-760', 'Brother Drum DR-730', 'Brother Fuser Unit', 'Brother Transfer Belt', 'Brother Pickup Roller']
    },
    {
        brand: 'Xerox',
        models: ['WorkCentre 3345', 'Phaser 6510', 'VersaLink C405'],
        parts: ['Xerox Toner 106R03623', 'Xerox Drum Cartridge', 'Xerox Fuser', 'Xerox Transfer Roller', 'Xerox Pickup Assembly']
    }
];

// Common part combinations for different issues
const issuePartPatterns = [
    {
        description: 'Paper jam and print quality issues',
        parts: ['Pickup Roller', 'Separation Pad', 'Toner'],
        confidence: 0.85
    },
    {
        description: 'Fading prints and streaks',
        parts: ['Toner', 'Drum Unit'],
        confidence: 0.90
    },
    {
        description: 'Frequent paper jams',
        parts: ['Pickup Roller', 'Feed Roller', 'Separation Pad'],
        confidence: 0.88
    },
    {
        description: 'Poor print quality',
        parts: ['Drum Unit', 'Toner', 'Fuser'],
        confidence: 0.82
    },
    {
        description: 'Not printing',
        parts: ['Mainboard', 'Power Board', 'Fuser'],
        confidence: 0.75
    },
    {
        description: 'Lines on printout',
        parts: ['Drum Unit', 'Transfer Roller'],
        confidence: 0.87
    },
    {
        description: 'Smudged prints',
        parts: ['Fuser', 'Transfer Roller', 'Toner'],
        confidence: 0.84
    }
];

const locations = [
    'Room 101', 'Room 102', 'Room 201', 'Room 202', 'Room 301', 'Room 302',
    'Library', 'Admin Office', 'Faculty Room', 'Computer Lab 1', 'Computer Lab 2',
    'Registrar', 'Accounting', 'Main Office', 'Conference Room'
];

async function populateTestData() {
    try {
        console.log('🚀 Starting data population for Association Rule Mining...\n');

        // Get existing users and institutions
        const [users] = await db.query('SELECT id FROM users WHERE role = "institution_user" LIMIT 10');
        const [techs] = await db.query('SELECT id FROM users WHERE role = "technician" LIMIT 5');
        const [institutions] = await db.query('SELECT institution_id FROM institutions LIMIT 5');

        if (users.length === 0 || techs.length === 0 || institutions.length === 0) {
            console.log('⚠️  Need users, technicians, and institutions in database first!');
            return;
        }

        console.log(`✅ Found ${users.length} institution_users, ${techs.length} technicians, ${institutions.length} institutions\n`);

        // Step 1: Create printer inventory items if they don't exist
        console.log('📝 Creating printer inventory items...');
        const printerInventoryIds = [];

        for (const printerSet of printerData) {
            for (const model of printerSet.models) {
                // Check if printer exists
                const [existing] = await db.query(
                    'SELECT id FROM printers WHERE brand = ? AND model = ? LIMIT 1',
                    [printerSet.brand, model]
                );

                let inventoryId;
                if (existing.length > 0) {
                    inventoryId = existing[0].id;
                } else {
                    const serialNumber = `${printerSet.brand.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    const [result] = await db.query(
                        `INSERT INTO printers (category, name, brand, model, serial_number, quantity, location, status)
                         VALUES ('printer', ?, ?, ?, ?, 1, ?, 'assigned')`,
                        [`${printerSet.brand} ${model}`, printerSet.brand, model, serialNumber, locations[Math.floor(Math.random() * locations.length)]]
                    );
                    inventoryId = result.insertId;
                }
                printerInventoryIds.push({
                    id: inventoryId,
                    brand: printerSet.brand,
                    model: model,
                    parts: printerSet.parts
                });
            }
        }

        console.log(`✅ Created/verified ${printerInventoryIds.length} printer inventory items\n`);

        // Step 2: Create printer parts if they don't exist
        console.log('📝 Creating printer parts inventory...');
        const partIds = new Map();

        for (const printerSet of printerData) {
            for (const partName of printerSet.parts) {
                // Check if part exists
                const [existing] = await db.query(
                    'SELECT id FROM printer_parts WHERE name = ? AND brand = ? LIMIT 1',
                    [partName, printerSet.brand]
                );

                let partId;
                if (existing.length > 0) {
                    partId = existing[0].id;
                } else {
                    // Determine category from part name
                    let category = 'other';
                    if (partName.toLowerCase().includes('toner')) category = 'toner';
                    else if (partName.toLowerCase().includes('drum')) category = 'drum';
                    else if (partName.toLowerCase().includes('fuser')) category = 'fuser';
                    else if (partName.toLowerCase().includes('roller')) category = 'roller';
                    else if (partName.toLowerCase().includes('ink')) category = 'ink';
                    else if (partName.toLowerCase().includes('printhead')) category = 'printhead';
                    else if (partName.toLowerCase().includes('belt')) category = 'transfer-belt';
                    else if (partName.toLowerCase().includes('pad')) category = 'other-consumable';
                    else if (partName.toLowerCase().includes('board')) category = 'mainboard';

                    const [result] = await db.query(
                        `INSERT INTO printer_parts (name, brand, category, quantity, minimum_stock, status, part_type)
                         VALUES (?, ?, ?, 100, 10, 'in_stock', 'brand_specific')`,
                        [partName, printerSet.brand, category]
                    );
                    partId = result.insertId;
                }
                partIds.set(`${printerSet.brand}-${partName}`, partId);
            }
        }

        console.log(`✅ Created/verified ${partIds.size} printer parts\n`);

        // Step 3: Create service requests with realistic patterns
        console.log('📝 Creating service requests with parts usage patterns...');
        
        const numRequests = 200; // Create 200 service requests for good ARM analysis
        let createdRequests = 0;

        for (let i = 0; i < numRequests; i++) {
            // Random printer and issue pattern
            const printer = printerInventoryIds[Math.floor(Math.random() * printerInventoryIds.length)];
            const issuePattern = issuePartPatterns[Math.floor(Math.random() * issuePartPatterns.length)];
            
            // Random user and tech
            const institution_user = users[Math.floor(Math.random() * users.length)];
            const tech = techs[Math.floor(Math.random() * techs.length)];
            const institution = institutions[Math.floor(Math.random() * institutions.length)];

            // Random date within last 6 months
            const daysAgo = Math.floor(Math.random() * 180);
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() - daysAgo);

            // Create service request
            const requestNumber = `SR-2025-${String(1000 + i).padStart(4, '0')}`;
            
            const [requestResult] = await db.query(
                `INSERT INTO service_requests 
                (request_number, institution_id, requested_by, technician_id, 
                 printer_id, priority, status, description, created_at, 
                 started_at, completed_at, resolution_notes)
                VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
                [
                    requestNumber,
                    institution.institution_id,
                    institution_user.id,
                    tech.id,
                    printer.id,
                    ['medium', 'high', 'urgent'][Math.floor(Math.random() * 3)],
                    issuePattern.description,
                    requestDate,
                    new Date(requestDate.getTime() + 30 * 60000), // 30 mins later
                    new Date(requestDate.getTime() + 120 * 60000), // 2 hours later
                    `Fixed ${issuePattern.description} on ${printer.brand} ${printer.model}`
                ]
            );

            const serviceRequestId = requestResult.insertId;

            // Add parts used based on the pattern
            for (const partType of issuePattern.parts) {
                // Find matching part for this printer brand
                const matchingPart = printer.parts.find(p => p.toLowerCase().includes(partType.toLowerCase().split(' ').pop()));
                if (matchingPart) {
                    const partKey = `${printer.brand}-${matchingPart}`;
                    const partId = partIds.get(partKey);

                    if (partId) {
                        await db.query(
                            `INSERT INTO service_parts_used (service_request_id, part_id, quantity_used, used_by, used_at, notes)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                serviceRequestId,
                                partId,
                                Math.floor(Math.random() * 2) + 1, // 1 or 2 units
                                tech.id,
                                new Date(requestDate.getTime() + 90 * 60000),
                                `Replaced for ${printer.brand} ${printer.model}`
                            ]
                        );
                    }
                }
            }

            createdRequests++;
            if (createdRequests % 20 === 0) {
                console.log(`   Created ${createdRequests}/${numRequests} requests...`);
            }
        }

        console.log(`\n✅ Successfully created ${createdRequests} service requests with parts usage!\n`);

        // Show statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT sr.id) as total_requests,
                COUNT(DISTINCT spu.id) as total_parts_used,
                COUNT(DISTINCT spu.part_id) as unique_parts,
                COUNT(DISTINCT sr.printer_id) as unique_printers
            FROM service_requests sr
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            WHERE sr.status = 'completed'
        `);

        console.log('📊 Database Statistics:');
        console.log(`   Total Completed Requests: ${stats[0].total_requests}`);
        console.log(`   Total Parts Used Records: ${stats[0].total_parts_used}`);
        console.log(`   Unique Parts: ${stats[0].unique_parts}`);
        console.log(`   Unique Printers: ${stats[0].unique_printers}`);

        console.log('\n✅ Test data population completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error populating test data:', error);
        process.exit(1);
    }
}

populateTestData();




