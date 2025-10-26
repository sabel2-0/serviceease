const mysql = require('mysql2/promise');

async function testVoluntaryApproval() {
    const db = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease',
        waitForConnections: true,
        connectionLimit: 10
    });

    try {
        console.log('🧪 Testing Voluntary Service Approval Workflow\n');

        // 1. Check current voluntary services
        console.log('📋 Step 1: Checking voluntary services...');
        const [services] = await db.query(`
            SELECT 
                id, 
                status, 
                coordinator_approval_status,
                completed_at,
                coordinator_reviewed_at
            FROM voluntary_services
            ORDER BY id DESC
            LIMIT 5
        `);

        console.log('Found', services.length, 'voluntary service(s):');
        services.forEach(s => {
            console.log(`  - ID ${s.id}: status=${s.status}, coordinator_approval=${s.coordinator_approval_status}, completed_at=${s.completed_at}, reviewed_at=${s.coordinator_reviewed_at}`);
        });

        // 2. Find a pending service to test
        const pendingService = services.find(s => s.coordinator_approval_status === 'pending');
        
        if (!pendingService) {
            console.log('\n⚠️  No pending voluntary services found to test approval');
            console.log('   Please create a new voluntary service first.');
            
            // Check if there's an approved service without completed_at
            const approvedNeedsUpdate = services.find(s => 
                s.coordinator_approval_status === 'approved' && !s.completed_at
            );
            
            if (approvedNeedsUpdate) {
                console.log('\n🔧 Found approved service without completed_at. Fixing...');
                await db.query(`
                    UPDATE voluntary_services 
                    SET completed_at = NOW(),
                        status = 'completed'
                    WHERE id = ? AND completed_at IS NULL
                `, [approvedNeedsUpdate.id]);
                console.log('✅ Fixed service ID', approvedNeedsUpdate.id);
            }
        } else {
            console.log('\n✅ Step 2: Found pending service ID', pendingService.id);
            console.log('   Simulating coordinator approval...');

            // Simulate approval
            const coordinatorId = 65; // Your coordinator ID
            await db.query(`
                UPDATE voluntary_services 
                SET coordinator_approval_status = 'approved',
                    coordinator_notes = 'Test approval from script',
                    coordinator_reviewed_at = NOW(),
                    coordinator_reviewed_by = ?,
                    status = 'completed',
                    completed_at = NOW()
                WHERE id = ?
            `, [coordinatorId, pendingService.id]);

            console.log('✅ Approved service ID', pendingService.id);

            // 3. Verify the update
            console.log('\n📊 Step 3: Verifying the approval...');
            const [updated] = await db.query(`
                SELECT 
                    id,
                    status,
                    coordinator_approval_status,
                    coordinator_reviewed_at,
                    completed_at,
                    coordinator_notes
                FROM voluntary_services
                WHERE id = ?
            `, [pendingService.id]);

            if (updated.length > 0) {
                const service = updated[0];
                console.log('\n✅ Service Updated Successfully:');
                console.log('   ID:', service.id);
                console.log('   Status:', service.status);
                console.log('   Coordinator Approval:', service.coordinator_approval_status);
                console.log('   Coordinator Reviewed At:', service.coordinator_reviewed_at);
                console.log('   Completed At:', service.completed_at);
                console.log('   Notes:', service.coordinator_notes);

                // Verify completed_at is set
                if (service.completed_at) {
                    console.log('\n✅ SUCCESS: completed_at is properly set!');
                } else {
                    console.log('\n❌ FAILURE: completed_at is NULL!');
                }
            }
        }

        console.log('\n🎯 Test Complete!');

    } catch (error) {
        console.error('❌ Test Error:', error);
    } finally {
        await db.end();
    }
}

testVoluntaryApproval();
