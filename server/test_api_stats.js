const fetch = require('node-fetch');

(async () => {
    try {
        // Login first to get token
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@serviceease.com',
                password: 'Admin@123'
            })
        });

        const loginData = await loginRes.json();
        const token = loginData.token;
        
        console.log('Logged in successfully\n');

        // Test dashboard stats endpoint
        const statsRes = await fetch('http://localhost:3000/api/admin/dashboard-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const stats = await statsRes.json();
        console.log('Dashboard Stats Response:');
        console.log(JSON.stringify(stats, null, 2));

    } catch(err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
})();
