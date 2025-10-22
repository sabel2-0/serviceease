// Simple API test for technician parts endpoint
const http = require('http');

const testTechnicianPartsAPI = () => {
    console.log('Testing Technician Parts API...');
    
    // First, let's test the parts endpoint without authentication to see the error
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/technician/parts',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`Response Status: ${res.statusCode}`);
            console.log('Response Headers:', res.headers);
            console.log('Response Body:', data);
            
            if (res.statusCode === 401) {
                console.log('✅ Authentication is working - 401 Unauthorized as expected');
            } else {
                console.log('⚠️ Unexpected response');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Request failed:', error);
    });
    
    req.end();
};

testTechnicianPartsAPI();