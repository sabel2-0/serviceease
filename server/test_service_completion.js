const db = require('./config/database');

async function testServiceCompletion() {
    try {
        console.log('🧪 Testing service completion workflow...\n');
        
        // First, let's check if we have any in_progress service requests
        const [inProgressRequests] = await db.query(`
            SELECT sr.id, sr.request_number, sr.status, sr.institution_id 
            FROM service_requests sr 
            WHERE sr.status = 'in_progress' 
            LIMIT 1
        `);
        
        if (inProgressRequests.length === 0) {
            console.log('❌ No in_progress service requests found to test with');
            console.log('Creating a test service request...');
            
            // Create a test service request
            const [insertResult] = await db.query(`
                INSERT INTO service_requests 
                (institution_id, issue, priority, status, created_at, updated_at)
                VALUES (1, 'Test issue for completion workflow', 'medium', 'in_progress', NOW(), NOW())
            `);
            
            const testRequestId = insertResult.insertId;
            console.log(`✅ Created test service request with ID: ${testRequestId}`);
            
            // Test the completion
            await testCompletion(testRequestId);
        } else {
            console.log(`✅ Found in_progress request: ${inProgressRequests[0].request_number}`);
            await testCompletion(inProgressRequests[0].id);
        }
        
    } catch (error) {
        console.error('❌ Error testing service completion:', error);
    } finally {
        process.exit(0);
    }
}

async function testCompletion(requestId) {
    try {
        console.log(`\n🔧 Testing completion for request ID: ${requestId}`);
        
        // Simulate the completion data that would come from the frontend
        const completionData = {
            actions: 'Test completion - replaced toner cartridge and cleaned print heads',
            notes: 'Everything working properly after service',
            parts: [
                {
                    name: 'Toner Cartridge',
                    qty: 1,
                    unit: 'pieces'
                }
            ]
        };
        
        const technicianId = 1; // Assume technician ID 1 exists
        
        console.log('📝 Completion data:', completionData);
        
        // Start transaction
        await db.query('START TRANSACTION');
        
        try {
            // 1. Update service request status
            console.log('\n1️⃣ Updating service request status...');
            await db.query(
                `UPDATE service_requests 
                 SET status = 'pending_approval', 
                     resolution_notes = ?,
                     resolved_by = ?,
                     resolved_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [completionData.actions, technicianId, requestId]
            );
            console.log('✅ Service request updated to pending_approval');
            
            // 2. Record parts used
            console.log('\n2️⃣ Recording parts used...');
            for (const part of completionData.parts) {
                if (part.name && part.qty > 0) {
                    // Get part_id from printer_parts table
                    const [partInfo] = await db.query(`
                        SELECT id FROM printer_parts WHERE name = ?
                    `, [part.name]);
                    
                    if (partInfo.length > 0) {
                        await db.query(
                            `INSERT INTO service_parts_used 
                             (service_request_id, part_id, quantity_used, notes, used_by)
                             VALUES (?, ?, ?, ?, ?)`,
                            [requestId, partInfo[0].id, part.qty, `Used ${part.qty} ${part.unit || 'pieces'}`, technicianId]
                        );
                        console.log(`✅ Recorded part usage: ${part.name} - ${part.qty} ${part.unit}`);
                    } else {
                        console.log(`⚠️ Part not found in database: ${part.name}`);
                    }
                }
            }
            
            // 3. Create service approval record
            console.log('\n3️⃣ Creating service approval record...');
            await db.query(
                `INSERT INTO service_approvals 
                 (service_request_id, status, technician_notes, submitted_at)
                 VALUES (?, ?, ?, NOW())`,
                [requestId, 'pending_approval', completionData.actions]
            );
            console.log('✅ Service approval record created');
            
            // 4. Add history record
            console.log('\n4️⃣ Adding history record...');
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, 'in_progress', 'pending_approval', technicianId, `Service completion submitted for approval. Actions: ${completionData.actions.substring(0, 100)}...`]
            );
            console.log('✅ History record added');
            
            // Commit transaction
            await db.query('COMMIT');
            console.log('\n🎉 Service completion workflow completed successfully!');
            
            // 5. Verify the data was saved
            console.log('\n🔍 Verifying saved data...');
            
            const [updatedRequest] = await db.query(`
                SELECT id, request_number, status, resolved_by, resolved_at, resolution_notes 
                FROM service_requests WHERE id = ?
            `, [requestId]);
            
            const [approvals] = await db.query(`
                SELECT * FROM service_approvals WHERE service_request_id = ?
            `, [requestId]);
            
            const [partsUsed] = await db.query(`
                SELECT spu.*, pp.name as part_name 
                FROM service_parts_used spu 
                JOIN printer_parts pp ON spu.part_id = pp.id 
                WHERE spu.service_request_id = ?
            `, [requestId]);
            
            console.log('\n📋 Updated Service Request:');
            console.table(updatedRequest);
            
            console.log('\n📝 Service Approval Records:');
            console.table(approvals);
            
            console.log('\n🔧 Parts Used Records:');
            console.table(partsUsed);
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error in completion test:', error);
        throw error;
    }
}

testServiceCompletion();