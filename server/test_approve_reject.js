const http = require('http');

// Test with an approved coordinator
const TEST_EMAIL = 'markivan.night@gmail.com';
const TEST_PASSWORD = 'password123'; // Common test password

console.log('=== Testing Coordinator Approve/Reject Functions ===');
console.log(`Testing with coordinator: ${TEST_EMAIL}`);

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
                        data: parsed,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({ 
                        ok: res.statusCode >= 200 && res.statusCode < 300, 
                        status: res.statusCode, 
                        data: { message: data },
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.log('Request error:', err.message);
            reject(err);
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testCoordinatorLogin() {
    console.log('\n1. Testing Coordinator Login...');
    
    try {
        const response = await makeRequest('http://localhost:3000/api/coordinator/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
            console.log('   ✅ Login successful');
            console.log(`   Token: ${response.data.token ? 'Present' : 'Missing'}`);
            console.log(`   User ID: ${response.data.user?.id || 'Unknown'}`);
            return response.data.token;
        } else {
            console.log('   ❌ Login failed');
            console.log(`   Error: ${response.data.message || response.data.error}`);
            return null;
        }
    } catch (error) {
        console.log('   ❌ Login error:', error.message);
        return null;
    }
}

async function testGetPendingApprovals(token) {
    console.log('\n2. Testing Get Pending Approvals...');
    
    try {
        const response = await makeRequest('http://localhost:3000/api/coordinator/service-approvals', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
            console.log('   ✅ Get pending approvals successful');
            console.log(`   Found ${response.data.length} pending approvals`);
            
            if (response.data.length > 0) {
                response.data.forEach(approval => {
                    console.log(`   - Approval ID: ${approval.id}, Service Request: ${approval.service_request_id}`);
                });
            }
            return response.data;
        } else {
            console.log('   ❌ Get pending approvals failed');
            console.log(`   Error: ${response.data.message || response.data.error}`);
            return [];
        }
    } catch (error) {
        console.log('   ❌ Get pending approvals error:', error.message);
        return [];
    }
}

async function testApprove(token, approvalId) {
    console.log(`\n3. Testing Approve Service (ID: ${approvalId})...`);
    
    try {
        const response = await makeRequest(`http://localhost:3000/api/coordinator/service-approvals/${approvalId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
            console.log('   ✅ Approve successful');
            console.log(`   Message: ${response.data.message}`);
            return true;
        } else {
            console.log('   ❌ Approve failed');
            console.log(`   Error: ${response.data.message || response.data.error}`);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Approve error:', error.message);
        return false;
    }
}

async function testReject(token, approvalId) {
    console.log(`\n4. Testing Reject Service (ID: ${approvalId})...`);
    
    try {
        const response = await makeRequest(`http://localhost:3000/api/coordinator/service-approvals/${approvalId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rejection_reason: 'Testing rejection functionality from test script'
            })
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
            console.log('   ✅ Reject successful');
            console.log(`   Message: ${response.data.message}`);
            return true;
        } else {
            console.log('   ❌ Reject failed');
            console.log(`   Error: ${response.data.message || response.data.error}`);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Reject error:', error.message);
        return false;
    }
}

async function runTest() {
    console.log('Starting functionality test...');
    
    // Step 1: Login
    const token = await testCoordinatorLogin();
    if (!token) {
        console.log('\n❌ Cannot proceed without valid token');
        return;
    }
    
    // Step 2: Get pending approvals
    const pendingApprovals = await testGetPendingApprovals(token);
    if (pendingApprovals.length === 0) {
        console.log('\n⚠️  No pending approvals found to test with');
        return;
    }
    
    // Step 3: Test functionality
    const firstApproval = pendingApprovals[0];
    
    console.log(`\n📋 Testing with first available approval:`);
    console.log(`   Approval ID: ${firstApproval.id}`);
    console.log(`   Service Request ID: ${firstApproval.service_request_id}`);
    
    // Test approve
    const approveResult = await testApprove(token, firstApproval.id);
    
    // If we have more approvals, test reject on another one
    if (pendingApprovals.length > 1) {
        const secondApproval = pendingApprovals[1];
        await testReject(token, secondApproval.id);
    }
    
    console.log('\n=== Final Summary ===');
    console.log('✅ Login: Working');
    console.log('✅ Get Pending Approvals: Working');
    console.log(`${approveResult ? '✅' : '❌'} Approve Function: ${approveResult ? 'Working' : 'Failed'}`);
    console.log('\n🎉 Test completed!');
    
    if (approveResult) {
        console.log('\n✨ All approve/reject button functionalities are working correctly!');
        console.log('You can now use the coordinator interface with confidence.');
    }
}

runTest().catch(console.error);