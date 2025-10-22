const axios = require('axios');

async function testServiceRequestCreation() {
    try {
        console.log('Testing service request creation...');
        
        const testData = {
            institution_id: 1,
            description: "Test printer issue",
            priority: "medium",
            location: "Test Location",
            coordinator_id: 1,
            equipment_model: "Test Model",
            equipment_serial: "Test123"
        };
        
        console.log('Sending request with data:', JSON.stringify(testData, null, 2));
        
        const response = await axios.post('http://localhost:3000/api/service-requests', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('SUCCESS - Response:', response.data);
        console.log('Status:', response.status);
        
    } catch (error) {
        console.error('ERROR occurred:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Error message:', error.message);
        
        if (error.response?.status === 500) {
            console.log('\n=== 500 Error Details ===');
            console.log('This indicates a server-side error.');
            console.log('Check the server console for detailed error logs.');
        }
    }
}

testServiceRequestCreation();