const db = require('./config/database');
require('dotenv').config();

async function checkPublicSchools() {
    try {
        console.log('Checking public schools data...\n');
        
        // Get public schools
        const [schools] = await db.query(`
            SELECT institution_id, name, type 
            FROM institutions 
            WHERE type = 'public_school' 
            LIMIT 10
        `);
        console.log('Public Schools:', schools.length);
        schools.forEach(s => console.log(`  - ${s.name} (${s.institution_id})`));
        
        // Count maintenance services for public schools
        const [count] = await db.query(`
            SELECT COUNT(*) as cnt 
            FROM maintenance_services ms
            JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id COLLATE utf8mb4_0900_ai_ci
            WHERE i.type = 'public_school'
        `);
        console.log('\nTotal maintenance services for public schools:', count[0].cnt);
        
        // Count by status
        const [byStatus] = await db.query(`
            SELECT ms.status, COUNT(*) as cnt 
            FROM maintenance_services ms
            JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id COLLATE utf8mb4_0900_ai_ci
            WHERE i.type = 'public_school'
            GROUP BY ms.status
        `);
        console.log('\nBy Status:');
        byStatus.forEach(s => console.log(`  ${s.status}: ${s.cnt}`));
        
        // Check completed/approved services in December 2024
        const [dec2024] = await db.query(`
            SELECT 
                DATE(ms.created_at) as date,
                COUNT(*) as cnt,
                i.name as school_name,
                ms.status
            FROM maintenance_services ms
            JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id COLLATE utf8mb4_0900_ai_ci
            WHERE i.type = 'public_school'
                AND YEAR(ms.created_at) = 2024
                AND MONTH(ms.created_at) = 12
                AND ms.status IN ('completed', 'approved')
            GROUP BY DATE(ms.created_at), i.name, ms.status
            ORDER BY date
            LIMIT 10
        `);
        console.log('\nDecember 2024 Services:');
        if (dec2024.length === 0) {
            console.log('  No services found');
        } else {
            dec2024.forEach(s => console.log(`  ${s.date}: ${s.school_name} - ${s.status} (${s.cnt})`));
        }
        
        // Get sample services
        const [sample] = await db.query(`
            SELECT 
                ms.id,
                ms.institution_id,
                i.name as school_name,
                i.type,
                ms.status,
                DATE(ms.created_at) as created,
                YEAR(ms.created_at) as year,
                MONTH(ms.created_at) as month
            FROM maintenance_services ms
            JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id COLLATE utf8mb4_0900_ai_ci
            WHERE i.type = 'public_school'
            ORDER BY ms.created_at DESC
            LIMIT 5
        `);
        console.log('\nRecent Services (any status):');
        sample.forEach(s => console.log(`  ${s.created} - ${s.school_name} - ${s.status}`));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPublicSchools();
