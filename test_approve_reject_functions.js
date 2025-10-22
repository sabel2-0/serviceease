const http = require('http');

const BASE_URL = 'http://localhost:3000';

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
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => Promise.resolve(parsed) });
                } catch (e) {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => Promise.resolve({ message: data }) });
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
const COORDINATOR_ID = 24; // From our schema check
const SERVICE_REQUEST_ID = 51; // The one we've been testing with

async function testCoordinatorLogin() {
    console.log('=== Testing Coordinator Login ===');
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/coordinator/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'coord1@example.com',
                password: 'password123'
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Login successful');
            console.log('   Token length:', data.token ? data.token.length : 'No token');
            console.log('   User ID:', data.user?.id || 'No user ID');
            console.log('   Role:', data.user?.role || 'No role');
            return data.token;
        } else {
            console.log('❌ Login failed:', data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Login error:', error.message);
        return null;
    }
}

async function testGetPendingApprovals(token) {
    console.log('\n=== Testing Get Pending Approvals ===');
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/coordinator/service-approvals`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Get pending approvals successful');
            console.log('   Number of pending approvals:', data.length);
            if (data.length > 0) {
                console.log('   First approval ID:', data[0].id);
                console.log('   Service request ID:', data[0].service_request_id);
            }
            return data;
        } else {
            console.log('❌ Get pending approvals failed:', data.message);
            return [];
        }
    } catch (error) {
        console.log('❌ Get pending approvals error:', error.message);
        return [];
    }
}

async function testApproveService(token, approvalId) {
    console.log(`\n=== Testing Approve Service (ID: ${approvalId}) ===`);
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/coordinator/service-approvals/${approvalId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Service approval successful');
            console.log('   Message:', data.message);
            return true;
        } else {
            console.log('❌ Service approval failed');
            console.log('   Status:', response.status);
            console.log('   Error:', data.message || data.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Service approval error:', error.message);
        return false;
    }
}

async function testRejectService(token, approvalId) {
    console.log(`\n=== Testing Reject Service (ID: ${approvalId}) ===`);
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/coordinator/service-approvals/${approvalId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rejection_reason: 'Testing rejection functionality'
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Service rejection successful');
            console.log('   Message:', data.message);
            return true;
        } else {
            console.log('❌ Service rejection failed');
            console.log('   Status:', response.status);
            console.log('   Error:', data.message || data.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Service rejection error:', error.message);
        return false;
    }
}

async function runFullTest() {
    console.log('Starting comprehensive approve/reject functionality test...\n');
    
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
    
    // Step 3: Test approve functionality
    const firstApproval = pendingApprovals[0];
    console.log(`\n📋 Testing with Approval ID: ${firstApproval.id}, Service Request ID: ${firstApproval.service_request_id}`);
    
    // For safety, let's test with a specific approval ID if it exists
    const testApprovalId = pendingApprovals.find(a => a.id === 4)?.id || firstApproval.id;
    
    const approveResult = await testApproveService(token, testApprovalId);
    
    // If approve worked, test with another approval for reject (if available)
    if (approveResult && pendingApprovals.length > 1) {
        const secondApproval = pendingApprovals.find(a => a.id !== testApprovalId);
        if (secondApproval) {
            await testRejectService(token, secondApproval.id);
        }
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Login: Working');
    console.log('✅ Get Pending Approvals: Working');
    console.log(`${approveResult ? '✅' : '❌'} Approve Functionality: ${approveResult ? 'Working' : 'Failed'}`);
    
    console.log('\n🎉 Test completed! Check the coordinator interface to see the results.');
}

runFullTest().catch(console.error);