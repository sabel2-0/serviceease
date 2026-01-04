const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixTechnicianInventory() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Connected to database');
        
        // Get all technician inventory items that have incorrect remaining values
        const [items] = await connection.query(`
            SELECT ti.id, ti.technician_id, ti.item_id, ti.quantity, 
                   ti.remaining_volume, ti.remaining_weight, ti.is_opened,
                   pi.ink_volume, pi.toner_weight, pi.name as item_name
            FROM technician_inventory ti
            JOIN printer_items pi ON ti.item_id = pi.id
            WHERE ti.quantity > 0
        `);

        console.log(`\nFound ${items.length} inventory items to check`);

        for (const item of items) {
            const isInk = item.ink_volume && parseFloat(item.ink_volume) > 0;
            const capacityPerPiece = isInk ? parseFloat(item.ink_volume) : parseFloat(item.toner_weight || 0);
            
            // The correct logic:
            // - If NOT opened: remaining_volume/weight should be NULL, is_opened = 0
            // - If opened: remaining_volume/weight should be <= capacityPerPiece (one item), is_opened = 1
            
            const currentRemaining = isInk ? item.remaining_volume : item.remaining_weight;
            
            // Check if the remaining value is suspiciously high (indicating multiple items were counted)
            if (currentRemaining && currentRemaining > capacityPerPiece) {
                console.log(`\n❌ FIXING: ${item.item_name} (ID: ${item.id})`);
                console.log(`   Technician ID: ${item.technician_id}`);
                console.log(`   Quantity: ${item.quantity}`);
                console.log(`   Current remaining: ${currentRemaining}${isInk ? 'ml' : 'g'} (INCORRECT - exceeds capacity)`);
                console.log(`   Capacity per piece: ${capacityPerPiece}${isInk ? 'ml' : 'g'}`);
                
                // Reset to unopened state
                await connection.query(`
                    UPDATE technician_inventory
                    SET remaining_volume = NULL,
                        remaining_weight = NULL,
                        is_opened = 0
                    WHERE id = ?
                `, [item.id]);
                
                console.log(`   ✅ FIXED: Set to unopened state (remaining = NULL, is_opened = 0)`);
            } else if (!currentRemaining && item.is_opened) {
                // Item marked as opened but has no remaining value
                console.log(`\n❌ FIXING: ${item.item_name} (ID: ${item.id})`);
                console.log(`   Marked as opened but no remaining value`);
                
                await connection.query(`
                    UPDATE technician_inventory
                    SET is_opened = 0
                    WHERE id = ?
                `, [item.id]);
                
                console.log(`   ✅ FIXED: Set is_opened = 0`);
            } else {
                console.log(`✓ ${item.item_name} - OK (Qty: ${item.quantity}, Remaining: ${currentRemaining || 'N/A'}${isInk ? 'ml' : 'g'}, Opened: ${item.is_opened})`);
            }
        }

        console.log('\n✅ Technician inventory fix completed!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixTechnicianInventory();
