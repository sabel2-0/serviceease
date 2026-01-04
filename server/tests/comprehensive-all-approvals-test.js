/**
 * COMPREHENSIVE APPROVAL ENDPOINTS TEST
 * 
 * Tests ALL approval paths with different user roles:
 * 
 * SERVICE REQUESTS:
 * 1. Admin/Ops Officer approves walk-in (POST /api/service-requests/:id/approve-completion)
 * 2. Institution Admin approves service request (POST /api/institution_admin/service-approvals/:id/approve)
 * 3. Institution User approves service request (PATCH /api/users/me/service-requests/:id/approve)
 * 
 * MAINTENANCE SERVICES:
 * 4. Institution Admin approves maintenance (PATCH /api/maintenance-services/institution_admin/:id/approve)
 * 5. Institution User approves maintenance (PATCH /api/maintenance-services/institution_user/:id/approve)
 * 
 * Each test validates:
 * - Partial consumption correctly deducts from opened bottle
 * - Full consumption uses sealed bottle (not opened)
 * - Depletion correctly sets remaining to NULL and is_opened to 0
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const http = require('http');

const API_BASE = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    technicianId: 2,
    testItemId: 1,      // HP Ink, 100ml per bottle
    institutionId: 'INST-001',
    printerId: 1,
    capacityPerBottle: 100
};

// Test users
const TEST_USERS = {
    admin: { id: 1, email: 'serviceeaseph@gmail.com', password: 'Admin@123' },
    institution_admin: { id: 6, email: 'markivan.note@gmail.com', password: 'Test@123' },
    institution_user: { id: 7, email: 'test.requester@gmail.com', password: 'Test@123' }
};

let db;
let tokens = {};
let testResults = [];

// Helper functions
function logResult(testName, expected, actual, passed, notes = '') {
    const result = { testName, expected, actual, passed, notes };
    testResults.push(result);
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName}`);
    console.log(`   Expected: ${expected}, Actual: ${actual}`);
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
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
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

async function resetInventory(qty, remaining, isOpened) {
    await db.query(`
        UPDATE technician_inventory 
        SET quantity = ?, remaining_volume = ?, is_opened = ?
        WHERE technician_id = ? AND item_id = ?
    `, [qty, remaining, isOpened, TEST_CONFIG.technicianId, TEST_CONFIG.testItemId]);
}

async function getInventoryState() {
    const [rows] = await db.query(`
        SELECT quantity, remaining_volume, is_opened 
        FROM technician_inventory 
        WHERE technician_id = ? AND item_id = ?
    `, [TEST_CONFIG.technicianId, TEST_CONFIG.testItemId]);
    return rows[0] || { quantity: 0, remaining_volume: null, is_opened: 0 };
}

// Create service request for walk-in
async function createWalkInServiceRequest(itemsUsed) {
    const [srResult] = await db.query(`
        INSERT INTO service_requests 
        (request_number, walk_in_customer_name, printer_brand, is_walk_in, priority, description, status, requested_by, created_at, technician_id)
        VALUES (?, 'Test Customer', 'HP', TRUE, 'medium', 'Test', 'pending_approval', ?, NOW(), ?)
    `, [`SR-TEST-${Date.now()}`, 1, TEST_CONFIG.technicianId]);
    const serviceId = srResult.insertId;
    
    for (const item of itemsUsed) {
        await db.query(`
            INSERT INTO service_items_used (service_id, service_type, item_id, quantity_used, amount_consumed, consumption_type, used_by, used_at)
            VALUES (?, 'service_request', ?, 1, ?, ?, ?, NOW())
        `, [serviceId, item.item_id, item.amount_consumed, item.consumption_type, TEST_CONFIG.technicianId]);
    }
    
    return serviceId;
}

// Create service request for institution
async function createInstitutionServiceRequest(itemsUsed) {
    const [srResult] = await db.query(`
        INSERT INTO service_requests 
        (request_number, institution_id, printer_id, priority, description, status, technician_id, requested_by, created_at)
        VALUES (?, ?, ?, 'medium', 'Test', 'pending_approval', ?, ?, NOW())
    `, [`SR-TEST-${Date.now()}`, TEST_CONFIG.institutionId, TEST_CONFIG.printerId, TEST_CONFIG.technicianId, TEST_USERS.institution_user.id]);
    const serviceId = srResult.insertId;
    
    for (const item of itemsUsed) {
        await db.query(`
            INSERT INTO service_items_used (service_id, service_type, item_id, quantity_used, amount_consumed, consumption_type, used_by, used_at)
            VALUES (?, 'service_request', ?, 1, ?, ?, ?, NOW())
        `, [serviceId, item.item_id, item.amount_consumed, item.consumption_type, TEST_CONFIG.technicianId]);
    }
    
    // Create service_approvals record
    await db.query(`
        INSERT INTO service_approvals (service_id, status, service_type, submitted_at)
        VALUES (?, 'pending_approval', 'service_request', NOW())
    `, [serviceId]);
    
    const [approvals] = await db.query('SELECT id FROM service_approvals WHERE service_id = ? ORDER BY id DESC LIMIT 1', [serviceId]);
    
    return { serviceId, approvalId: approvals[0].id };
}

// Create maintenance service
async function createMaintenanceService(itemsUsed) {
    // Get institution_id from institution_printer_assignments table
    const [assignment] = await db.query('SELECT institution_id FROM institution_printer_assignments WHERE printer_id = ? AND status = "assigned" LIMIT 1', [TEST_CONFIG.printerId]);
    const institutionId = assignment[0]?.institution_id || TEST_CONFIG.institutionId;
    
    const [msResult] = await db.query(`
        INSERT INTO maintenance_services 
        (printer_id, technician_id, institution_id, service_description, status, created_at)
        VALUES (?, ?, ?, 'Test Maintenance Service', 'pending', NOW())
    `, [TEST_CONFIG.printerId, TEST_CONFIG.technicianId, institutionId]);
    const serviceId = msResult.insertId;
    
    // Store items in service_items_used table (like service requests)
    for (const item of itemsUsed) {
        await db.query(`
            INSERT INTO service_items_used (service_id, service_type, item_id, quantity_used, amount_consumed, consumption_type, used_by, used_at)
            VALUES (?, 'maintenance_service', ?, 1, ?, ?, ?, NOW())
        `, [serviceId, item.item_id, item.amount_consumed, item.consumption_type, TEST_CONFIG.technicianId]);
    }
    
    return serviceId;
}

async function cleanupTestData(serviceId, type = 'service') {
    if (!serviceId) return;
    try {
        if (type === 'service') {
            await db.query('DELETE FROM service_items_used WHERE service_id = ?', [serviceId]);
            await db.query('DELETE FROM service_approvals WHERE service_id = ?', [serviceId]);
            await db.query('DELETE FROM service_request_history WHERE request_id = ?', [serviceId]);
            await db.query('DELETE FROM service_requests WHERE id = ?', [serviceId]);
        } else {
            await db.query('DELETE FROM service_items_used WHERE service_id = ? AND service_type = ?', [serviceId, 'maintenance_service']);
            await db.query('DELETE FROM service_approvals WHERE service_id = ? AND service_type = ?', [serviceId, 'maintenance_service']);
            await db.query('DELETE FROM maintenance_services WHERE id = ?', [serviceId]);
        }
    } catch (e) {
        console.log(`Cleanup warning: ${e.message}`);
    }
}

// ============================================================
// TEST 1: Admin approves walk-in (partial consumption)
// ============================================================
async function testAdminWalkInPartial() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: ADMIN APPROVES WALK-IN (PARTIAL 50ml)');
    console.log('Endpoint: POST /api/service-requests/:id/approve-completion');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, null, 0);
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        serviceId = await createWalkInServiceRequest([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 50, consumption_type: 'partial' }
        ]);
        
        const response = await makeRequest('POST', `/api/service-requests/${serviceId}/approve-completion`, {
            approved: true, notes: 'Admin test'
        }, tokens.admin);
        
        console.log(`Response: ${response.status}`);
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty unchanged (10)', '10', String(after.quantity), after.quantity === 10);
        logResult('Remaining = 50ml', '50', String(after.remaining_volume), parseFloat(after.remaining_volume) === 50);
        logResult('is_opened = 1', '1', String(after.is_opened), after.is_opened === 1);
        
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 2: Admin approves walk-in (full consumption - uses sealed bottle)
// ============================================================
async function testAdminWalkInFull() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: ADMIN APPROVES WALK-IN (FULL 100ml - sealed bottle)');
    console.log('Endpoint: POST /api/service-requests/:id/approve-completion');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, 30, 1); // Has opened bottle with 30ml
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        serviceId = await createWalkInServiceRequest([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 100, consumption_type: 'full' }
        ]);
        
        const response = await makeRequest('POST', `/api/service-requests/${serviceId}/approve-completion`, {
            approved: true, notes: 'Admin test full'
        }, tokens.admin);
        
        console.log(`Response: ${response.status}`);
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty = 9 (sealed used)', '9', String(after.quantity), after.quantity === 9);
        logResult('Remaining = 30 (opened untouched)', '30', String(after.remaining_volume), parseFloat(after.remaining_volume) === 30);
        logResult('is_opened = 1', '1', String(after.is_opened), after.is_opened === 1);
        
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 3: Admin approves walk-in (partial that depletes)
// ============================================================
async function testAdminWalkInDeplete() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: ADMIN APPROVES WALK-IN (PARTIAL 50ml - DEPLETES)');
    console.log('Endpoint: POST /api/service-requests/:id/approve-completion');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, 50, 1); // Has opened bottle with 50ml
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        serviceId = await createWalkInServiceRequest([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 50, consumption_type: 'partial' }
        ]);
        
        const response = await makeRequest('POST', `/api/service-requests/${serviceId}/approve-completion`, {
            approved: true, notes: 'Admin test deplete'
        }, tokens.admin);
        
        console.log(`Response: ${response.status}`);
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty = 9 (bottle depleted)', '9', String(after.quantity), after.quantity === 9);
        logResult('Remaining = NULL', 'null', String(after.remaining_volume), after.remaining_volume === null);
        logResult('is_opened = 0', '0', String(after.is_opened), after.is_opened === 0);
        
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 4: Institution Admin approves service request (partial)
// ============================================================
async function testInstitutionAdminServicePartial() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: INSTITUTION ADMIN APPROVES SERVICE REQUEST (PARTIAL 50ml)');
    console.log('Endpoint: POST /api/institution_admin/service-approvals/:id/approve');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, null, 0);
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        const { serviceId: sId, approvalId } = await createInstitutionServiceRequest([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 50, consumption_type: 'partial' }
        ]);
        serviceId = sId;
        
        const response = await makeRequest('POST', `/api/institution_admin/service-approvals/${approvalId}/approve`, {
            notes: 'Institution Admin test'
        }, tokens.institution_admin);
        
        console.log(`Response: ${response.status}`);
        if (response.status !== 200) console.log(`Data: ${JSON.stringify(response.data)}`);
        
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty unchanged (10)', '10', String(after.quantity), after.quantity === 10);
        logResult('Remaining = 50ml', '50', String(after.remaining_volume), parseFloat(after.remaining_volume) === 50);
        logResult('is_opened = 1', '1', String(after.is_opened), after.is_opened === 1);
        
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 5: Institution User approves service request (partial that depletes)
// ============================================================
async function testInstitutionUserServiceDeplete() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: INSTITUTION USER APPROVES SERVICE REQUEST (PARTIAL 50ml - DEPLETES)');
    console.log('Endpoint: PATCH /api/users/me/service-requests/:id/approve');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, 50, 1);
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        const { serviceId: sId } = await createInstitutionServiceRequest([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 50, consumption_type: 'partial' }
        ]);
        serviceId = sId;
        
        const response = await makeRequest('PATCH', `/api/users/me/service-requests/${serviceId}/approve`, {
            approved: true, feedback: 'Institution User test'
        }, tokens.institution_user);
        
        console.log(`Response: ${response.status}`);
        if (response.status !== 200) console.log(`Data: ${JSON.stringify(response.data)}`);
        
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty = 9 (depleted)', '9', String(after.quantity), after.quantity === 9);
        logResult('Remaining = NULL', 'null', String(after.remaining_volume), after.remaining_volume === null);
        logResult('is_opened = 0', '0', String(after.is_opened), after.is_opened === 0);
        
    } finally {
        await cleanupTestData(serviceId);
    }
}

// ============================================================
// TEST 6: Institution Admin approves maintenance service (partial)
// ============================================================
async function testInstitutionAdminMaintenancePartial() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 6: INSTITUTION ADMIN APPROVES MAINTENANCE SERVICE (PARTIAL 50ml)');
    console.log('Endpoint: PATCH /api/maintenance-services/institution_admin/:id/approve');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, null, 0);
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        serviceId = await createMaintenanceService([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 50, consumption_type: 'partial' }
        ]);
        
        const response = await makeRequest('PATCH', `/api/maintenance-services/institution_admin/${serviceId}/approve`, {}, tokens.institution_admin);
        
        console.log(`Response: ${response.status}`);
        if (response.status !== 200) console.log(`Data: ${JSON.stringify(response.data)}`);
        
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty unchanged (10)', '10', String(after.quantity), after.quantity === 10);
        logResult('Remaining = 50ml', '50', String(after.remaining_volume), parseFloat(after.remaining_volume) === 50);
        logResult('is_opened = 1', '1', String(after.is_opened), after.is_opened === 1);
        
    } finally {
        await cleanupTestData(serviceId, 'maintenance');
    }
}

// ============================================================
// TEST 7: Institution User approves maintenance service (full)
// ============================================================
async function testInstitutionUserMaintenanceFull() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 7: INSTITUTION USER APPROVES MAINTENANCE SERVICE (FULL 100ml)');
    console.log('Endpoint: PATCH /api/maintenance-services/institution_user/:id/approve');
    console.log('='.repeat(70));
    
    let serviceId = null;
    try {
        await resetInventory(10, 30, 1); // Has opened bottle with 30ml
        const before = await getInventoryState();
        console.log(`Before: Qty=${before.quantity}, Remaining=${before.remaining_volume}, Opened=${before.is_opened}`);
        
        serviceId = await createMaintenanceService([
            { item_id: TEST_CONFIG.testItemId, amount_consumed: 100, consumption_type: 'full' }
        ], true);
        
        const response = await makeRequest('PATCH', `/api/maintenance-services/institution_user/${serviceId}/approve`, {}, tokens.institution_user);
        
        console.log(`Response: ${response.status}`);
        if (response.status !== 200) console.log(`Data: ${JSON.stringify(response.data)}`);
        
        const after = await getInventoryState();
        console.log(`After: Qty=${after.quantity}, Remaining=${after.remaining_volume}, Opened=${after.is_opened}`);
        
        logResult('Qty = 9 (sealed used)', '9', String(after.quantity), after.quantity === 9);
        logResult('Remaining = 30 (opened untouched)', '30', String(after.remaining_volume), parseFloat(after.remaining_volume) === 30);
        logResult('is_opened = 1', '1', String(after.is_opened), after.is_opened === 1);
        
    } finally {
        await cleanupTestData(serviceId, 'maintenance');
    }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║         COMPREHENSIVE APPROVAL ENDPOINTS TEST                          ║');
    console.log('║                                                                         ║');
    console.log('║  Testing ALL approval paths for service requests & maintenance          ║');
    console.log('║  Admin, Institution Admin, and Institution User roles                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('\n✅ Connected to database');
        
        // Login all users
        console.log('\n🔐 Authenticating test users...');
        
        try {
            tokens.admin = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
            console.log('   ✅ Admin logged in');
        } catch (e) {
            console.log('   ❌ Admin login failed:', e.message);
        }
        
        try {
            tokens.institution_admin = await login(TEST_USERS.institution_admin.email, TEST_USERS.institution_admin.password);
            console.log('   ✅ Institution Admin logged in');
        } catch (e) {
            console.log('   ❌ Institution Admin login failed:', e.message);
        }
        
        try {
            tokens.institution_user = await login(TEST_USERS.institution_user.email, TEST_USERS.institution_user.password);
            console.log('   ✅ Institution User logged in');
        } catch (e) {
            console.log('   ❌ Institution User login failed:', e.message);
        }
        
        // Run tests
        console.log('\n' + '━'.repeat(75));
        console.log('SERVICE REQUEST APPROVAL TESTS');
        console.log('━'.repeat(75));
        
        if (tokens.admin) {
            await testAdminWalkInPartial();
            await testAdminWalkInFull();
            await testAdminWalkInDeplete();
        }
        
        if (tokens.institution_admin) {
            await testInstitutionAdminServicePartial();
        }
        
        if (tokens.institution_user) {
            await testInstitutionUserServiceDeplete();
        }
        
        console.log('\n' + '━'.repeat(75));
        console.log('MAINTENANCE SERVICE APPROVAL TESTS');
        console.log('━'.repeat(75));
        
        if (tokens.institution_admin) {
            await testInstitutionAdminMaintenancePartial();
        }
        
        if (tokens.institution_user) {
            await testInstitutionUserMaintenanceFull();
        }
        
        // Reset inventory
        await resetInventory(10, null, 0);
        
        // Print summary
        console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
        console.log('║                         TEST RESULTS SUMMARY                           ║');
        console.log('╚═══════════════════════════════════════════════════════════════════════╝');
        
        const passed = testResults.filter(r => r.passed).length;
        const failed = testResults.filter(r => !r.passed).length;
        const total = testResults.length;
        
        console.log(`\n  Total: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
        console.log(`  Pass Rate: ${((passed/total)*100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n  ─── FAILED TESTS ───');
            testResults.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.testName}: Expected ${r.expected}, Got ${r.actual}`);
            });
        }
        
        console.log('\n');
        process.exit(failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    } finally {
        if (db) await db.end();
    }
}

main();
