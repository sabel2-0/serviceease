const mysql = require('mysql2/promise');

async function dropColumns() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    try {
        console.log('🔍 Checking voluntary_services table structure...');

        // Check if columns exist
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'serviceease' 
            AND TABLE_NAME = 'voluntary_services'
            AND COLUMN_NAME IN ('time_spent', 'before_photos', 'after_photos')
        `);

        const existingColumns = columns.map(c => c.COLUMN_NAME);
        console.log('📋 Columns to drop:', existingColumns);

        // Drop each column if it exists
        for (const columnName of existingColumns) {
            console.log(`🗑️  Dropping column: ${columnName}...`);
            await connection.query(`
                ALTER TABLE voluntary_services 
                DROP COLUMN ${columnName}
            `);
            console.log(`✅ Dropped column: ${columnName}`);
        }

        // Show updated structure
        const [updatedStructure] = await connection.query('DESCRIBE voluntary_services');
        console.log('\n✅ Updated voluntary_services table structure:');
        console.table(updatedStructure);

        console.log('\n🎉 Successfully removed time_spent, before_photos, and after_photos columns!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

dropColumns();
