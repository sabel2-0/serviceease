const db = require('./config/database');

async function checkPartsRelatedTables() {
    try {
        console.log('=== Checking Parts-Related Tables ===\n');

        // Check service_parts_used table
        console.log('1. SERVICE_PARTS_USED TABLE:');
        try {
            const [spuColumns] = await db.query('DESCRIBE service_parts_used');
            spuColumns.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        } catch (error) {
            console.log('   ❌ Table does not exist:', error.message);
        }

        // Check printer_parts table
        console.log('\n2. PRINTER_PARTS TABLE:');
        try {
            const [ppColumns] = await db.query('DESCRIBE printer_parts');
            ppColumns.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        } catch (error) {
            console.log('   ❌ Table does not exist:', error.message);
        }

        // Check for any parts-related tables
        console.log('\n3. ALL TABLES WITH "PART" IN NAME:');
        const [tables] = await db.query('SHOW TABLES LIKE "%part%"');
        if (tables.length > 0) {
            tables.forEach(table => {
                console.log(`   - ${Object.values(table)[0]}`);
            });
        } else {
            console.log('   No tables found with "part" in name');
        }

        // Check relationships by looking for foreign keys
        console.log('\n4. CHECKING RELATIONSHIPS:');
        
        // Check service_requests relationships
        console.log('   Service Requests FK constraints:');
        const [srFks] = await db.query(`
            SELECT 
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM 
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'service_requests' 
                AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        srFks.forEach(fk => {
            console.log(`     ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        });

        // Check service_approvals relationships
        console.log('   Service Approvals FK constraints:');
        const [saFks] = await db.query(`
            SELECT 
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM 
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'service_approvals' 
                AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        saFks.forEach(fk => {
            console.log(`     ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        });

        console.log('\n=== Parts table analysis completed ===');
        process.exit(0);
    } catch (error) {
        console.error('Error checking parts tables:', error);
        process.exit(1);
    }
}

checkPartsRelatedTables();