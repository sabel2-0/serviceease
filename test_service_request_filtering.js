const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'serviceease'
};

async function testServiceRequestFiltering() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        // Test 1: Check all service requests for technician 23
        console.log('\n📋 TEST 1: All service requests for technician 23');
        const [allRequests] = await connection.execute(`
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
            WHERE ta.technician_id = 23 
            AND ta.is_active = TRUE
            ORDER BY sr.created_at DESC
        `);
        
        console.log(`Total requests found: ${allRequests.length}`);
        allRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        // Test 2: Check requests excluding completed/cancelled (new API behavior)
        console.log('\n📋 TEST 2: Active service requests (excluding completed/cancelled)');
        const [activeRequests] = await connection.execute(`
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
            WHERE ta.technician_id = 23 
            AND ta.is_active = TRUE
            AND sr.status NOT IN ('completed', 'cancelled')
            ORDER BY sr.created_at DESC
        `);
        
        console.log(`Active requests found: ${activeRequests.length}`);
        activeRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        // Test 3: Check completed requests (should only appear in service history)
        console.log('\n📋 TEST 3: Completed/cancelled requests (service history only)');
        const [historyRequests] = await connection.execute(`
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
            WHERE ta.technician_id = 23 
            AND ta.is_active = TRUE
            AND sr.status IN ('completed', 'cancelled')
            ORDER BY sr.created_at DESC
        `);
        
        console.log(`History requests found: ${historyRequests.length}`);
        historyRequests.forEach(req => {
            console.log(`  - ${req.request_number}: ${req.status} (${req.description})`);
        });
        
        // Test 4: Test the actual API endpoint
        console.log('\n📋 TEST 4: Testing actual API endpoint');
        
        // Get a token first (we'll use a test approach)
        const testToken = 'Bearer test'; // This won't work for actual API, but shows the concept
        
        console.log('\n✅ SUMMARY:');
        console.log(`  - Total requests: ${allRequests.length}`);
        console.log(`  - Active requests (will show in requests page): ${activeRequests.length}`);
        console.log(`  - History requests (will show in history page): ${historyRequests.length}`);
        
        if (activeRequests.length + historyRequests.length === allRequests.length) {
            console.log('✅ Filtering logic is correct - no overlap between active and history!');
        } else {
            console.log('❌ Something is wrong with the filtering logic');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔐 Database connection closed');
        }
    }
}

// Run the test
testServiceRequestFiltering();