// Test service completion via API call
const fetch = require('node-fetch');

async function testServiceCompletionAPI() {
    try {
        console.log('🧪 Testing Service Completion via API...\n');
        
        // First, let's get a valid JWT token for technician (ID 23)
        const loginResponse = await fetch('http://localhost:3000/api/technician/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'markivan.storm@gmail.com',
                password: 'password123' // Assuming this is the password
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed - will use existing token for testing');
            // Use the token from browser if available
            var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjMsImVtYWlsIjoibWFya2l2YW4uc3Rvcm1AZ21haWwuY29tIiwicm9sZSI6InRlY2huaWNpYW4iLCJpbnN0aXR1dGlvbl9pZCI6bnVsbCwiaWF0IjoxNzYwMTk1ODE0LCJleHAiOjE3NjAyODIyMTR9.fpNMJj8wXwKoCVEnIcC1UyxZIQ7FutsPeUccvyC1lzI';
        } else {
            const loginData = await loginResponse.json();
            var token = loginData.token;
            console.log('✅ Login successful');
        }
        
        // Test data for completion
        const completionData = {
            actions: 'Fixed printer issue - replaced toner cartridge and cleaned print heads. Printer is now working properly.',
            notes: 'Everything working properly after service. Recommend regular cleaning every 3 months.',
            parts: [
                {
                    name: 'HP Toner 85A Black',
                    qty: 1,
                    unit: 'pieces'
                }
            ]
        };
        
        console.log('📝 Submitting completion data:', completionData);
        
        // Submit service completion
        const completionResponse = await fetch('http://localhost:3000/api/technician/service-requests/51/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(completionData)
        });
        
        const responseText = await completionResponse.text();
        console.log('\n📡 API Response Status:', completionResponse.status);
        console.log('📡 API Response Text:', responseText);
        
        if (completionResponse.ok) {
            const result = JSON.parse(responseText);
            console.log('✅ Service completion successful!');
            console.log('📋 Result:', result);
            
            // Wait a moment then check database
            setTimeout(async () => {
                await checkDatabaseAfterCompletion();
            }, 1000);
        } else {
            console.log('❌ Service completion failed');
            console.log('Error details:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

async function checkDatabaseAfterCompletion() {
    try {
        const db = require('./config/database');
        
        console.log('\n🔍 Checking database after completion...');
        
        // Check service request status
        const [serviceRequest] = await db.query(`
            SELECT id, request_number, status, resolved_by, resolved_at, resolution_notes 
            FROM service_requests WHERE id = 51
        `);
        
        console.log('\n📋 Service Request Status:');
        console.table(serviceRequest);
        
        // Check service approvals
        const [approvals] = await db.query(`
            SELECT * FROM service_approvals WHERE service_request_id = 51
        `);
        
        console.log('\n📝 Service Approvals:');
        console.table(approvals);
        
        // Check parts used
        const [partsUsed] = await db.query(`
            SELECT spu.*, pp.name as part_name 
            FROM service_parts_used spu 
            JOIN printer_parts pp ON spu.part_id = pp.id 
            WHERE spu.service_request_id = 51
        `);
        
        console.log('\n🔧 Parts Used:');
        console.table(partsUsed);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking database:', error);
        process.exit(1);
    }
}

testServiceCompletionAPI();