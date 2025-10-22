const db = require('./config/database');

(async () => {
    try {
        console.log('Testing dashboard stats queries...\n');

        const [users] = await db.query('SELECT COUNT(*) as count FROM users');
        console.log('Total Users:', users[0].count);

        const [pending] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "coordinator" AND approval_status = "pending"');
        console.log('Pending Coordinators:', pending[0].count);

        const [institutions] = await db.query('SELECT COUNT(*) as count FROM institutions');
        console.log('Total Institutions:', institutions[0].count);

        const [requests] = await db.query('SELECT COUNT(*) as count FROM service_requests WHERE status IN ("pending", "in_progress", "approved")');
        console.log('Active Service Requests:', requests[0].count);

        const [printers] = await db.query('SELECT COUNT(*) as count FROM inventory_items');
        console.log('Total Printers:', printers[0].count);

        const [available] = await db.query('SELECT COUNT(*) as count FROM inventory_items i WHERE NOT EXISTS (SELECT 1 FROM client_printer_assignments cpa WHERE cpa.inventory_item_id = i.id)');
        console.log('Available Printers:', available[0].count);

        const [parts_req] = await db.query('SELECT COUNT(*) as count FROM parts_requests WHERE status = "pending"');
        console.log('Pending Parts Requests:', parts_req[0].count);

        const [parts] = await db.query('SELECT SUM(quantity_available) as count FROM parts_inventory');
        console.log('Total Parts:', parts[0].count || 0);

        const [techs] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "technician"');
        console.log('Total Technicians:', techs[0].count);

        console.log('\nAll queries successful!');
    } catch(err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
})();
