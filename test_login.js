// Quick test script to verify admin login and coordinator fetching
async function testAdminFlow() {
    try {
        console.log('1. Testing admin login...');
        
        // Login as admin
        const loginResponse = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@serviceease.com',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
            console.error('Login failed:', loginData);
            return;
        }
        
        console.log('✅ Login successful');
        console.log('Token:', loginData.token.substring(0, 20) + '...');
        console.log('User:', loginData.user);

        // Store token in localStorage
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        localStorage.setItem('isLoggedIn', 'true');
        
        console.log('\n2. Testing coordinator fetch...');
        
        // Fetch coordinators
        const coordResponse = await fetch('/api/coordinators', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        if (!coordResponse.ok) {
            const errorData = await coordResponse.json();
            console.error('Coordinators fetch failed:', errorData);
            return;
        }
        
        const coordinators = await coordResponse.json();
        console.log('✅ Coordinators fetched successfully');
        console.log('Count:', coordinators.length);
        console.log('Coordinators:', coordinators);
        
        console.log('\n3. You can now navigate to the coordinator accounts page');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testAdminFlow();