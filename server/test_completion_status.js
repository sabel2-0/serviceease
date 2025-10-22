const db = require('./config/database');

async function checkCompletionStatus() {
    try {
        console.log('🔍 Checking service completion status in database...\n');
        
        // Check service requests
        const [serviceRequests] = await db.query(`
            SELECT 
                sr.id, 
                sr.request_number, 
                sr.status, 
                sr.resolved_by,
                sr.resolved_at,
                sr.resolution_notes,
                sr.updated_at,
                CONCAT(u.first_name, ' ', u.last_name) as technician_name
            FROM service_requests sr
            LEFT JOIN users u ON sr.resolved_by = u.id
            WHERE sr.status IN ('pending_approval', 'completed', 'in_progress')
            ORDER BY sr.updated_at DESC 
            LIMIT 10
        `);
        
        console.log('📋 Recent Service Requests:');
        console.table(serviceRequests);
        
        // Check service approvals
        const [approvals] = await db.query(`
            SELECT 
                sa.id,
                sa.service_request_id,
                sa.technician_id,
                sa.status,
                sa.submitted_at,
                sa.approved_at,
                CONCAT(tech.first_name, ' ', tech.last_name) as technician_name,
                CONCAT(coord.first_name, ' ', coord.last_name) as coordinator_name
            FROM service_approvals sa
            LEFT JOIN users tech ON sa.technician_id = tech.id
            LEFT JOIN users coord ON sa.approved_by = coord.id
            ORDER BY sa.submitted_at DESC
            LIMIT 10
        `);
        
        console.log('\n📝 Service Approvals:');
        console.table(approvals);
        
        // Check parts used
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.service_request_id,
                pp.name as part_name,
                spu.quantity_used,
                spu.unit,
                spu.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as recorded_by
            FROM service_parts_used spu
            JOIN printer_parts pp ON spu.part_id = pp.id
            LEFT JOIN users u ON spu.recorded_by = u.id
            ORDER BY spu.created_at DESC
            LIMIT 10
        `);
        
        console.log('\n🔧 Parts Used in Services:');
        console.table(partsUsed);
        
        // Check job orders
        const [jobOrders] = await db.query(`
            SELECT 
                jo.id,
                jo.request_id,
                jo.technician_id,
                jo.actions_performed,
                jo.additional_notes,
                jo.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as technician_name
            FROM job_orders jo
            LEFT JOIN users u ON jo.technician_id = u.id
            ORDER BY jo.created_at DESC
            LIMIT 10
        `);
        
        console.log('\n📄 Job Orders:');
        console.table(jobOrders);
        
        // Check service request history
        const [history] = await db.query(`
            SELECT 
                srh.id,
                srh.request_id,
                srh.previous_status,
                srh.new_status,
                srh.notes,
                srh.changed_at,
                CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
            FROM service_request_history srh
            LEFT JOIN users u ON srh.changed_by = u.id
            WHERE srh.new_status = 'pending_approval' OR srh.notes LIKE '%completion%'
            ORDER BY srh.changed_at DESC
            LIMIT 10
        `);
        
        console.log('\n📈 Service Request History (Completions):');
        console.table(history);
        
    } catch (error) {
        console.error('❌ Error checking completion status:', error);
    } finally {
        process.exit(0);
    }
}

checkCompletionStatus();