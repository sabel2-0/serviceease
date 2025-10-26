const mysql = require('mysql2/promise');

async function allowNullInstitutionId() {
    const db = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Natusv1ncere.',
        database: 'serviceease'
    });

    console.log('\n=== Modifying institution_id to allow NULL ===\n');

    try {
        // First check current constraint
        const [columns] = await db.query(
            "SHOW COLUMNS FROM service_requests WHERE Field = 'institution_id'"
        );
        
        console.log('Current institution_id column:', columns[0]);
        
        // Modify the column to allow NULL
        await db.query(`
            ALTER TABLE service_requests 
            MODIFY COLUMN institution_id VARCHAR(50) NULL
        `);
        
        console.log('✅ Successfully modified institution_id to allow NULL values');
        
        // Verify the change
        const [updatedColumns] = await db.query(
            "SHOW COLUMNS FROM service_requests WHERE Field = 'institution_id'"
        );
        
        console.log('Updated institution_id column:', updatedColumns[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    await db.end();
    console.log('\n✅ Done!\n');
    process.exit(0);
}

allowNullInstitutionId().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
