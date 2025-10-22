const db = require('./config/database');

// Test the technician history API queries directly
async function testTechnicianHistoryQueries() {
    console.log('=== Testing Technician History API Queries ===');
    
    try {
        const technicianId = 23; // Mark Ivan Sumalinog from our data check
        
        // Test main service history query
        console.log(`\n1. Testing service history for technician ID: ${technicianId}`);
        const [serviceHistory] = await db.execute(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.description,
                sr.location,
                sr.status,
                sr.priority,
                sr.created_at,
                sr.started_at,
                sr.completed_at,
                sr.resolution_notes,
                i.name as institution_name,
                i.type as institution_type,
                coord.first_name as coordinator_first_name,
                coord.last_name as coordinator_last_name
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users coord ON sr.coordinator_id = coord.id
            WHERE sr.assigned_technician_id = ?
            ORDER BY sr.created_at DESC
        `, [technicianId]);
        
        console.log(`Found ${serviceHistory.length} service requests:`);
        serviceHistory.forEach(req => {
            console.log(`   SR-${req.id}: ${req.description} | Status: ${req.status} | Institution: ${req.institution_name}`);
        });
        
        // Test history query for each service request
        if (serviceHistory.length > 0) {
            const requestId = serviceHistory[0].id;
            console.log(`\n2. Testing history for service request ID: ${requestId}`);
            
            const [history] = await db.execute(`
                SELECT 
                    srh.id,
                    srh.previous_status,
                    srh.new_status,
                    srh.notes,
                    srh.created_at,
                    u.first_name,
                    u.last_name,
                    u.role
                FROM service_request_history srh
                LEFT JOIN users u ON srh.changed_by = u.id
                WHERE srh.request_id = ?
                ORDER BY srh.created_at ASC
            `, [requestId]);
            
            console.log(`Found ${history.length} history records:`);
            history.forEach(hist => {
                console.log(`   ${hist.previous_status} → ${hist.new_status} | By: ${hist.first_name} ${hist.last_name} (${hist.role}) | Date: ${hist.created_at}`);
            });
        }
        
        // Test stats query
        console.log(`\n3. Testing statistics query for technician ID: ${technicianId}`);
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_approval,
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned
            FROM service_requests 
            WHERE assigned_technician_id = ?
        `, [technicianId]);
        
        console.log('Statistics:');
        console.log(`   Total: ${stats[0].total_requests}, Completed: ${stats[0].completed}, In Progress: ${stats[0].in_progress}, Pending Approval: ${stats[0].pending_approval}, Assigned: ${stats[0].assigned}`);
        
    } catch (error) {
        console.error('Query test error:', error.message);
    }
    
    process.exit();
}

testTechnicianHistoryQueries();