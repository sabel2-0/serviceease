const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRailwayDatabase() {
    const railwayConfig = {
        host: process.env.MYSQLHOST || process.env.DB_HOST,
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
        user: process.env.MYSQLUSER || process.env.DB_USER,
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
        database: process.env.MYSQLDATABASE || process.env.DB_NAME
    };

    console.log('🔗 Attempting to connect to Railway database...');
    console.log('Connection config:', {
        host: railwayConfig.host,
        port: railwayConfig.port,
        user: railwayConfig.user,
        database: railwayConfig.database,
        password: railwayConfig.password ? '***' : 'NOT SET'
    });

    try {
        const connection = await mysql.createConnection(railwayConfig);
        console.log('✅ Connected to Railway database successfully!\n');

        // Check all tables
        console.log('📋 TABLES IN DATABASE:');
        const [tables] = await connection.query('SHOW TABLES');
        console.table(tables);

        // Check users table structure
        console.log('\n👤 USERS TABLE STRUCTURE:');
        const [usersColumns] = await connection.query('DESCRIBE users');
        console.table(usersColumns);

        // Check users data
        console.log('\n👥 USERS DATA:');
        const [users] = await connection.query('SELECT id, first_name, last_name, email, role, status, created_at FROM users ORDER BY id');
        console.table(users);

        // Check temp_user_photos table structure
        console.log('\n📸 TEMP_USER_PHOTOS TABLE STRUCTURE:');
        const [photosColumns] = await connection.query('DESCRIBE temp_user_photos');
        console.table(photosColumns);

        // Check temp_user_photos data
        console.log('\n🖼️ TEMP_USER_PHOTOS DATA:');
        const [photos] = await connection.query('SELECT * FROM temp_user_photos');
        console.table(photos);

        // Check for pending coordinator registrations
        console.log('\n⏳ PENDING COORDINATOR REGISTRATIONS:');
        const [pending] = await connection.query(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                u.status,
                p.front_id_photo,
                p.back_id_photo,
                p.selfie_photo
            FROM users u
            LEFT JOIN temp_user_photos p ON u.id = p.user_id
            WHERE u.role = 'coordinator' AND u.status = 'pending'
        `);
        console.table(pending);

        // Check foreign key constraints
        console.log('\n🔗 FOREIGN KEY CONSTRAINTS ON temp_user_photos:');
        const [constraints] = await connection.query(`
            SELECT 
                CONSTRAINT_NAME,
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'temp_user_photos'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [railwayConfig.database]);
        console.table(constraints);

        // Check institutions table
        console.log('\n🏛️ INSTITUTIONS TABLE:');
        const [institutions] = await connection.query('SELECT * FROM institutions ORDER BY id');
        console.table(institutions);

        await connection.end();
        console.log('\n✅ Database check complete!');
    } catch (error) {
        console.error('❌ Error connecting to Railway database:', error.message);
        console.error('Full error:', error);
    }
}

checkRailwayDatabase();
