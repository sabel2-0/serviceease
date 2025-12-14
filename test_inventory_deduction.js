const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'serviceease'
};

async function testInventoryDeduction() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('🔍 Testing Inventory Deduction Logic...\n');
        
        // Step 1: Find a completed service request with parts used
        console.log('Step 1: Finding completed service requests with parts used...');
        const [completedRequests] = await connection.query(`
            SELECT 
                sr.id, 
                sr.request_number, 
                sr.status,
                sr.technician_id,
                COUNT(spu.id) as parts_count
            FROM service_requests sr
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            WHERE sr.status = 'completed'
            GROUP BY sr.id
            HAVING parts_count > 0
            ORDER BY sr.completed_at DESC
            LIMIT 5
        `);
        
        if (completedRequests.length === 0) {
            console.log('❌ No completed service requests with parts found.');
            console.log('\nStep 2: Finding pending_approval requests instead...');
            
            const [pendingRequests] = await connection.query(`
                SELECT 
                    sr.id, 
                    sr.request_number, 
                    sr.status,
                    sr.technician_id,
                    COUNT(spu.id) as parts_count
                FROM service_requests sr
                LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
                WHERE sr.status = 'pending_approval'
                GROUP BY sr.id
                HAVING parts_count > 0
                LIMIT 5
            `);
            
            console.log(`\n📋 Found ${pendingRequests.length} pending_approval requests with parts:`);
            pendingRequests.forEach(req => {
                console.log(`  - Request #${req.request_number} (ID: ${req.id}): Status: ${req.status}, Technician: ${req.technician_id}, Parts: ${req.parts_count}`);
            });
            
            if (pendingRequests.length === 0) {
                console.log('\n❌ No service requests available for testing.');
                return;
            }
        } else {
            console.log(`\n📋 Found ${completedRequests.length} completed requests with parts:`);
            completedRequests.forEach(req => {
                console.log(`  - Request #${req.request_number} (ID: ${req.id}): Status: ${req.status}, Technician: ${req.technician_id}, Parts: ${req.parts_count}`);
            });
        }
        
        // Step 2: Check one specific request in detail
        const testRequest = completedRequests.length > 0 ? completedRequests[0] : null;
        
        if (testRequest) {
            console.log(`\n\nStep 2: Analyzing Request #${testRequest.request_number} (ID: ${testRequest.id})...`);
            
            // Get parts used
            const [partsUsed] = await connection.query(`
                SELECT 
                    spu.id,
                    spu.part_id,
                    spu.quantity_used,
                    spu.used_by as technician_id,
                    pp.name as part_name,
                    pp.brand as part_brand,
                    pp.quantity as central_stock,
                    ti.quantity as tech_stock,
                    pp.is_universal
                FROM service_parts_used spu
                JOIN printer_items pp ON spu.part_id = pp.id
                LEFT JOIN technician_inventory ti ON ti.technician_id = spu.used_by AND ti.part_id = spu.part_id
                WHERE spu.service_request_id = ?
            `, [testRequest.id]);
            
            console.log('\n📦 Parts Used in this Request:');
            partsUsed.forEach(part => {
                console.log(`  - ${part.part_name} (${part.part_brand || 'Generic'})`);
                console.log(`    Quantity Used: ${part.quantity_used}`);
                console.log(`    Technician Stock: ${part.tech_stock !== null ? part.tech_stock : 'N/A'}`);
                console.log(`    Central Stock: ${part.central_stock}`);
                console.log(`    Is Universal: ${part.is_universal ? 'Yes' : 'No'}`);
            });
            
            // Check history
            const [history] = await connection.query(`
                SELECT 
                    srh.id,
                    srh.previous_status,
                    srh.new_status,
                    srh.changed_by,
                    srh.notes,
                    srh.created_at,
                    u.first_name,
                    u.last_name,
                    u.role
                FROM service_request_history srh
                LEFT JOIN users u ON srh.changed_by = u.id
                WHERE srh.request_id = ?
                ORDER BY srh.created_at DESC
            `, [testRequest.id]);
            
            console.log('\n📜 Status History:');
            history.forEach(h => {
                const changedBy = h.first_name ? `${h.first_name} ${h.last_name} (${h.role})` : 'System';
                console.log(`  - [${h.created_at}] ${h.previous_status} → ${h.new_status}`);
                console.log(`    Changed by: ${changedBy}`);
                console.log(`    Notes: ${h.notes || 'N/A'}`);
            });
            
            // Check for duplicate approvals
            const approvalChanges = history.filter(h => 
                h.new_status === 'completed' || 
                (h.previous_status === 'pending_approval' && h.new_status !== 'in_progress')
            );
            
            console.log(`\n\n🔍 ANALYSIS:`);
            console.log(`   Total status changes: ${history.length}`);
            console.log(`   Approval events (to 'completed'): ${approvalChanges.length}`);
            
            if (approvalChanges.length > 1) {
                console.log(`\n   ⚠️ WARNING: Multiple approval events detected!`);
                console.log(`   This means inventory may have been deducted multiple times!`);
                approvalChanges.forEach((appr, idx) => {
                    const changedBy = appr.first_name ? `${appr.first_name} ${appr.last_name} (${appr.role})` : 'System';
                    console.log(`   ${idx + 1}. ${appr.previous_status} → ${appr.new_status} by ${changedBy} at ${appr.created_at}`);
                });
            } else if (approvalChanges.length === 1) {
                console.log(`\n   ✅ Single approval event found - inventory should be deducted once.`);
            } else {
                console.log(`\n   ℹ️ No approval events found yet (request may still be pending).`);
            }
        }
        
        // Step 3: Check if there are any requests that have been approved multiple times
        console.log('\n\nStep 3: Searching for requests with multiple approvals...');
        const [multipleApprovals] = await connection.query(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.status,
                COUNT(DISTINCT srh.id) as approval_count,
                GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name, ' (', u.role, ')') SEPARATOR ', ') as approvers
            FROM service_requests sr
            JOIN service_request_history srh ON sr.id = srh.request_id
            LEFT JOIN users u ON srh.changed_by = u.id
            WHERE srh.new_status = 'completed'
            GROUP BY sr.id
            HAVING approval_count > 1
            ORDER BY approval_count DESC
            LIMIT 10
        `);
        
        if (multipleApprovals.length > 0) {
            console.log(`\n⚠️ Found ${multipleApprovals.length} requests with multiple approval events:`);
            multipleApprovals.forEach(req => {
                console.log(`  - Request #${req.request_number}: ${req.approval_count} approvals`);
                console.log(`    Approvers: ${req.approvers}`);
            });
            console.log('\n❌ DOUBLE DEDUCTION BUG CONFIRMED: These requests likely had inventory deducted multiple times!');
        } else {
            console.log(`\n✅ No requests found with multiple approval events.`);
            console.log('   This could mean:');
            console.log('   - The system is working correctly, OR');
            console.log('   - There haven\'t been enough approvals to trigger the bug yet');
        }
        
        console.log('\n\n' + '='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log('\nCurrent Behavior:');
        console.log('  - Institution_user approval endpoint: Changes status to "completed" + deducts inventory');
        console.log('  - Institution_admin approval endpoint: Changes status to "completed" + deducts inventory');
        console.log('  - Both check if status is "pending_approval" before processing');
        console.log('\nPotential Issue:');
        console.log('  - Once first approver changes status to "completed", second approver cannot approve');
        console.log('  - Status check prevents double approval (status must be "pending_approval")');
        console.log('  - This means ONLY the first approver deducts inventory ✅');
        console.log('\nConclusion:');
        console.log('  - If status check is working: ✅ NO DOUBLE DEDUCTION');
        console.log('  - If status is not checked properly: ❌ DOUBLE DEDUCTION POSSIBLE');
        console.log('\nCheck the code:');
        console.log('  - Institution_user endpoint line ~3412: if (request.status !== "pending_approval")');
        console.log('  - Institution_admin endpoint line ~4751: if (request.status !== "pending_approval")');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

testInventoryDeduction().catch(console.error);
