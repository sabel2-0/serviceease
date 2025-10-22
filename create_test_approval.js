/**
 * Test script to create a pending approval record for testing
 */

const db = require('./server/config/database');

async function createTestApprovalRecord() {
    console.log('🧪 Creating test approval record...');
    
    try {
        // First, check if we have any service requests
        const [requests] = await db.query('SELECT * FROM service_requests ORDER BY id DESC LIMIT 5');
        console.log('Available service requests:', requests.map(r => ({ id: r.id, status: r.status, institution_id: r.institution_id })));
        
        if (requests.length === 0) {
            console.log('No service requests found. Creating one...');
            
            // Create a test service request
            const [insertResult] = await db.query(`
                INSERT INTO service_requests 
                (institution_id, coordinator_id, inventory_item_id, priority, description, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, ['INST-011', 24, 1, 'medium', 'Test printer needs cleaning and calibration', 'in_progress']);
            
            const newRequestId = insertResult.insertId;
            console.log('Created test service request:', newRequestId);
            
            // Update it to pending_approval
            await db.query(`
                UPDATE service_requests 
                SET status = 'pending_approval', updated_at = NOW() 
                WHERE id = ?
            `, [newRequestId]);
            
            // Create service approval record
            await db.query(`
                INSERT INTO service_approvals 
                (service_request_id, technician_id, status, actions_performed, submitted_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [newRequestId, 1, 'pending_approval', 'Cleaned printer heads, replaced toner cartridge, performed test prints']);
            
            // Add some test parts usage
            await db.query(`
                INSERT INTO service_parts_used 
                (service_request_id, part_id, quantity_used, unit, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [newRequestId, 1, 1, 'piece']);
            
            console.log('✅ Created test approval record for request:', newRequestId);
            
        } else {
            // Use existing request and update it
            const request = requests[0];
            console.log('Using existing request:', request.id);
            
            // Update to pending_approval
            await db.query(`
                UPDATE service_requests 
                SET status = 'pending_approval', updated_at = NOW() 
                WHERE id = ?
            `, [request.id]);
            
            // Check if approval record exists
            const [existingApprovals] = await db.query(
                'SELECT * FROM service_approvals WHERE service_request_id = ?',
                [request.id]
            );
            
            if (existingApprovals.length === 0) {
                // Create service approval record
                await db.query(`
                    INSERT INTO service_approvals 
                    (service_request_id, technician_id, status, actions_performed, submitted_at)
                    VALUES (?, ?, ?, ?, NOW())
                `, [request.id, 1, 'pending_approval', 'Cleaned printer heads, replaced toner cartridge, performed test prints']);
                
                console.log('✅ Created approval record for existing request:', request.id);
            } else {
                await db.query(`
                    UPDATE service_approvals 
                    SET status = 'pending_approval', submitted_at = NOW()
                    WHERE service_request_id = ?
                `, [request.id]);
                
                console.log('✅ Updated existing approval record for request:', request.id);
            }
            
            // Add test parts usage if not exists
            const [existingParts] = await db.query(
                'SELECT * FROM service_parts_used WHERE service_request_id = ?',
                [request.id]
            );
            
            if (existingParts.length === 0) {
                await db.query(`
                    INSERT INTO service_parts_used 
                    (service_request_id, part_id, quantity_used, unit, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                `, [request.id, 1, 1, 'piece']);
                
                console.log('✅ Added test parts usage');
            }
        }
        
        // Verify the result
        const [finalCheck] = await db.query(`
            SELECT 
                sr.id,
                sr.status,
                sr.institution_id,
                sa.id as approval_id,
                sa.status as approval_status,
                COUNT(spu.id) as parts_count
            FROM service_requests sr
            LEFT JOIN service_approvals sa ON sr.id = sa.service_request_id
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            WHERE sr.status = 'pending_approval'
            GROUP BY sr.id, sr.status, sr.institution_id, sa.id, sa.status
            ORDER BY sr.updated_at DESC
            LIMIT 1
        `);
        
        console.log('✅ Final verification:', finalCheck[0]);
        console.log('🎉 Test data created successfully! Refresh the coordinator interface to see the pending approval.');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creating test data:', error);
        process.exit(1);
    }
}

createTestApprovalRecord();