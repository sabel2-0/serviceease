const db = require('./config/database');

async function createTestData() {
    try {
        console.log('🔧 Creating comprehensive test data...');
        
        // Create several service requests with different statuses
        const testRequests = [
            {
                institution_id: 'INST-011',
                status: 'assigned',
                priority: 'high',
                description: 'Printer paper jam issue - urgent fix needed',
                location: 'Main Office - Room 101',
                inventory_item_id: 1
            },
            {
                institution_id: 'INST-011',
                status: 'in_progress',
                priority: 'medium',
                description: 'Replace toner cartridge and clean printer',
                location: 'Library - Desk 3',
                inventory_item_id: 1
            },
            {
                institution_id: 'INST-011',
                status: 'pending_approval',
                priority: 'low',
                description: 'Routine maintenance completed, awaiting approval',
                location: 'Administrative Office',
                inventory_item_id: 1
            },
            {
                institution_id: 'INST-011',
                status: 'completed',
                priority: 'high',
                description: 'Fixed network connectivity issue with printer',
                location: 'IT Department',
                inventory_item_id: 1,
                resolution_notes: 'Replaced network cable and updated driver software. Printer is now fully operational.',
                completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                institution_id: 'INST-011',
                status: 'completed',
                priority: 'medium',
                description: 'Monthly printer maintenance and cleaning',
                location: 'Reception Area',
                inventory_item_id: 1,
                resolution_notes: 'Performed full maintenance: cleaned print heads, replaced drum unit, updated firmware.',
                completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            }
        ];
        
        console.log('📋 Creating service requests...');
        const createdRequests = [];
        
        for (const request of testRequests) {
            const [result] = await db.query(`
                INSERT INTO service_requests 
                (institution_id, status, priority, description, location, resolution_notes, completed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                request.institution_id,
                request.status,
                request.priority,
                request.description,
                request.location,
                request.resolution_notes || null,
                request.completed_at || null
            ]);
            
            createdRequests.push({
                id: result.insertId,
                ...request
            });
            
            console.log(`  ✅ Created: SR-${result.insertId} (${request.status})`);
        }
        
        // Create some service history entries for completed requests
        console.log('\n📚 Creating service history entries...');
        for (const request of createdRequests) {
            if (request.status === 'completed') {
                // Add history entries showing progression
                const historyEntries = [
                    { prev: 'new', new: 'assigned', notes: 'Request assigned to technician' },
                    { prev: 'assigned', new: 'in_progress', notes: 'Technician started working on the issue' },
                    { prev: 'in_progress', new: 'pending_approval', notes: 'Work completed, awaiting coordinator approval' },
                    { prev: 'pending_approval', new: 'completed', notes: request.resolution_notes }
                ];
                
                for (const entry of historyEntries) {
                    await db.query(`
                        INSERT INTO service_request_history 
                        (request_id, previous_status, new_status, notes, changed_by, created_at)
                        VALUES (?, ?, ?, ?, 23, NOW() - INTERVAL FLOOR(RAND() * 5) DAY)
                    `, [request.id, entry.prev, entry.new, entry.notes]);
                }
                
                console.log(`  📜 Added history for SR-${request.id}`);
            }
        }
        
        // Add some parts usage for completed requests
        console.log('\n🔧 Adding parts usage data...');
        for (const request of createdRequests) {
            if (request.status === 'completed') {
                // Add parts used (using existing parts from printer_parts table)
                const [parts] = await db.query('SELECT id, name FROM printer_parts LIMIT 3');
                
                for (let i = 0; i < Math.min(2, parts.length); i++) {
                    const part = parts[i];
                    const quantity = Math.floor(Math.random() * 3) + 1;
                    
                    await db.query(`
                        INSERT INTO service_parts_used 
                        (service_request_id, part_id, quantity_used, notes, used_by)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        request.id,
                        part.id,
                        quantity,
                        `Used ${quantity} ${part.name} for service completion`,
                        23
                    ]);
                    
                    console.log(`  🔩 Added parts usage for SR-${request.id}: ${quantity}x ${part.name}`);
                }
            }
        }
        
        console.log('\n🎯 Test data creation completed!');
        console.log(`Created ${createdRequests.length} service requests with various statuses`);
        
        return createdRequests;
        
    } catch (error) {
        console.error('❌ Error creating test data:', error);
        throw error;
    }
}

async function testPaginationAndFiltering() {
    try {
        console.log('\n📊 Testing pagination and filtering...');
        
        // Test service history API with pagination concept
        const [historyResults] = await db.query(`
            SELECT 
                sr.id,
                CONCAT('SR-', YEAR(sr.created_at), '-', LPAD(sr.id, 4, '0')) as request_number,
                sr.status,
                sr.priority,
                sr.description,
                sr.resolution_notes,
                sr.completed_at,
                sr.created_at,
                i.name as institution_name,
                i.address as location
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE ta.technician_id = ?
            AND ta.is_active = TRUE
            AND sr.status IN ('completed', 'cancelled', 'pending_approval')
            ORDER BY sr.completed_at DESC, sr.created_at DESC
            LIMIT 20
        `, [23]);
        
        console.log(`\n📋 Service History Results: ${historyResults.length} entries`);
        historyResults.forEach((req, index) => {
            console.log(`  ${index + 1}. ${req.request_number}: ${req.status} - ${req.description}`);
        });
        
        // Test active requests API
        const [activeResults] = await db.query(`
            SELECT 
                sr.id,
                CONCAT('SR-', YEAR(sr.created_at), '-', LPAD(sr.id, 4, '0')) as request_number,
                sr.status,
                sr.priority,
                sr.description,
                i.name as institution_name
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE ta.technician_id = ?
            AND ta.is_active = TRUE
            AND sr.status NOT IN ('completed', 'cancelled')
            ORDER BY sr.created_at DESC
        `, [23]);
        
        console.log(`\n📋 Active Requests Results: ${activeResults.length} entries`);
        activeResults.forEach((req, index) => {
            console.log(`  ${index + 1}. ${req.request_number}: ${req.status} - ${req.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing pagination:', error);
        throw error;
    }
}

async function runComprehensiveTest() {
    try {
        console.log('🚀 Starting comprehensive service history test...');
        
        // Create test data
        await createTestData();
        
        // Test pagination and filtering
        await testPaginationAndFiltering();
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n🎯 What to test in the UI:');
        console.log('1. 📱 Navigate to Service Requests page - should only show active requests (assigned, in_progress)');
        console.log('2. 📚 Navigate to Service History page - should show completed requests with parts used');
        console.log('3. 🔍 Test search functionality in Service History');
        console.log('4. 🏷️ Test status filtering in Service History');
        console.log('5. 📱 Test mobile responsiveness on both pages');
        console.log('6. ⬇️ Test "Load More" functionality if you have many entries');
        
    } catch (error) {
        console.error('💥 Comprehensive test failed:', error);
    }
}

// Run the comprehensive test
runComprehensiveTest()
    .then(() => {
        console.log('\n🏁 Test suite completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test suite error:', error);
        process.exit(1);
    });