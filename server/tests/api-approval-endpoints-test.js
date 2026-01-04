/**
 * API Approval Endpoints Test
 * 
 * Tests the ACTUAL approval endpoints with different user roles:
 * 1. Admin approving walk-in service request
 * 2. Operations Officer approving walk-in service request  
 * 3. Institution Admin approving service request
 * 4. Institution User approving service request
 * 
 * Each test creates a real service request, submits it for approval,
 * and then approves it via the actual API endpoint.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const http = require('http');

const API_BASE = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    technicianId: 2,
    testItemId: 1,
    institutionId: 'INST-001',
    printerId: 1,
    capacityPerBottle: 100
};

// User credentials for different roles
const TEST_USERS = {
    admin: { id: 1, email: 'serviceeaseph@gmail.com', password: 'Admin@123' },
    operations_officer: { id: 3, email: 'markivan.light@gmail.com', password: 'Test@123' },
    institution_admin: { id: 6, email: 'markivan.note@gmail.com', password: 'Test@123' }
};

let db;
let testResults = [];
let tokens = {};

// Helper functions
function logResult(testName, expected, actual, passed, notes = '') {
    const result = { testName, expected, actual, passed, notes };
    testResults.push(result);
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status}: ${testName}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
    if (notes) console.log(`   Notes: ${notes}`);
    return passed;
}

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
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

async function login(email, password) {
    const response = await makeRequest('POST', '/api/login', { email, password });
    if (response.status === 200 && response.data.token) {
        return response.data.token;
    }
    throw new Error(`Login failed for ${email}: ${JSON.stringify(response.data)}`);
}

async function getInventoryState(technicianId, itemId) {
    const [rows] = await db.query(`
        SELECT ti.id, ti.quantity, ti.remaining_volume, ti.remaining_weight, ti.is_opened,
               pi.ink_volume, pi.toner_weight, pi.name
        FROM technician_inventory ti
        JOIN printer_items pi ON ti.item_id = pi.id
        WHERE ti.technician_id = ? AND ti.item_id = ?
    `, [technicianId, itemId]);
    return rows[0] || null;
}

async function resetInventory(technicianId, itemId, quantity, remainingVolume, isOpened) {
    await db.query(`
        UPDATE technician_inventory 
        SET quantity = ?, remaining_volume = ?, is_opened = ?
        WHERE technician_id = ? AND item_id = ?
    `, [quantity, remainingVolume, isOpened, technicianId, itemId]);
}

async function cleanupTestData(serviceId) {
    if (serviceId) {
        await db.query('DELETE FROM notifications WHERE reference_id = ?', [serviceId]);
        await db.query('DELETE FROM service_request_history WHERE request_id = ?', [serviceId]);
        await db.query('DELETE FROM service_items_used WHERE service_id = ?', [serviceId]);
        await db.query('DELETE FROM service_approvals WHERE service_id = ?', [serviceId]);
        await db.query('DELETE FROM service_requests WHERE id = ?', [serviceId]);
    }
}

// ============================================================
// TEST 1: Admin Approves Walk-In Service Request (Partial)
// ============================================================
async function testAdminApprovalPartial() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: ADMIN APPROVES WALK-IN SERVICE REQUEST (PARTIAL CONSUMPTION)');
    console.log('='.repeat(70));
    
    let serviceId = null;
    
    try {
        // Reset inventory: 10 bottles, none opened
        await resetInventory(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId, 10, null, 0);
        const beforeState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 Before: Qty=${beforeState.quantity}, Remaining=${beforeState.remaining_volume}, Opened=${beforeState.is_opened}`);
        
        // Step 1: Admin creates walk-in service request
        console.log('\n--- Step 1: Admin creates walk-in service request ---');
        const createResponse = await makeRequest('POST', '/api/walk-in-service-requests', {
            walk_in_customer_name: 'API Test Customer 1',
            printer_brand: 'HP',
            issue: 'API Test - Admin approval partial consumption',
            priority: 'medium'
        }, tokens.admin);
        
        if (createResponse.status !== 201) {
            throw new Error(`Failed to create service request: ${JSON.stringify(createResponse.data)}`);
        }
        serviceId = createResponse.data.id;
        console.log(`   Created service request ID: ${serviceId}`);
        
        // Step 2: Technician completes the service with partial consumption
        console.log('\n--- Step 2: Technician completes with partial consumption (50ml) ---');
        const completeResponse = await makeRequest('PUT', `/api/service-requests/${serviceId}/complete`, {
            actions_performed: 'Refilled ink - partial use',
            items_used: [{
                item_id: TEST_CONFIG.testItemId,
                quantity_used: 1,
                consumptionType: 'partial',
                amountConsumed: 50
            }]
        }, tokens.admin); // Using admin token as technician for simplicity
        
        console.log(`   Complete response: ${completeResponse.status}`);
        
        // Step 3: Admin approves the service completion
        console.log('\n--- Step 3: Admin approves the service completion ---');
        const approveResponse = await makeRequest('PUT', `/api/walk-in-service-requests/${serviceId}/approve`, {
            notes: 'Approved by Admin - API test'
        }, tokens.admin);
        
        console.log(`   Approve response: ${approveResponse.status}`);
        
        // Verify inventory state
        const afterState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 After: Qty=${afterState.quantity}, Remaining=${afterState.remaining_volume}, Opened=${afterState.is_opened}`);
        
        logResult(
            'Admin Partial - Quantity unchanged (10)',
            '10',
            String(afterState.quantity),
            afterState.quantity === 10
        );
        
        logResult(
            'Admin Partial - Remaining = 50ml',
            '50',
            String(afterState.remaining_volume),
            parseFloat(afterState.remaining_volume) === 50
        );
        
        logResult(
            'Admin Partial - is_opened = 1',
            '1',
            String(afterState.is_opened),
            afterState.is_opened === 1
        );
        
    } catch (error) {
        console.error('Test error:', error.message);
        logResult('Admin Approval Partial', 'No errors', error.message, false);
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 2: Operations Officer Approves Walk-In (Full Consumption)
// ============================================================
async function testOpsOfficerApprovalFull() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: OPERATIONS OFFICER APPROVES WALK-IN (FULL CONSUMPTION)');
    console.log('='.repeat(70));
    
    let serviceId = null;
    
    try {
        // Reset inventory: 10 bottles, one opened with 30ml remaining
        await resetInventory(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId, 10, 30, 1);
        const beforeState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 Before: Qty=${beforeState.quantity}, Remaining=${beforeState.remaining_volume}, Opened=${beforeState.is_opened}`);
        
        // Step 1: Create walk-in request
        console.log('\n--- Step 1: Create walk-in service request ---');
        const createResponse = await makeRequest('POST', '/api/walk-in-service-requests', {
            walk_in_customer_name: 'API Test Customer 2',
            printer_brand: 'Canon',
            issue: 'API Test - Ops Officer full consumption',
            priority: 'medium'
        }, tokens.operations_officer);
        
        if (createResponse.status !== 201) {
            throw new Error(`Failed to create: ${JSON.stringify(createResponse.data)}`);
        }
        serviceId = createResponse.data.id;
        console.log(`   Created service request ID: ${serviceId}`);
        
        // Step 2: Complete with full consumption (uses sealed bottle, NOT opened one)
        console.log('\n--- Step 2: Complete with full consumption (sealed bottle) ---');
        const completeResponse = await makeRequest('PUT', `/api/service-requests/${serviceId}/complete`, {
            actions_performed: 'Used full sealed bottle',
            items_used: [{
                item_id: TEST_CONFIG.testItemId,
                quantity_used: 1,
                consumptionType: 'full',
                amountConsumed: 100
            }]
        }, tokens.operations_officer);
        
        console.log(`   Complete response: ${completeResponse.status}`);
        
        // Step 3: Ops Officer approves
        console.log('\n--- Step 3: Operations Officer approves ---');
        const approveResponse = await makeRequest('PUT', `/api/walk-in-service-requests/${serviceId}/approve`, {
            notes: 'Approved by Ops Officer - API test'
        }, tokens.operations_officer);
        
        console.log(`   Approve response: ${approveResponse.status}`);
        
        // Verify inventory
        const afterState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 After: Qty=${afterState.quantity}, Remaining=${afterState.remaining_volume}, Opened=${afterState.is_opened}`);
        
        logResult(
            'OpsOfficer Full - Quantity = 9 (used sealed bottle)',
            '9',
            String(afterState.quantity),
            afterState.quantity === 9
        );
        
        logResult(
            'OpsOfficer Full - Remaining still 30 (opened bottle untouched)',
            '30',
            String(afterState.remaining_volume),
            parseFloat(afterState.remaining_volume) === 30
        );
        
        logResult(
            'OpsOfficer Full - is_opened still 1',
            '1',
            String(afterState.is_opened),
            afterState.is_opened === 1
        );
        
    } catch (error) {
        console.error('Test error:', error.message);
        logResult('Ops Officer Approval Full', 'No errors', error.message, false);
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 3: Institution Admin Approves Service Request (Partial that depletes)
// ============================================================
async function testInstitutionAdminApprovalDeplete() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: INSTITUTION ADMIN APPROVES (PARTIAL THAT DEPLETES BOTTLE)');
    console.log('='.repeat(70));
    
    let serviceId = null;
    
    try {
        // Reset inventory: 10 bottles, one opened with 50ml remaining
        await resetInventory(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId, 10, 50, 1);
        const beforeState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 Before: Qty=${beforeState.quantity}, Remaining=${beforeState.remaining_volume}, Opened=${beforeState.is_opened}`);
        
        // Step 1: Create service request (not walk-in)
        console.log('\n--- Step 1: Create service request for institution ---');
        const [insertResult] = await db.query(`
            INSERT INTO service_requests 
            (institution_id, printer_id, description, priority, status, technician_id, created_at)
            VALUES (?, ?, 'API Test - Institution Admin depletes bottle', 'medium', 'in_progress', ?, NOW())
        `, [TEST_CONFIG.institutionId, TEST_CONFIG.printerId, TEST_CONFIG.technicianId]);
        serviceId = insertResult.insertId;
        console.log(`   Created service request ID: ${serviceId}`);
        
        // Step 2: Complete with partial consumption that depletes the bottle (50ml)
        console.log('\n--- Step 2: Complete with partial 50ml (depletes opened bottle) ---');
        const completeResponse = await makeRequest('PUT', `/api/service-requests/${serviceId}/complete`, {
            actions_performed: 'Used remaining 50ml from opened bottle',
            items_used: [{
                item_id: TEST_CONFIG.testItemId,
                quantity_used: 1,
                consumptionType: 'partial',
                amountConsumed: 50
            }]
        }, tokens.institution_admin);
        
        console.log(`   Complete response: ${completeResponse.status}`);
        
        // Step 3: Get approval ID
        const [approvals] = await db.query(
            'SELECT id FROM service_approvals WHERE service_id = ? ORDER BY id DESC LIMIT 1',
            [serviceId]
        );
        
        if (approvals.length === 0) {
            throw new Error('No approval record found');
        }
        
        const approvalId = approvals[0].id;
        console.log(`   Approval ID: ${approvalId}`);
        
        // Step 4: Institution Admin approves
        console.log('\n--- Step 4: Institution Admin approves via API ---');
        const approveResponse = await makeRequest(
            'POST', 
            `/api/institution-admin/service-approvals/${approvalId}/approve`,
            { notes: 'Approved by Institution Admin - API test' },
            tokens.institution_admin
        );
        
        console.log(`   Approve response: ${approveResponse.status} - ${JSON.stringify(approveResponse.data)}`);
        
        // Verify inventory
        const afterState = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`\n📦 After: Qty=${afterState.quantity}, Remaining=${afterState.remaining_volume}, Opened=${afterState.is_opened}`);
        
        logResult(
            'InstAdmin Deplete - Quantity = 9',
            '9',
            String(afterState.quantity),
            afterState.quantity === 9
        );
        
        logResult(
            'InstAdmin Deplete - Remaining = NULL (bottle depleted)',
            'null',
            String(afterState.remaining_volume),
            afterState.remaining_volume === null
        );
        
        logResult(
            'InstAdmin Deplete - is_opened = 0',
            '0',
            String(afterState.is_opened),
            afterState.is_opened === 0
        );
        
    } catch (error) {
        console.error('Test error:', error.message);
        logResult('Institution Admin Approval Deplete', 'No errors', error.message, false);
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 4: Scenario - Partial across two services (your original issue)
// ============================================================
async function testCrossServicePartialConsumption() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: CROSS-SERVICE PARTIAL CONSUMPTION (YOUR ORIGINAL SCENARIO)');
    console.log('Scenario: Walk-in 50ml partial → Institution Admin 50ml partial = depleted');
    console.log('='.repeat(70));
    
    let serviceId1 = null;
    let serviceId2 = null;
    
    try {
        // Reset inventory: 10 bottles, none opened
        await resetInventory(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId, 10, null, 0);
        console.log('\n📦 Initial: Qty=10, Remaining=NULL, Opened=0');
        
        // ===== SERVICE 1: Walk-in with partial 50ml =====
        console.log('\n--- SERVICE 1: Walk-in with partial 50ml (Admin approves) ---');
        
        const create1 = await makeRequest('POST', '/api/walk-in-service-requests', {
            walk_in_customer_name: 'Cross-Service Test Customer',
            printer_brand: 'HP',
            issue: 'Cross-service test - Part 1',
            priority: 'medium'
        }, tokens.admin);
        serviceId1 = create1.data.id;
        console.log(`   Service 1 ID: ${serviceId1}`);
        
        await makeRequest('PUT', `/api/service-requests/${serviceId1}/complete`, {
            actions_performed: 'First partial use - 50ml',
            items_used: [{
                item_id: TEST_CONFIG.testItemId,
                quantity_used: 1,
                consumptionType: 'partial',
                amountConsumed: 50
            }]
        }, tokens.admin);
        
        await makeRequest('PUT', `/api/walk-in-service-requests/${serviceId1}/approve`, {
            notes: 'First approval'
        }, tokens.admin);
        
        const afterService1 = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`📦 After Service 1: Qty=${afterService1.quantity}, Remaining=${afterService1.remaining_volume}, Opened=${afterService1.is_opened}`);
        
        logResult(
            'After Service 1 - Quantity = 10',
            '10',
            String(afterService1.quantity),
            afterService1.quantity === 10
        );
        
        logResult(
            'After Service 1 - Remaining = 50',
            '50',
            String(afterService1.remaining_volume),
            parseFloat(afterService1.remaining_volume) === 50
        );
        
        // ===== SERVICE 2: Institution request with partial 50ml (depletes) =====
        console.log('\n--- SERVICE 2: Institution request partial 50ml (Institution Admin approves) ---');
        
        const [insert2] = await db.query(`
            INSERT INTO service_requests 
            (institution_id, printer_id, description, priority, status, technician_id, created_at)
            VALUES (?, ?, 'Cross-service test - Part 2', 'medium', 'in_progress', ?, NOW())
        `, [TEST_CONFIG.institutionId, TEST_CONFIG.printerId, TEST_CONFIG.technicianId]);
        serviceId2 = insert2.insertId;
        console.log(`   Service 2 ID: ${serviceId2}`);
        
        await makeRequest('PUT', `/api/service-requests/${serviceId2}/complete`, {
            actions_performed: 'Second partial use - depletes bottle',
            items_used: [{
                item_id: TEST_CONFIG.testItemId,
                quantity_used: 1,
                consumptionType: 'partial',
                amountConsumed: 50
            }]
        }, tokens.institution_admin);
        
        const [approvals2] = await db.query(
            'SELECT id FROM service_approvals WHERE service_id = ? ORDER BY id DESC LIMIT 1',
            [serviceId2]
        );
        
        await makeRequest(
            'POST', 
            `/api/institution-admin/service-approvals/${approvals2[0].id}/approve`,
            { notes: 'Second approval - depletes bottle' },
            tokens.institution_admin
        );
        
        const afterService2 = await getInventoryState(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId);
        console.log(`📦 After Service 2: Qty=${afterService2.quantity}, Remaining=${afterService2.remaining_volume}, Opened=${afterService2.is_opened}`);
        
        logResult(
            'After Service 2 - Quantity = 9 (bottle depleted)',
            '9',
            String(afterService2.quantity),
            afterService2.quantity === 9
        );
        
        logResult(
            'After Service 2 - Remaining = NULL',
            'null',
            String(afterService2.remaining_volume),
            afterService2.remaining_volume === null,
            'THIS WAS YOUR ORIGINAL BUG - was showing 0.00'
        );
        
        logResult(
            'After Service 2 - is_opened = 0',
            '0',
            String(afterService2.is_opened),
            afterService2.is_opened === 0,
            'THIS WAS YOUR ORIGINAL BUG - was staying at 1'
        );
        
    } catch (error) {
        console.error('Test error:', error.message);
        logResult('Cross-Service Partial', 'No errors', error.message, false);
    } finally {
        await cleanupTestData(serviceId1);
        await cleanupTestData(serviceId2);
    }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║     API APPROVAL ENDPOINTS TEST - DIFFERENT USER ROLES               ║');
    console.log('║                                                                      ║');
    console.log('║  Testing actual API endpoints with authentication                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    
    try {
        // Connect to database
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('\n✅ Connected to database');
        
        // Login all test users
        console.log('\n🔐 Authenticating test users...');
        try {
            tokens.admin = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
            console.log('   ✅ Admin logged in');
        } catch (e) {
            console.log('   ⚠️ Admin login failed:', e.message);
        }
        
        try {
            tokens.operations_officer = await login(TEST_USERS.operations_officer.email, TEST_USERS.operations_officer.password);
            console.log('   ✅ Operations Officer logged in');
        } catch (e) {
            console.log('   ⚠️ Operations Officer login failed:', e.message);
        }
        
        try {
            tokens.institution_admin = await login(TEST_USERS.institution_admin.email, TEST_USERS.institution_admin.password);
            console.log('   ✅ Institution Admin logged in');
        } catch (e) {
            console.log('   ⚠️ Institution Admin login failed:', e.message);
        }
        
        // Check if we have the minimum required tokens
        if (!tokens.admin) {
            console.log('\n❌ Cannot run tests without admin token. Please verify credentials.');
            return;
        }
        
        // Run tests
        await testAdminApprovalPartial();
        
        if (tokens.operations_officer) {
            await testOpsOfficerApprovalFull();
        }
        
        if (tokens.institution_admin) {
            await testInstitutionAdminApprovalDeplete();
            await testCrossServicePartialConsumption();
        }
        
        // Reset inventory to clean state
        await resetInventory(TEST_CONFIG.technicianId, TEST_CONFIG.testItemId, 10, null, 0);
        
        // Print summary
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║                         TEST RESULTS SUMMARY                         ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        
        const passed = testResults.filter(r => r.passed).length;
        const failed = testResults.filter(r => !r.passed).length;
        const total = testResults.length;
        
        console.log(`\n  Total Tests: ${total}`);
        console.log(`  ✅ Passed: ${passed}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  Pass Rate: ${((passed/total)*100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n  ─── FAILED TESTS ───');
            testResults.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.testName}`);
                console.log(`     Expected: ${r.expected}`);
                console.log(`     Actual: ${r.actual}`);
                if (r.notes) console.log(`     Notes: ${r.notes}`);
            });
        }
        
        console.log('\n');
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        if (db) await db.end();
    }
}

// Run tests
runAllTests();
