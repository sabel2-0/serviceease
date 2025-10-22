const db = require('./config/database');

async function testServiceCompletionFixed() {
    try {
        console.log('🧪 Testing service completion workflow (FIXED)...\n');
        
        const requestId = 51; // The in_progress request
        const technicianId = 23; // Existing technician
        
        // Simulate the completion data that would come from the frontend
        const completionData = {
            actions: 'Fixed printer - replaced toner cartridge and cleaned print heads. Printer is now working properly.',
            notes: 'Everything working properly after service. Recommend regular cleaning every 3 months.',
            parts: [
                {
                    name: 'HP Toner 85A Black', // This part exists in the database
                    qty: 1,
                    unit: 'pieces'
                }
            ]
        };
        
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
            
            // 5. Create notification for coordinator (optional)
            console.log('\n5️⃣ Creating coordinator notification...');
            
            // Get coordinator for this service request
            const [coordinatorQuery] = await db.query(`
                SELECT u.id as coordinator_id, u.first_name, u.last_name, u.email
                FROM service_requests sr
                JOIN institutions i ON sr.institution_id = i.id
                JOIN users u ON i.coordinator_id = u.id
                WHERE sr.id = ?
            `, [requestId]);
            
            if (coordinatorQuery.length > 0) {
                const coordinator = coordinatorQuery[0];
                console.log(`📧 Found coordinator: ${coordinator.first_name} ${coordinator.last_name}`);
                
                await db.query(
                    `INSERT INTO notifications 
                     (user_id, type, title, message, data, created_at)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [
                        coordinator.coordinator_id,
                        'service_approval_needed',
                        'Service Completion Approval Required',
                        `Service request SR-20251009-51 has been completed by technician and requires your approval.`,
                        JSON.stringify({ 
                            service_request_id: requestId, 
                            technician_id: technicianId
                        })
                    ]
                );
                console.log('✅ Coordinator notification created');
            } else {
                console.log('⚠️ No coordinator found for this request');
            }
            
            // Commit transaction
            await db.query('COMMIT');
            console.log('\n🎉 Service completion workflow completed successfully!');
            
            // 6. Verify the data was saved
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
            
            const [history] = await db.query(`
                SELECT * FROM service_request_history 
                WHERE request_id = ? AND new_status = 'pending_approval'
                ORDER BY changed_at DESC LIMIT 1
            `, [requestId]);
            
            console.log('\n📋 Updated Service Request:');
            console.table(updatedRequest);
            
            console.log('\n📝 Service Approval Records:');
            console.table(approvals);
            
            console.log('\n🔧 Parts Used Records:');
            console.table(partsUsed);
            
            console.log('\n📈 History Records:');
            console.table(history);
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error in completion test:', error);
    } finally {
        process.exit(0);
    }
}

testServiceCompletionFixed();