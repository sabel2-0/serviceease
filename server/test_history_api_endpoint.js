// Test the technician history API endpoint
const http = require('http');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ 
                        ok: res.statusCode >= 200 && res.statusCode < 300, 
                        status: res.statusCode, 
                        data: parsed
                    });
                } catch (e) {
                    resolve({ 
                        ok: res.statusCode >= 200 && res.statusCode < 300, 
                        status: res.statusCode, 
                        data: { message: data }
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testTechnicianHistoryAPI() {
    console.log('=== Testing Technician History API ===');
    
    try {
        // First login as technician
        console.log('\n1. Testing technician login...');
        const loginResponse = await makeRequest('http://127.0.0.1:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'markivan.storm@gmail.com',
                password: 'password123'
            })
        });
        
        console.log(`   Login Status: ${loginResponse.status}`);
        
        if (!loginResponse.ok) {
            console.log('   ❌ Login failed:', loginResponse.data.message);
            return;
        }
        
        console.log('   ✅ Login successful');
        const token = loginResponse.data.token;
        
        // Test stats endpoint
        console.log('\n2. Testing stats endpoint...');
        const statsResponse = await makeRequest('http://127.0.0.1:3000/api/technician/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   Stats Status: ${statsResponse.status}`);
        if (statsResponse.ok) {
            console.log('   ✅ Stats loaded successfully');
            console.log('   Stats:', statsResponse.data);
        } else {
            console.log('   ❌ Stats failed:', statsResponse.data.message);
        }
        
        // Test service history endpoint
        console.log('\n3. Testing service history endpoint...');
        const historyResponse = await makeRequest('http://127.0.0.1:3000/api/technician/service-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   History Status: ${historyResponse.status}`);
        if (historyResponse.ok) {
            console.log('   ✅ Service history loaded successfully');
            console.log(`   Found ${historyResponse.data.length} service requests`);
            
            if (historyResponse.data.length > 0) {
                const firstRequest = historyResponse.data[0];
                console.log(`   First request: SR-${firstRequest.id} - ${firstRequest.description}`);
                console.log(`   Status: ${firstRequest.status}`);
                console.log(`   Institution: ${firstRequest.institution_name}`);
                console.log(`   History entries: ${firstRequest.history ? firstRequest.history.length : 0}`);
            }
        } else {
            console.log('   ❌ Service history failed:', historyResponse.data.message);
        }
        
        console.log('\n✅ API Testing Complete!');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testTechnicianHistoryAPI();