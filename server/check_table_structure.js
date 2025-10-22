const db = require('./config/database');

async function checkTableStructure() {
    try {
        console.log('Checking current printer_parts table structure...');
        
        // Show table structure
        const [columns] = await db.query('DESCRIBE printer_parts');
        console.log('Current columns:');
        columns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });
        
        // Check if brand column exists
        const brandColumn = columns.find(col => col.Field === 'brand');
        if (!brandColumn) {
            console.log('\n❌ Brand column does not exist. Adding it now...');
            
            // Add brand column
            await db.query('ALTER TABLE printer_parts ADD COLUMN brand VARCHAR(255) AFTER name');
            console.log('✅ Brand column added successfully!');
            
            // Show updated structure
            const [newColumns] = await db.query('DESCRIBE printer_parts');
            console.log('\nUpdated table structure:');
            newColumns.forEach(col => {
                console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
            });
        } else {
            console.log('\n✅ Brand column already exists!');
        }
        
        console.log('\nTable structure check completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error checking table structure:', error);
        process.exit(1);
    }
}

checkTableStructure();