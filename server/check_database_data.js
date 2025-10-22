const db = require('./config/database');

async function checkDatabaseData() {
    try {
        console.log('🔍 Checking database data...\n');
        
        // Check users
        const [users] = await db.query(`SELECT id, first_name, last_name, email, role FROM users LIMIT 10`);
        console.log('👥 Available Users:');
        console.table(users);
        
        // Check parts
        const [parts] = await db.query(`SELECT id, name, category, quantity, unit FROM printer_parts LIMIT 10`);
        console.log('\n🔧 Available Parts:');
        console.table(parts);
        
        // Check technician inventory
        const [inventory] = await db.query(`
            SELECT ti.id, ti.technician_id, ti.quantity, pp.name, pp.category, pp.unit
            FROM technician_inventory ti
            JOIN printer_parts pp ON ti.part_id = pp.id
            LIMIT 10
        `);
        console.log('\n📦 Technician Inventory:');
        console.table(inventory);
        
        // Check the service request that was updated
        const [serviceRequest] = await db.query(`
            SELECT id, request_number, status, resolved_by, resolved_at 
            FROM service_requests 
            WHERE id = 51
        `);
        console.log('\n📋 Service Request 51 Status:');
        console.table(serviceRequest);
        
        // Check service approvals
        const [approvals] = await db.query(`
            SELECT * FROM service_approvals 
            WHERE service_request_id = 51
        `);
        console.log('\n📝 Service Approvals for Request 51:');
        console.table(approvals);
        
    } catch (error) {
        console.error('❌ Error checking database data:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabaseData();