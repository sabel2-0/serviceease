const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test credentials - technician with ID 57
const technicianCredentials = {
    email: 'tech@test.com', // Replace with actual technician email
    password: 'password123'  // Replace with actual password
};

async function testTechnicianInventory() {
    try {
        console.log('Testing Technician Inventory API...\n');
        
        // Step 1: Login as technician
        console.log('1. Logging in as technician...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, technicianCredentials);
        const token = loginResponse.data.token;
        const user = loginResponse.data.user;
        console.log(`✅ Logged in as: ${user.first_name} ${user.last_name} (ID: ${user.id}, Role: ${user.role})\n`);
        
        // Step 2: Fetch technician inventory
        console.log('2. Fetching technician inventory...');
        const inventoryResponse = await axios.get(`${API_URL}/api/technician-inventory/inventory`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Successfully fetched inventory!`);
        console.log(`   Found ${inventoryResponse.data.length} items:\n`);
        
        inventoryResponse.data.forEach(item => {
            console.log(`   📦 ${item.name}`);
            console.log(`      - Brand: ${item.brand || 'N/A'}`);
            console.log(`      - Category: ${item.category}`);
            console.log(`      - Quantity: ${item.assigned_quantity} ${item.unit || 'units'}`);
            console.log(`      - Part Type: ${item.part_type || 'N/A'}`);
            console.log(`      - Assigned By: ${item.assigned_by_name || 'N/A'}`);
            console.log(`      - Assigned At: ${new Date(item.assigned_at).toLocaleString()}`);
            console.log(`      - Last Updated: ${new Date(item.last_updated).toLocaleString()}`);
            if (item.notes) console.log(`      - Notes: ${item.notes}`);
            console.log('');
        });
        
        // Step 3: Fetch available parts for requesting
        console.log('3. Fetching available parts...');
        const availablePartsResponse = await axios.get(`${API_URL}/api/technician-inventory/available-parts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Successfully fetched available parts!`);
        console.log(`   Found ${availablePartsResponse.data.length} available parts\n`);
        
        // Step 4: Fetch parts requests
        console.log('4. Fetching parts requests...');
        const requestsResponse = await axios.get(`${API_URL}/api/technician-inventory/requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Successfully fetched parts requests!`);
        console.log(`   Found ${requestsResponse.data.length} requests:\n`);
        
        requestsResponse.data.forEach(req => {
            console.log(`   📋 Request #${req.id}`);
            console.log(`      - Part: ${req.part_name}`);
            console.log(`      - Quantity: ${req.quantity_requested}`);
            console.log(`      - Status: ${req.status}`);
            console.log(`      - Priority: ${req.priority}`);
            console.log(`      - Created: ${new Date(req.created_at).toLocaleString()}`);
            if (req.approved_at) console.log(`      - Approved: ${new Date(req.approved_at).toLocaleString()}`);
            if (req.approved_by_name) console.log(`      - Approved By: ${req.approved_by_name}`);
            if (req.admin_response) console.log(`      - Admin Response: ${req.admin_response}`);
            console.log('');
        });
        
        console.log('✅ All tests passed!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

testTechnicianInventory();
