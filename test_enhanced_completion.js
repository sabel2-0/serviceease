// Test script for enhanced service completion workflow
// This tests the parts selection from technician inventory and coordinator approval

const testServiceCompletionWorkflow = async () => {
    const BASE_URL = 'http://localhost:3000/api';
    
    // Test data
    const technicianCredentials = {
        username: 'technician1',
        password: 'password123'
    };
    
    const coordinatorCredentials = {
        username: 'coordinator1', 
        password: 'password123'
    };
    
    console.log('🧪 Testing Enhanced Service Completion Workflow');
    console.log('================================================');
    
    try {
        // Step 1: Login as technician
        console.log('\n1️⃣ Logging in as technician...');
        const techLoginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(technicianCredentials)
        });
        
        if (!techLoginResponse.ok) {
            throw new Error(`Technician login failed: ${techLoginResponse.status}`);
        }
        
        const techLoginData = await techLoginResponse.json();
        const techToken = techLoginData.token;
        console.log('✅ Technician logged in successfully');
        
        // Step 2: Get technician's available parts inventory
        console.log('\n2️⃣ Fetching technician inventory...');
        const partsResponse = await fetch(`${BASE_URL}/technician/parts`, {
            headers: { 'Authorization': `Bearer ${techToken}` }
        });
        
        if (!partsResponse.ok) {
            throw new Error(`Failed to fetch parts: ${partsResponse.status}`);
        }
        
        const parts = await partsResponse.json();
        console.log(`✅ Found ${parts.length} parts in technician inventory:`);
        parts.forEach(part => {
            console.log(`   - ${part.name} (${part.category}): ${part.stock} ${part.unit || 'pieces'} available`);
        });
        
        // Step 3: Get service requests for technician
        console.log('\n3️⃣ Fetching technician service requests...');
        const requestsResponse = await fetch(`${BASE_URL}/technician/service-requests`, {
            headers: { 'Authorization': `Bearer ${techToken}` }
        });
        
        if (!requestsResponse.ok) {
            throw new Error(`Failed to fetch requests: ${requestsResponse.status}`);
        }
        
        const requests = await requestsResponse.json();
        console.log(`✅ Found ${requests.length} service requests`);
        
        // Find an in_progress request to complete
        const inProgressRequest = requests.find(req => req.status === 'in_progress');
        
        if (!inProgressRequest) {
            console.log('⚠️  No in_progress requests found. Creating test scenario...');
            // For testing, we'll assume request ID 1 exists and is in progress
            const testRequestId = 1;
            
            // Step 4: Test service completion with parts
            console.log('\n4️⃣ Testing service completion with parts...');
            const completionData = {
                actions: 'Replaced toner cartridge and cleaned print heads. Performed calibration test.',
                notes: 'Customer reported print quality improved significantly. Recommended monthly cleaning.',
                parts: parts.length > 0 ? [
                    {
                        name: parts[0].name,
                        qty: 1,
                        unit: parts[0].unit || 'pieces'
                    }
                ] : []
            };
            
            const completionResponse = await fetch(`${BASE_URL}/technician/service-requests/${testRequestId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${techToken}`
                },
                body: JSON.stringify(completionData)
            });
            
            const completionResult = await completionResponse.json();
            
            if (completionResponse.ok) {
                console.log('✅ Service completion submitted successfully!');
                console.log(`   Status: ${completionResult.status}`);
                console.log(`   Message: ${completionResult.message}`);
                console.log(`   Job Order ID: ${completionResult.jobOrderId}`);
                
                // Step 5: Login as coordinator and test approval
                console.log('\n5️⃣ Logging in as coordinator...');
                const coordLoginResponse = await fetch(`${BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(coordinatorCredentials)
                });
                
                if (coordLoginResponse.ok) {
                    const coordLoginData = await coordLoginResponse.json();
                    const coordToken = coordLoginData.token;
                    console.log('✅ Coordinator logged in successfully');
                    
                    // Step 6: Get pending approvals
                    console.log('\n6️⃣ Fetching pending service approvals...');
                    const approvalsResponse = await fetch(`${BASE_URL}/coordinator/service-approvals/pending`, {
                        headers: { 'Authorization': `Bearer ${coordToken}` }
                    });
                    
                    if (approvalsResponse.ok) {
                        const approvals = await approvalsResponse.json();
                        console.log(`✅ Found ${approvals.length} pending approvals`);
                        
                        approvals.forEach(approval => {
                            console.log(`   - Request #${approval.service_request_id}: ${approval.request_description}`);
                            console.log(`     Technician: ${approval.technician_first_name} ${approval.technician_last_name}`);
                            console.log(`     Institution: ${approval.institution_name}`);
                            console.log(`     Parts used: ${approval.parts_used || 'None'}`);
                            console.log(`     Submitted: ${new Date(approval.submitted_at).toLocaleString()}`);
                        });
                    } else {
                        console.log('❌ Failed to fetch pending approvals');
                    }
                } else {
                    console.log('❌ Coordinator login failed - cannot test approval workflow');
                }
            } else {
                console.log('❌ Service completion failed:');
                console.log(`   Error: ${completionResult.error}`);
                console.log(`   Status: ${completionResponse.status}`);
            }
        } else {
            console.log(`✅ Found in_progress request #${inProgressRequest.id} to complete`);
            
            // Continue with the actual completion test...
            const completionData = {
                actions: 'Replaced toner cartridge and cleaned print heads. Performed calibration test.',
                notes: 'Customer reported print quality improved significantly. Recommended monthly cleaning.',
                parts: parts.length > 0 ? [
                    {
                        name: parts[0].name,
                        qty: 1,
                        unit: parts[0].unit || 'pieces'
                    }
                ] : []
            };
            
            console.log('\n4️⃣ Submitting service completion...');
            const completionResponse = await fetch(`${BASE_URL}/technician/service-requests/${inProgressRequest.id}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${techToken}`
                },
                body: JSON.stringify(completionData)
            });
            
            const completionResult = await completionResponse.json();
            
            if (completionResponse.ok) {
                console.log('✅ Service completion submitted successfully!');
                console.log(`   Status: ${completionResult.status}`);
                console.log(`   Message: ${completionResult.message}`);
            } else {
                console.log('❌ Service completion failed:');
                console.log(`   Error: ${completionResult.error}`);
            }
        }
        
        console.log('\n🎉 Enhanced Service Completion Workflow Test Completed!');
        console.log('================================================');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

// Run the test
testServiceCompletionWorkflow();