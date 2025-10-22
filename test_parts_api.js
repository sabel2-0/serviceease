// Test script to verify the parts API
const fs = require('fs');

async function testAPI() {
    try {
        // Test GET parts
        console.log('Testing GET /api/parts...');
        const getResponse = await fetch('http://localhost:3000/api/parts');
        const parts = await getResponse.json();
        console.log('✓ GET parts successful. Found', parts.length, 'parts');
        console.log('Parts:', parts);

        // Test POST part
        console.log('\nTesting POST /api/parts...');
        const newPart = {
            name: 'Test HP LaserJet Toner',
            brand: 'HP',
            category: 'toner',
            stock: 15
        };

        const postResponse = await fetch('http://localhost:3000/api/parts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPart)
        });

        const postResult = await postResponse.json();
        console.log('✓ POST part successful:', postResult);

        // Test GET parts again
        console.log('\nTesting GET /api/parts again...');
        const getResponse2 = await fetch('http://localhost:3000/api/parts');
        const parts2 = await getResponse2.json();
        console.log('✓ GET parts successful. Found', parts2.length, 'parts');
        console.log('Updated parts:', parts2);

    } catch (error) {
        console.error('✗ Test failed:', error);
    }
}

testAPI();