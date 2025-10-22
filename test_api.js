const fetch = require('node-fetch');

async function testAPI() {
    try {
        const response = await fetch('http://localhost:3000/api/institutions/INST-011/service-requests');
        const data = await response.json();
        console.log('API Response:');
        console.log(JSON.stringify(data, null, 2));
        
        // Check if started_at is included
        if (data.length > 0 && data[0].started_at !== undefined) {
            console.log('\n✅ started_at field is present');
        } else {
            console.log('\n❌ started_at field is missing');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testAPI();