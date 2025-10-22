const db = require('./config/database');

// Test the updated technician history API with parts data
async function testUpdatedAPI() {
    console.log('=== Testing Updated Technician History API with Parts ===');
    
    try {
        const technicianId = 23; // Mark Ivan Sumalinog
        
        // Test the same query that the API uses
        console.log(`\n1. Testing service history query for technician ID: ${technicianId}`);
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
        
        console.log(`Found ${serviceHistory.length} service requests`);
        
        if (serviceHistory.length > 0) {
            const requestId = serviceHistory[0].id;
            console.log(`\n2. Testing parts query for service request ID: ${requestId}`);
            
            // Test the parts used query
            const [partsUsed] = await db.execute(`
                SELECT 
                    spu.id,
                    spu.quantity_used,
                    spu.notes as part_notes,
                    spu.used_at,
                    pp.name as part_name,
                    pp.brand,
                    pp.unit,
                    pp.category,
                    pp.part_number,
                    pp.description as part_description,
                    u.first_name as used_by_first_name,
                    u.last_name as used_by_last_name
                FROM service_parts_used spu
                LEFT JOIN printer_parts pp ON spu.part_id = pp.id
                LEFT JOIN users u ON spu.used_by = u.id
                WHERE spu.service_request_id = ?
                ORDER BY spu.used_at ASC
            `, [requestId]);
            
            console.log(`Found ${partsUsed.length} parts used`);
            if (partsUsed.length > 0) {
                console.log('Parts details:');
                partsUsed.forEach(part => {
                    console.log(`   - ${part.part_name} (${part.brand})`);
                    console.log(`     Quantity: ${part.quantity_used} ${part.unit}`);
                    console.log(`     Category: ${part.category}`);
                    console.log(`     Part Number: ${part.part_number || 'N/A'}`);
                    console.log(`     Used by: ${part.used_by_first_name} ${part.used_by_last_name}`);
                    if (part.part_notes) {
                        console.log(`     Notes: ${part.part_notes}`);
                    }
                    console.log('');
                });
            }
            
            console.log(`\n3. Testing history query for service request ID: ${requestId}`);
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
            
            console.log(`Found ${history.length} history entries`);
            if (history.length > 0) {
                console.log('Status history:');
                history.forEach(hist => {
                    console.log(`   ${hist.previous_status} → ${hist.new_status} by ${hist.first_name} ${hist.last_name} on ${hist.created_at}`);
                });
            }
        }
        
        console.log('\n✅ All queries working! The updated API should now include parts data.');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit();
}

testUpdatedAPI();