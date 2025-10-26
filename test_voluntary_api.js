const jwt = require('jsonwebtoken');

// Get the JWT secret from the auth middleware
const JWT_SECRET = 'your-secret-key-here'; // This should match what's in your auth middleware

// Create a token for user ID 57 (Razor Axe - technician)
const token = jwt.sign(
    { id: 57, role: 'technician', email: 'markivan.night@gmail.com' },
    JWT_SECRET,
    { expiresIn: '24h' }
);

console.log('Generated Token:', token);
console.log('\nTesting API endpoint...\n');

// Test the API
fetch('http://localhost:3000/api/voluntary-services/assigned-schools', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(response => {
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    return response.text();
})
.then(data => {
    console.log('Response Data:', data);
    try {
        const json = JSON.parse(data);
        console.log('\nParsed JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.log('Not JSON response');
    }
})
.catch(error => {
    console.error('Error:', error);
});
