const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

// Test technician credentials (Razor Axe)
const TECHNICIAN_EMAIL = 'markivan.storm@gmail.com';
const TECHNICIAN_PASSWORD = 'test123'; // Update if different

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({ statusCode: res.statusCode, data: parsed });
                    }
                } catch (e) {
                    reject({ statusCode: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testTechnicianNotifications() {
    console.log('=== Testing Technician Notifications API ===\n');
    
    try {
        // Step 1: Login as technician
        console.log('1. Logging in as technician...');
        const loginResponse = await makeRequest('POST', '/api/auth/login', {
            email: TECHNICIAN_EMAIL,
            password: TECHNICIAN_PASSWORD
        });
        
        const token = loginResponse.token;
        const user = loginResponse.user;
        console.log(`✓ Logged in successfully as ${user.first_name} ${user.last_name} (ID: ${user.id}, Role: ${user.role})\n`);
        
        const authHeaders = {
            'Authorization': `Bearer ${token}`
        };
        
        // Step 2: Fetch notifications
        console.log('2. Fetching notifications from /api/notifications...');
        const notificationsResponse = await makeRequest('GET', '/api/notifications?limit=50', null, authHeaders);
        
        console.log(`✓ Received ${notificationsResponse.notifications.length} notifications\n`);
        
        if (notificationsResponse.notifications.length > 0) {
            console.log('Recent Notifications:');
            notificationsResponse.notifications.slice(0, 5).forEach((notif, index) => {
                console.log(`\n  [${index + 1}] ID: ${notif.id}`);
                console.log(`      Type: ${notif.type}`);
                console.log(`      Title: ${notif.title}`);
                console.log(`      Message: ${notif.message.substring(0, 80)}...`);
                console.log(`      User ID: ${notif.user_id}`);
                console.log(`      Read: ${notif.is_read ? 'Yes' : 'No'}`);
                console.log(`      Created: ${notif.created_at}`);
            });
        } else {
            console.log('⚠ No notifications returned from API');
        }
        
        // Step 3: Check unread count
        console.log('\n3. Checking unread notification count...');
        const unreadResponse = await makeRequest('GET', '/api/notifications/count/unread', null, authHeaders);
        
        console.log(`✓ Unread count: ${unreadResponse.unread_count}\n`);
        
        // Step 4: Fetch service requests assigned to technician
        console.log('4. Fetching assigned service requests...');
        const requestsResponse = await makeRequest('GET', '/api/technician/service-requests?limit=10', null, authHeaders);
        
        console.log(`✓ Found ${requestsResponse.length} assigned service requests\n`);
        
        if (requestsResponse.length > 0) {
            console.log('Recent Assigned Requests:');
            requestsResponse.slice(0, 3).forEach((req, index) => {
                console.log(`\n  [${index + 1}] Request #${req.request_number || req.id}`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Description: ${(req.description || req.issue || '').substring(0, 60)}...`);
                console.log(`      Created: ${req.created_at}`);
            });
        }
        
        console.log('\n\n=== ✓ All API Tests Passed ===');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error during testing:', error.data || error.message || error);
        if (error.statusCode) {
            console.error('Status:', error.statusCode);
            console.error('Data:', JSON.stringify(error.data, null, 2));
        }
        process.exit(1);
    }
}

testTechnicianNotifications();
