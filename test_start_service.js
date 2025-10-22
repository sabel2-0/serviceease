/**
 * Simple test script to verify the start service API works
 */

const fetch = require('node-fetch');

async function testStartService() {
    try {
        console.log('Testing start service API...');
        
        // First, let's try to authenticate as a technician
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'tech@example.com', // You might need to adjust this
                password: 'password123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('Could not log in as technician, trying without auth for now...');
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('Logged in successfully, testing start service...');
        
        // Test the start service API
        const response = await fetch('http://localhost:3000/api/technician/service-requests/50/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'in_progress' })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.raw());
        
        const result = await response.text();
        console.log('Response body:', result);
        
        if (response.ok) {
            console.log('✅ Start service API is working!');
            const data = JSON.parse(result);
            if (data.started_at) {
                console.log('✅ Started at timestamp:', data.started_at);
            }
        } else {
            console.log('❌ Start service API failed with status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error testing start service:', error);
    }
}

testStartService();