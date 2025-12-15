// Walk-In Service Requests Management
// API_BASE_URL is now loaded from config.js
let currentTab = 'all';
let allRequests = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Verify role
    const userRole = getUserRole();
    if (!['admin', 'operations_officer'].includes(userRole)) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Load sidebar
    await loadSidebar();

    // Load requests
    await loadRequests();

    // Setup event listeners
    setupEventListeners();
});

// Get user role from token
function getUserRole() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
    } catch (error) {
        return null;
    }
}

// Load appropriate sidebar
async function loadSidebar() {
    const userRole = getUserRole();
    let sidebarPath;
    
    if (userRole === 'admin') {
        sidebarPath = '/components/admin-sidebar.html';
    } else if (userRole === 'operations_officer') {
        sidebarPath = '/components/operations-officer-sidebar.html';
    }
    
    if (sidebarPath) {
        try {
            const response = await fetch(sidebarPath);
            if (response.ok) {
                const sidebarHTML = await response.text();
                document.getElementById('dynamic-sidebar').innerHTML = sidebarHTML;
                
                // Initialize sidebar functionality after loading
                if (typeof initializeSidebarFunctionality === 'function') {
                    initializeSidebarFunctionality(userRole);
                }
            }
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Create request button
    document.getElementById('createRequestBtn').addEventListener('click', () => {
        document.getElementById('createRequestModal').classList.remove('hidden');
    });

    // Create request form
    document.getElementById('createRequestForm').addEventListener('submit', handleCreateRequest);

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active', 'border-blue-600', 'text-blue-600');
            btn.classList.remove('border-transparent', 'text-slate-500');
        } else {
            btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-slate-500');
        }
    });
    
    // Render filtered requests
    renderRequests();
}

// Load requests
async function loadRequests() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/walk-in-service-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            allRequests = await response.json();
            updateStats();
            renderRequests();
        } else {
            const error = await response.json();
            console.error('Failed to load requests:', error);
            allRequests = [];
            updateStats();
            renderRequests();
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        allRequests = [];
        updateStats();
        renderRequests();
    } finally {
        document.getElementById('loadingState').classList.add('hidden');
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalCount').textContent = allRequests.length;
    document.getElementById('pendingCount').textContent = 
        allRequests.filter(r => r.status === 'pending').length;
    document.getElementById('inProgressCount').textContent = 
        allRequests.filter(r => r.status === 'in_progress').length;
    document.getElementById('approvalCount').textContent = 
        allRequests.filter(r => r.status === 'pending_approval' && r.approval_status === 'pending_approval').length;
}

// Render requests
function renderRequests() {
    const container = document.getElementById('requestsList');
    const emptyState = document.getElementById('emptyState');
    
    let filteredRequests = allRequests;
    
    // Filter by tab
    if (currentTab !== 'all') {
        if (currentTab === 'pending_approval') {
            // Awaiting approval tab
            filteredRequests = allRequests.filter(r => 
                r.status === 'pending_approval' && r.approval_status === 'pending_approval'
            );
        } else if (currentTab === 'completed') {
            // Completed/Resolved tab (approved requests)
            filteredRequests = allRequests.filter(r => 
                r.status === 'completed' && r.approval_status === 'approved'
            );
        } else {
            filteredRequests = allRequests.filter(r => r.status === currentTab);
        }
    }
    
    if (filteredRequests.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = filteredRequests.map(request => renderRequestCard(request)).join('');
    }
}

