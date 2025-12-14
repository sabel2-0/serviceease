import { loadSidebar, setupWebSocket, showNotification } from './institution_admin-sidebar.js';

// institutionAdmin Dashboard Functions
document.addEventListener('DOMContentLoaded', async function() {
    await loadSidebar();
    setupWebSocket();
    loadDashboard();
    loadInstitutionPrinters();
    loadServiceRequests();
    loadUserAccounts();
    
    // Set up tab navigation
    setupTabNavigation();
});

// Load Dashboard Statistics
async function loadDashboard() {
    try {
        const response = await fetch('/api/institutionAdmin/dashboard', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        updateDashboardStats(data);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Real-time Notifications Setup
function setupNotifications() {
    const user = JSON.parse(localStorage.getItem('user'));
    const ws = new WebSocket(`${WS_BASE_URL}/notifications/${user.id}`);
    
    ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        showNotification(notification);
    };
}

// Manage Institution's Printers
async function loadInstitutionPrinters() {
    try {
        const response = await fetch('/api/institutionAdmin/printers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const printers = await response.json();
        displayPrinters(printers);
    } catch (error) {
        console.error('Error loading printers:', error);
    }
}

// Submit Service Request
async function submitServiceRequest(data) {
    try {
        const response = await fetch('/api/service-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            showSuccessMessage('Service request submitted successfully');
            loadServiceRequests();
        } else {
            showErrorMessage(result.message);
        }
    } catch (error) {
        console.error('Error submitting service request:', error);
        showErrorMessage('Failed to submit service request');
    }
}

// Load Service Requests
async function loadServiceRequests() {
    try {
        const response = await fetch('/api/institution_admin/service-approvals/pending', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const requests = await response.json();
        displayServiceRequests(requests);
    } catch (error) {
        console.error('Error loading service requests:', error);
    }
}

// Approve Service Request Completion
async function approveServiceCompletion(approvalId) {
    try {
        const response = await fetch(`/api/institution_admin/service-approvals/${approvalId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ notes: '' })
        });
        const result = await response.json();
        if (response.ok) {
            showSuccessMessage('Service completion approved');
            loadServiceRequests();
        } else {
            showErrorMessage(result.error || result.message);
        }
    } catch (error) {
        console.error('Error approving service completion:', error);
        showErrorMessage('Failed to approve service completion');
    }
}

// Manage User Accounts
async function loadUserAccounts() {
    try {
        const response = await fetch('/api/institutionAdmin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// UI Helper Functions
function displayPrinters(printers) {
    const printerList = document.getElementById('printer-list');
    if (!printerList) return;

    printerList.innerHTML = printers.map(printer => `
        <div class="printer-item bg-white p-4 rounded-lg shadow mb-4">
            <h4 class="font-semibold">${printer.model}</h4>
            <p class="text-sm text-gray-600">Location: ${printer.location}</p>
            <p class="text-sm text-gray-600">Status: ${printer.status}</p>
            <div class="mt-2">
                <button onclick="viewPrinterHistory('${printer.id}')" 
                        class="text-blue-600 hover:text-blue-800">
                    View History
                </button>
            </div>
        </div>
    `).join('');
}

function displayServiceRequests(requests) {
    const requestList = document.getElementById('service-requests');
    if (!requestList) return;

    requestList.innerHTML = requests.map(request => `
        <div class="request-item bg-white p-4 rounded-lg shadow mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold">#${request.service_request_id} - ${request.request_description}</h4>
                    <p class="text-sm text-gray-600">Institution: ${request.institution_name}</p>
                    <p class="text-sm text-gray-600">Technician: ${request.technician_first_name} ${request.technician_last_name}</p>
                    <p class="text-sm text-gray-600">Status: ${request.approval_status}</p>
                    ${request.parts_used ? `<p class="text-sm text-gray-600">Items used: ${request.parts_used}</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    ${request.approval_status === 'pending_approval' ? 
                        `<button onclick="approveServiceCompletion('${request.approval_id}')"
                                class="bg-green-500 text-white px-3 py-1 rounded">
                            Approve
                        </button>` : ''
                    }
                    <button onclick="viewRequestDetails('${request.service_request_id}')"
                            class="bg-blue-500 text-white px-3 py-1 rounded">
                        Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function displayUsers(users) {
    const userList = document.getElementById('user-list');
    if (!userList) return;

    userList.innerHTML = users.map(user => `
        <div class="user-item bg-white p-4 rounded-lg shadow mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold">${user.name}</h4>
                    <p class="text-sm text-gray-600">${user.email}</p>
                    <p class="text-sm text-gray-600">Role: ${user.role}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="editUser('${user.id}')"
                            class="bg-blue-500 text-white px-3 py-1 rounded">
                        Edit
                    </button>
                    <button onclick="manageAssignments('${user.id}')"
                            class="bg-green-500 text-white px-3 py-1 rounded">
                        Assignments
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showNotification(notification) {
    const notifContainer = document.createElement('div');
    notifContainer.className = 'fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50';
    notifContainer.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-bell text-blue-500 mr-2"></i>
            <div>
                <h4 class="font-semibold">${notification.title}</h4>
                <p class="text-sm text-gray-600">${notification.message}</p>
            </div>
        </div>
    `;
    document.body.appendChild(notifContainer);
    setTimeout(() => notifContainer.remove(), 5000);
}

function showSuccessMessage(message) {
    // Implementation for success toast message
    console.log('Success:', message);
}

function showErrorMessage(message) {
    // Implementation for error toast message
    console.log('Error:', message);
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
    // Show default tab on page load
    const hash = window.location.hash.substring(1);
    if (hash) {
        showTab(hash);
    } else {
        showTab('dashboard');
    }
    
    // Add click event listeners to tab navigation links
    document.querySelectorAll('[onclick*="showTab"]').forEach(link => {
        const tabId = link.getAttribute('onclick').match(/showTab\('([^']+)'\)/)[1];
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showTab(tabId);
        });
    });
}

/**
 * Show a specific tab and hide others
 * @param {string} tabId - ID of the tab to show
 */
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
        
        // Update URL hash
        window.location.hash = tabId;
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(`showTab('${tabId}')`)) {
            item.classList.add('bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300');
        } else {
            item.classList.remove('bg-slate-800', 'text-white');
            item.classList.add('text-slate-300');
        }
    });
}

// Make showTab function globally available
window.showTab = showTab;





