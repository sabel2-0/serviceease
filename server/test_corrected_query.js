const db = require('./config/database');

async function testCorrectedQuery() {
    try {
        console.log('=== Testing Corrected Coordinator Approval Query ===\n');

        const coordinatorId = 24; // John Doe coordinator

        // Test the corrected query
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
                i.name as institution_name,
                GROUP_CONCAT(
                    CONCAT(pp.name, ' (', spu.quantity_used, ' ', COALESCE(pp.unit, 'units'), ')')
                    SEPARATOR ', '
                ) as parts_used
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            JOIN users tech ON sr.assigned_technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            LEFT JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE sr.coordinator_id = ?
                AND sa.status = 'pending_approval'
                AND sr.status = 'pending_approval'
            GROUP BY sa.id, sa.service_request_id, sa.status, sa.submitted_at,
                     sa.technician_notes, sr.description, sr.priority, sr.location, sr.resolution_notes, sr.resolved_at,
                     sr.assigned_technician_id, tech.first_name, tech.last_name, i.name
            ORDER BY sa.submitted_at DESC
        `, [coordinatorId]);

        console.log('✅ Corrected query executed successfully!');
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
                console.log(`   Parts Used: ${approval.parts_used || 'None'}`);
                console.log('');
            });
        }

        // Also test the parts used query
        if (pendingApprovals.length > 0) {
            const serviceRequestId = pendingApprovals[0].service_request_id;
            console.log(`🔧 Testing parts used query for service request ${serviceRequestId}:`);
            
            const [partsUsed] = await db.query(`
                SELECT 
                    spu.id,
                    spu.quantity_used,
                    pp.unit,
                    spu.used_at as created_at,
                    pp.name as part_name,
                    pp.category,
                    pp.brand
                FROM service_parts_used spu
                JOIN printer_parts pp ON spu.part_id = pp.id
                WHERE spu.service_request_id = ?
                ORDER BY pp.category, pp.name
            `, [serviceRequestId]);

            console.log('Parts used query results:', partsUsed.length, 'parts');
            partsUsed.forEach((part, index) => {
                console.log(`   ${index + 1}. ${part.part_name} - ${part.quantity_used} ${part.unit || 'units'}`);
            });
        }

        console.log('\n=== Test completed successfully ===');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testCorrectedQuery();