// Render request card
function renderRequestCard(request) {
    const statusColors = {
        'pending': 'bg-orange-100 text-orange-700',
        'in_progress': 'bg-blue-100 text-blue-700',
        'pending_approval': 'bg-purple-100 text-purple-700',
        'completed': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };

    const priorityColors = {
        'low': 'bg-gray-100 text-gray-700',
        'medium': 'bg-yellow-100 text-yellow-700',
        'high': 'bg-orange-100 text-orange-700',
        'urgent': 'bg-red-100 text-red-700'
    };

    const statusColor = statusColors[request.status] || 'bg-gray-100 text-gray-700';
    const priorityColor = priorityColors[request.priority] || 'bg-gray-100 text-gray-700';

    const needsApproval = request.status === 'pending_approval' && request.approval_status === 'pending_approval';

    return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
             onclick="viewRequestDetails(${request.id})">
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-slate-900 mb-1">${escapeHtml(request.walk_in_customer_name)}</h3>
                    <p class="text-sm text-slate-600">
                        <i class="fas fa-print mr-1"></i>
                        ${escapeHtml(request.printer_brand)}
                    </p>
                </div>
                <div class="flex flex-col items-end space-y-2">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
                        ${formatStatus(request.status)}
                    </span>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${priorityColor}">
                        ${request.priority.toUpperCase()}
                    </span>
                </div>
            </div>

            ${needsApproval ? `
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <p class="text-sm font-medium text-purple-900">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Awaiting Your Approval
                </p>
            </div>
            ` : ''}

            <div class="space-y-2 mb-4">
                <p class="text-sm text-slate-600 line-clamp-2">
                    <i class="fas fa-info-circle mr-2 text-slate-400"></i>
                    ${escapeHtml(request.issue_description)}
                </p>
                ${request.technician_name ? `
                <p class="text-sm text-slate-600">
                    <i class="fas fa-user-cog mr-2 text-slate-400"></i>
                    Assigned to: ${escapeHtml(request.technician_name)}
                </p>
                ` : ''}
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                <p class="text-xs text-slate-500">
                    <i class="far fa-clock mr-1"></i>
                    ${formatDate(request.created_at)}
                </p>
                <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Details ?
                </button>
            </div>
        </div>
    `;
}

// View request details
async function viewRequestDetails(requestId) {
    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('detailsContent');

    // Fetch full request details including parts from backend
    let request = null;
    let partsUsed = [];
    
    try {
        const response = await fetch(`${API_URL}/api/service-requests/${requestId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch request details');
        }
        
        request = await response.json();
        partsUsed = request.items_used || [];
    } catch (error) {
        console.error('Error fetching request details:', error);
        // Fall back to cached request if API fails
        request = allRequests.find(r => r.id === requestId);
        if (!request) {
            showToast('Failed to load request details', 'error');
            return;
        }
    }

    const statusColors = {
        'pending': 'bg-orange-100 text-orange-700',
        'in_progress': 'bg-blue-100 text-blue-700',
        'pending_approval': 'bg-purple-100 text-purple-700',
        'completed': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };

    const statusColor = statusColors[request.status] || 'bg-gray-100 text-gray-700';
    // Only show needs approval if status is pending_approval AND approval_status is still pending_approval (not revision_requested)
    const needsApproval = request.status === 'pending_approval' && 
                         (!request.approval_status || request.approval_status === 'pending_approval');

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="text-2xl font-bold text-slate-900 mb-2">${escapeHtml(request.walk_in_customer_name)}</h4>
                    <p class="text-slate-600">Request #${request.id}</p>
                </div>
                <span class="px-4 py-2 rounded-full text-sm font-medium ${statusColor}">
                    ${formatStatus(request.status)}
                </span>
            </div>

            ${needsApproval ? `
            <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <p class="text-sm font-medium text-purple-900 mb-3">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    This request requires your approval
                </p>
                <div class="flex space-x-3">
                    <button onclick="approveRequest(${request.id}, true)" 
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-check mr-2"></i>Approve
                    </button>
                    <button onclick="approveRequest(${request.id}, false)" 
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-times mr-2"></i>Request Revision
                    </button>
                </div>
            </div>
            ` : ''}

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-50 rounded-lg p-4">
                    <p class="text-sm text-slate-600 mb-1">Printer Brand</p>
                    <p class="font-semibold text-slate-900">${escapeHtml(request.printer_brand)}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-4">
                    <p class="text-sm text-slate-600 mb-1">Priority</p>
                    <p class="font-semibold text-slate-900">${request.priority.toUpperCase()}</p>
                </div>
            </div>

            <!-- Issue Description -->
            <div>
                <h5 class="font-semibold text-slate-900 mb-2">Issue Description</h5>
                <p class="text-slate-700 bg-slate-50 rounded-lg p-4">${escapeHtml(request.issue_description || request.description)}</p>
            </div>

            ${request.technician_first_name ? `
            <div>
                <h5 class="font-semibold text-slate-900 mb-2">Assigned Technician</h5>
                <div class="bg-slate-50 rounded-lg p-4 flex items-center">
                    <i class="fas fa-user-cog text-2xl text-blue-600 mr-3"></i>
                    <div>
                        <p class="font-semibold text-slate-900">${escapeHtml(request.technician_first_name + ' ' + request.technician_last_name)}</p>
                    </div>
                </div>
            </div>
            ` : ''}

            ${partsUsed.length > 0 ? `
            <div>
                <h5 class="font-semibold text-slate-900 mb-2">
                    <i class="fas fa-tools mr-2 text-blue-600"></i>Items Used
                </h5>
                <div class="bg-blue-50 rounded-lg p-4 space-y-3">
                    ${partsUsed.map(part => `
                        <div class="bg-white rounded-lg p-3 border border-blue-100">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-slate-900 font-medium">${escapeHtml(part.part_name)}</span>
                                <span class="font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-sm">x${part.quantity_used} ${part.unit || 'pcs'}</span>
                            </div>
                            ${part.brand ? `<p class="text-sm text-slate-600"><span class="font-medium">Brand:</span> ${escapeHtml(part.brand)}</p>` : ''}
                            ${part.category ? `<p class="text-sm text-slate-600"><span class="font-medium">Category:</span> ${escapeHtml(part.category)}</p>` : ''}
                            ${part.part_notes ? `<p class="text-sm text-slate-600 mt-1"><span class="font-medium">Notes:</span> ${escapeHtml(part.part_notes)}</p>` : ''}
                            ${part.used_by_first_name ? `
                                <p class="text-xs text-slate-500 mt-2">
                                    <i class="fas fa-user-check mr-1"></i>Used by ${escapeHtml(part.used_by_first_name + ' ' + part.used_by_last_name)}
                                    ${part.used_at ? ` on ${formatDate(part.used_at)}` : ''}
                                </p>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${request.technician_notes || request.resolution_notes ? `
            <div>
                <h5 class="font-semibold text-slate-900 mb-2">Technician Notes</h5>
                <p class="text-slate-700 bg-green-50 rounded-lg p-4 whitespace-pre-wrap">${escapeHtml(request.technician_notes || request.resolution_notes)}</p>
            </div>
            ` : ''}

            ${request.completion_photo_url ? `
            <div>
                <h5 class="font-semibold text-slate-900 mb-2">
                    <i class="fas fa-camera mr-2 text-blue-600"></i>Completion Photo
                </h5>
                <div class="bg-white rounded-lg border-2 border-blue-200 overflow-hidden shadow-sm">
                    <img src="${request.completion_photo_url}" 
                         alt="Service completion photo" 
                         class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                         onclick="window.open('${request.completion_photo_url}', '_blank')">
                    <div class="p-2 bg-blue-50 text-xs text-blue-700 text-center">
                        <i class="fas fa-expand-alt mr-1"></i>Click to view full size
                    </div>
                </div>
            </div>
            ` : ''}

            ${request.approved_by && request.approval_status === 'approved' ? `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 class="font-semibold text-green-900 mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Approved
                </h5>
                <p class="text-sm text-green-800">
                    Approved by ${escapeHtml(request.approved_by_first_name + ' ' + request.approved_by_last_name)} at ${formatDate(request.approved_at)}
                </p>
                ${request.institutionAdmin_notes ? `<p class="text-sm text-green-800 mt-2">${escapeHtml(request.institutionAdmin_notes)}</p>` : ''}
            </div>
            ` : ''}
            
            ${request.approval_status === 'revision_requested' ? `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h5 class="font-semibold text-orange-900 mb-2">
                    <i class="fas fa-undo mr-2"></i>Revision Requested
                </h5>
                ${request.institutionAdmin_notes ? `<p class="text-sm text-orange-800">${escapeHtml(request.institutionAdmin_notes)}</p>` : ''}
            </div>
            ` : ''}

            <!-- Timestamps -->
            <div class="border-t border-slate-200 pt-4">
                <div class="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                        <p class="font-medium">Created</p>
                        <p>${formatDate(request.created_at)}</p>
                    </div>
                    ${request.updated_at ? `
                    <div>
                        <p class="font-medium">Last Updated</p>
                        <p>${formatDate(request.updated_at)}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Handle create request
async function handleCreateRequest(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

    const requestData = {
        walk_in_customer_name: document.getElementById('customerName').value.trim(),
        printer_brand: document.getElementById('printerBrand').value.trim(),
        priority: document.getElementById('priority').value,
        issue: document.getElementById('issueDescription').value.trim()
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/walk-in-service-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            // Populate success modal with request details
            document.getElementById('createdCustomerName').textContent = requestData.walk_in_customer_name;
            document.getElementById('createdPrinterBrand').textContent = requestData.printer_brand;
            
            const priorityBadge = {
                'low': 'Low Priority',
                'medium': 'Medium Priority',
                'high': 'High Priority',
                'urgent': 'Urgent'
            }[requestData.priority] || requestData.priority;
            document.getElementById('createdPriority').textContent = priorityBadge;
            
            // Close create modal and show success modal
            closeCreateModal();
            document.getElementById('requestCreatedModal').classList.remove('hidden');
            
            await loadRequests();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to create request');
        }
    } catch (error) {
        console.error('Error creating request:', error);
        showError('Error creating request');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Request</span>';
    }
}

function closeRequestCreatedModal() {
    document.getElementById('requestCreatedModal').classList.add('hidden');
}

// Approve request
// Approval/Rejection handling with modals
let currentRequestId = null;

async function approveRequest(requestId, approved) {
    currentRequestId = requestId;
    
    if (approved) {
        document.getElementById('approvalModal').classList.remove('hidden');
    } else {
        document.getElementById('rejectionModal').classList.remove('hidden');
        document.getElementById('rejectionNotes').value = '';
        document.getElementById('rejectionNotes').focus();
    }
}

async function confirmApproval() {
    if (!currentRequestId) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/service-requests/${currentRequestId}/approve-completion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approved: true, notes: null })
        });

        if (response.ok) {
            showSuccess('Request approved successfully! Parts deducted from technician inventory.');
            closeApprovalModal();
            closeDetailsModal();
            await loadRequests();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to approve request');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        showError('Error approving request');
    }
}

