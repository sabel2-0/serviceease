const db = require('./config/database');

async function testServiceRequestFiltering() {
    try {
        console.log('🔗 Testing service request filtering...');
        
        // Test 1: Check all service requests for technician 23
        console.log('\n📋 TEST 1: All service requests for technician 23');
        const [allRequests] = await db.query(`
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
            ORDER BY sr.created_at DESC
        `, [23]);
        
        console.log(`Total requests found: ${allRequests.length}`);
        allRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        // Test 2: Check requests excluding completed/cancelled (new API behavior)
        console.log('\n📋 TEST 2: Active service requests (excluding completed/cancelled)');
        const [activeRequests] = await db.query(`
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
        
        console.log(`Active requests found: ${activeRequests.length}`);
        activeRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        // Test 3: Check completed requests (should only appear in service history)
        console.log('\n📋 TEST 3: Completed/cancelled requests (service history only)');
        const [historyRequests] = await db.query(`
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
            AND sr.status IN ('completed', 'cancelled')
            ORDER BY sr.created_at DESC
        `, [23]);
        
        console.log(`History requests found: ${historyRequests.length}`);
        historyRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        console.log('\n✅ SUMMARY:');
        console.log(`  - Total requests: ${allRequests.length}`);
        console.log(`  - Active requests (will show in requests page): ${activeRequests.length}`);
        console.log(`  - History requests (will show in history page): ${historyRequests.length}`);
        
        if (activeRequests.length + historyRequests.length === allRequests.length) {
            console.log('✅ Filtering logic is correct - no overlap between active and history!');
        } else {
            console.log('❌ Something is wrong with the filtering logic');
        }
        
        console.log('\n🎯 EXPECTED BEHAVIOR:');
        console.log('  - Service Requests page: Should only show active requests (assigned, in_progress, pending_approval, etc.)');
        console.log('  - Service History page: Should show completed and cancelled requests with full details and parts used');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testServiceRequestFiltering()
    .then(() => {
        console.log('\n🏁 Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test error:', error);
        process.exit(1);
    });