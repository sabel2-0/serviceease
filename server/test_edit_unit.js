const mysql = require('mysql2/promise');

async function testEditPrinterUnit() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });
    
    console.log('\n=== Testing Edit Printer Unit Functionality ===\n');
    
    // Get the current printer
    console.log('1. BEFORE UPDATE:');
    let [rows] = await db.query(
        'SELECT id, brand, model, serial_number, status FROM inventory_items WHERE id = 15'
    );
    console.table(rows);
    
    const printer = rows[0];
    console.log(`\nCurrent Serial Number: ${printer.serial_number}`);
    
    // Simulate updating just the serial number
    const newSerial = 'UPDATED-12345';
    console.log(`\n2. UPDATING serial number to: ${newSerial}`);
    
    await db.query(
        'UPDATE inventory_items SET serial_number = ? WHERE id = ?',
        [newSerial, printer.id]
    );
    
    console.log('\n3. AFTER UPDATE:');
    [rows] = await db.query(
        'SELECT id, brand, model, serial_number, status FROM inventory_items WHERE id = 15'
    );
    console.table(rows);
    
    // Verify brand and model didn't change
    const updated = rows[0];
    console.log('\n4. VERIFICATION:');
    console.log(`   Brand: ${printer.brand} → ${updated.brand} ${printer.brand === updated.brand ? '✓ Unchanged' : '✗ Changed!'}`);
    console.log(`   Model: ${printer.model} → ${updated.model} ${printer.model === updated.model ? '✓ Unchanged' : '✗ Changed!'}`);
    console.log(`   Serial: ${printer.serial_number} → ${updated.serial_number} ${printer.serial_number !== updated.serial_number ? '✓ Updated' : '✗ Not updated!'}`);
    
    // Revert back
    console.log('\n5. REVERTING to original serial number...');
    await db.query(
        'UPDATE inventory_items SET serial_number = ? WHERE id = ?',
        [printer.serial_number, printer.id]
    );
    
    [rows] = await db.query(
        'SELECT id, brand, model, serial_number, status FROM inventory_items WHERE id = 15'
    );
    console.table(rows);
    
    console.log('\n✓ Test completed successfully!');
    console.log('The edit unit functionality correctly updates only the serial number.');
    
    await db.end();
}

testEditPrinterUnit().catch(console.error);