async function confirmRejection() {
    if (!currentRequestId) return;
    
    const notes = document.getElementById('rejectionNotes').value.trim();
    if (!notes) {
        showError('Please provide notes explaining what needs to be revised');
        document.getElementById('rejectionNotes').focus();
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/service-requests/${currentRequestId}/approve-completion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approved: false, notes })
        });

        if (response.ok) {
            showSuccess('Request sent back for revision. Technician has been notified.');
            closeRejectionModal();
            closeDetailsModal();
            await loadRequests();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to process request');
        }
    } catch (error) {
        console.error('Error processing request:', error);
        showError('Error processing request');
    }
}

function closeApprovalModal() {
    document.getElementById('approvalModal').classList.add('hidden');
    currentRequestId = null;
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').classList.add('hidden');
    document.getElementById('rejectionNotes').value = '';
    currentRequestId = null;
}

// Legacy function for backward compatibility - can be removed
function showRejectModal(requestId) {
    approveRequest(requestId, false);
}

// Legacy function for backward compatibility - can be removed
async function rejectRequest(requestId, notes) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/service-requests/${requestId}/approve-completion`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approved: false, notes })
        });

        if (response.ok) {
            showSuccess('Revision requested successfully!');
            closeDetailsModal();
            await loadRequests();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to request revision');
        }
    } catch (error) {
        console.error('Error requesting revision:', error);
        showError('Error requesting revision');
    }
}

// Close modals
function closeCreateModal() {
    document.getElementById('createRequestModal').classList.add('hidden');
    document.getElementById('createRequestForm').reset();
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
}

// Utility functions
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'pending_approval': 'Awaiting Approval',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('Error: ' + message);
}









