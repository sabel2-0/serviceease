const db = require('./config/database');

async function checkActualData() {
    console.log('=== Checking Actual Data ===');
    
    try {
        // Check service requests assigned to technicians
        console.log('\n1. Service requests for technicians:');
        const [serviceRequests] = await db.execute(`
            SELECT sr.id, sr.request_number, sr.description, sr.status, sr.location,
                   sr.assigned_technician_id, sr.created_at, sr.completed_at,
                   u.first_name, u.last_name, u.email,
                   i.name as institution_name
            FROM service_requests sr
            LEFT JOIN users u ON sr.assigned_technician_id = u.id
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sr.assigned_technician_id IS NOT NULL
            ORDER BY sr.created_at DESC
            LIMIT 10
        `);
        
        console.log(`Found ${serviceRequests.length} service requests:`);
        serviceRequests.forEach(req => {
            console.log(`   SR-${req.id}: ${req.description || 'No description'} | Status: ${req.status} | Technician: ${req.first_name} ${req.last_name} | Location: ${req.location}`);
        });
        
        // Check service request history
        console.log('\n2. Service request history:');
        const [history] = await db.execute(`
            SELECT srh.id, srh.request_id, srh.previous_status, srh.new_status, 
                   srh.notes, srh.created_at, srh.changed_by,
                   u.first_name, u.last_name
            FROM service_request_history srh
            LEFT JOIN users u ON srh.changed_by = u.id
            ORDER BY srh.created_at DESC
            LIMIT 10
        `);
        
        console.log(`Found ${history.length} history records:`);
        history.forEach(hist => {
            console.log(`   Request ${hist.request_id}: ${hist.previous_status} → ${hist.new_status} | By: ${hist.first_name} ${hist.last_name} | Date: ${hist.created_at}`);
        });
        
        // Check technicians
        console.log('\n3. Available technicians:');
        const [technicians] = await db.execute(`
            SELECT id, first_name, last_name, email, status
            FROM users 
            WHERE role = 'technician'
            ORDER BY id
        `);
        
        console.log(`Found ${technicians.length} technicians:`);
        technicians.forEach(tech => {
            console.log(`   ID: ${tech.id}, Name: ${tech.first_name} ${tech.last_name}, Email: ${tech.email}, Status: ${tech.status}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit();
}

checkActualData();