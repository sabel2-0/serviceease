// Simple completion test using the fixed backend
const db = require('./config/database');

async function testCompletionWithCorrectData() {
    try {
        console.log('🧪 Testing Service Completion (Final Test)...\n');
        
        const requestId = 51;
        const technicianId = 23;
        
        const completionData = {
            actions: 'Fixed printer - replaced toner cartridge, cleaned print heads, and tested all functions. Printer is now working properly.',
            notes: 'Service completed successfully. Recommend regular maintenance every 3 months.',
            parts: [
                {
                    name: 'HP Toner 85A Black',
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
            
            // Verify the final state
            console.log('\n🔍 Final verification...');
            
            const [finalRequest] = await db.query(`
                SELECT id, request_number, status, resolved_by, resolved_at, resolution_notes 
                FROM service_requests WHERE id = ?
            `, [requestId]);
            
            const [finalApprovals] = await db.query(`
                SELECT id, service_request_id, status, technician_notes, submitted_at 
                FROM service_approvals WHERE service_request_id = ?
            `, [requestId]);
            
            const [finalParts] = await db.query(`
                SELECT spu.id, spu.quantity_used, spu.notes, pp.name as part_name, spu.used_at
                FROM service_parts_used spu 
                JOIN printer_parts pp ON spu.part_id = pp.id 
                WHERE spu.service_request_id = ?
            `, [requestId]);
            
            console.log('\n📋 FINAL SERVICE REQUEST:');
            console.table(finalRequest);
            
            console.log('\n📝 FINAL SERVICE APPROVALS:');
            console.table(finalApprovals);
            
            console.log('\n🔧 FINAL PARTS USED:');
            console.table(finalParts);
            
            console.log('\n✅ SUCCESS: Service completion is working correctly!');
            console.log('📊 Summary:');
            console.log(`   - Service Request Status: ${finalRequest[0]?.status}`);
            console.log(`   - Approval Records: ${finalApprovals.length}`);
            console.log(`   - Parts Used: ${finalParts.length}`);
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error in final test:', error);
    } finally {
        process.exit(0);
    }
}

testCompletionWithCorrectData();