const db = require('./server/config/database');

async function testAPI() {
    try {
        const technicianId = 57;
        
        console.log('Testing the exact query from the API...\n');
        
        const query = `
            SELECT 
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                i.address,
                i.status,
                COUNT(DISTINCT upa.inventory_item_id) as total_printers,
                COUNT(DISTINCT CASE 
                    WHEN vs.status = 'completed' 
                    AND vs.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    THEN vs.printer_id 
                END) as serviced_count,
                COUNT(DISTINCT CASE 
                    WHEN vs.status IN ('pending_coordinator', 'pending_requester')
                    THEN vs.printer_id 
                END) as pending_count
            FROM technician_assignments ta
            INNER JOIN institutions i ON ta.institution_id = i.institution_id
            LEFT JOIN user_printer_assignments upa ON upa.institution_id = i.institution_id
            LEFT JOIN voluntary_services vs ON vs.printer_id = upa.inventory_item_id 
                AND vs.technician_id = ?
            WHERE ta.technician_id = ?
                AND i.type = 'public_school'
                AND i.status = 'active'
            GROUP BY i.institution_id, i.name, i.type, i.address, i.status
            ORDER BY i.name ASC
        `;
        
        const [schools] = await db.query(query, [technicianId, technicianId]);
        
        console.log('✅ Query successful!');
        console.log(`Found ${schools.length} schools\n`);
        console.log(JSON.stringify(schools, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

testAPI();
