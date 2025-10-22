const db = require('./config/database');

async function checkTableStructures() {
    try {
        console.log('🔍 Checking table structures...\n');
        
        // Check service_approvals table structure
        const [approvalColumns] = await db.query(`DESCRIBE service_approvals`);
        console.log('📋 service_approvals table structure:');
        console.table(approvalColumns);
        
        // Check service_parts_used table structure
        const [partsColumns] = await db.query(`DESCRIBE service_parts_used`);
        console.log('\n🔧 service_parts_used table structure:');
        console.table(partsColumns);
        
        // Check job_orders table structure (if exists)
        try {
            const [jobOrderColumns] = await db.query(`DESCRIBE job_orders`);
            console.log('\n📄 job_orders table structure:');
            console.table(jobOrderColumns);
        } catch (error) {
            console.log('\n📄 job_orders table does not exist');
        }
        
        // Check what's actually in service_approvals
        const [approvals] = await db.query(`SELECT * FROM service_approvals LIMIT 5`);
        console.log('\n📝 Current service_approvals records:');
        console.table(approvals);
        
        // Check what's actually in service_parts_used
        const [parts] = await db.query(`SELECT * FROM service_parts_used LIMIT 5`);
        console.log('\n🔧 Current service_parts_used records:');
        console.table(parts);
        
    } catch (error) {
        console.error('❌ Error checking table structures:', error);
    } finally {
        process.exit(0);
    }
}

checkTableStructures();