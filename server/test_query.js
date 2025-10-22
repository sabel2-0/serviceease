const db = require('./config/database');

async function testCoordinatorEndpoint() {
    try {
        console.log('=== Testing Coordinator Approvals Query ===\n');

        const coordinatorId = 24; // John Doe coordinator

        // Test the same query that the API uses
        const [pendingApprovals] = await db.query(`
            SELECT 
                sa.id as approval_id,
                sa.service_request_id,
                sa.status as approval_status,
                sa.submitted_at,
                sa.technician_notes as actions_performed,
                sr.description as request_description,
                sr.priority,
                sr.location,
                sr.resolution_notes,
                sr.resolved_at,
                sr.assigned_technician_id,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                i.name as institution_name
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            JOIN users tech ON sr.assigned_technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sr.coordinator_id = ?
                AND sa.status = 'pending_approval'
                AND sr.status = 'pending_approval'
            ORDER BY sa.submitted_at DESC
        `, [coordinatorId]);

        console.log('✅ Query executed successfully!');
        console.log('📋 Pending approvals found:', pendingApprovals.length);
        
        if (pendingApprovals.length > 0) {
            console.log('\n📄 Approval details:');
            pendingApprovals.forEach((approval, index) => {
                console.log(`${index + 1}. Approval ID: ${approval.approval_id}`);
                console.log(`   Service Request: #${approval.service_request_id}`);
                console.log(`   Description: ${approval.request_description}`);
                console.log(`   Institution: ${approval.institution_name}`);
                console.log(`   Technician: ${approval.technician_first_name} ${approval.technician_last_name}`);
                console.log(`   Priority: ${approval.priority}`);
                console.log(`   Actions: ${approval.actions_performed || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('No pending approvals found for coordinator', coordinatorId);
        }

        console.log('=== Test completed successfully ===');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testCoordinatorEndpoint();