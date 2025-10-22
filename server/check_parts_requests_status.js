const db = require('./config/database');

(async () => {
    try {
        console.log('Checking parts_requests table...\n');
        
        // Check recent parts requests
        const [requests] = await db.query(`
            SELECT 
                pr.id,
                pr.technician_id,
                pr.part_id,
                pr.quantity_requested,
                pr.status,
                pr.created_at,
                pr.approved_at,
                pr.approved_by,
                pp.name as part_name,
                pp.quantity as current_stock
            FROM parts_requests pr
            LEFT JOIN printer_parts pp ON pr.part_id = pp.id
            ORDER BY pr.created_at DESC
            LIMIT 10
        `);
        
        console.log(`Recent parts requests (${requests.length} rows):`);
        requests.forEach(req => {
            console.log(`\nID: ${req.id}`);
            console.log(`  Status: ${req.status}`);
            console.log(`  Technician ID: ${req.technician_id}`);
            console.log(`  Part: ${req.part_name} (ID: ${req.part_id})`);
            console.log(`  Quantity Requested: ${req.quantity_requested}`);
            console.log(`  Current Stock: ${req.current_stock}`);
            console.log(`  Created: ${req.created_at}`);
            console.log(`  Approved: ${req.approved_at || 'N/A'}`);
            console.log(`  Approved By: ${req.approved_by || 'N/A'}`);
        });
        
        // Check if approved requests have corresponding technician inventory entries
        console.log('\n\nChecking approved requests vs technician inventory...');
        const [approvedRequests] = await db.query(`
            SELECT 
                pr.id,
                pr.technician_id,
                pr.part_id,
                pr.quantity_requested,
                pr.approved_at,
                ti.id as inventory_id,
                ti.quantity as inventory_quantity
            FROM parts_requests pr
            LEFT JOIN technician_inventory ti ON 
                pr.technician_id = ti.technician_id AND pr.part_id = ti.part_id
            WHERE pr.status = 'approved'
            ORDER BY pr.approved_at DESC
        `);
        
        console.log(`\nApproved requests (${approvedRequests.length}):`);
        approvedRequests.forEach(req => {
            const status = req.inventory_id ? '✅ In Inventory' : '❌ NOT in Inventory';
            console.log(`Request ${req.id}: ${status} (Tech: ${req.technician_id}, Part: ${req.part_id}, Qty: ${req.quantity_requested}${req.inventory_quantity ? `, Inventory Qty: ${req.inventory_quantity}` : ''})`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
