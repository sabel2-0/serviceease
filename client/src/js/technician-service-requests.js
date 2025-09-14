/**
 * Technician Service Requests JavaScript
 * Handles fetching and displaying service requests assigned to a technician
 */

// Global variables
let currentUser = null;
let currentRequestId = null;
let serviceRequests = [];
let signaturePad = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and get user info
    checkLoginStatus();
    
    // Setup event listeners
    setupEventListeners();
});

// Check login status and redirect if not logged in
async function checkLoginStatus() {
    try {
        // Get stored token
        const token = localStorage.getItem('token');
        
        if (!token) {
            // Redirect to login if no token
            window.location.href = '/index.html';
            return;
        }
        
        // Get user info from token
        const user = await getUserFromToken(token);
        
        if (!user || user.role !== 'technician') {
            // Redirect if not technician
            window.location.href = '/index.html';
            return;
        }
        
        currentUser = user;
        document.getElementById('technicianName').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('technicianName').classList.remove('hidden');
        
        // Load service requests for this technician
        loadServiceRequests();
    } catch (error) {
        console.error('Authentication error:', error);
        // For demo purposes, show mock data instead of redirecting
        document.getElementById('technicianName').textContent = 'Markivan Note';
        document.getElementById('technicianName').classList.remove('hidden');
        loadMockServiceRequests();
    }
}

// Decode JWT token to get user info
async function getUserFromToken(token) {
    try {
        // Simple JWT decode (without validation) - just to get the payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

// Load technician's service requests from API
async function loadServiceRequests() {
    try {
        showLoading(true);
        
        // Get status filter
        const statusFilter = document.getElementById('statusFilter').value;
        const queryParams = statusFilter ? `?status=${statusFilter}` : '';
        
        // Get stored token
        const token = localStorage.getItem('token');
        
        // Fetch service requests assigned to this technician with authentication header
        const response = await fetch(`/api/technician/service-requests${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // If unauthorized, redirect to login
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }
            throw new Error('Failed to fetch service requests');
        }
        
        serviceRequests = await response.json();
        
        // Apply client-side priority filter if selected
        const priorityFilter = document.getElementById('priorityFilter').value;
        if (priorityFilter) {
            serviceRequests = serviceRequests.filter(req => req.priority === priorityFilter);
        }
        
        // Display results
        renderServiceRequests(serviceRequests);
    } catch (error) {
        console.error('Error loading service requests:', error);
        showToast('Failed to load service requests', 'error');
        
        // For demo purposes, load mock data if API fails
        loadMockServiceRequests();
    } finally {
        showLoading(false);
    }
}

// Load mock data for demonstration purposes
function loadMockServiceRequests() {
    const mockRequests = [
        {
            id: 1,
            request_number: '2025-0001',
            institution_name: 'Cebu Technological University',
            institution_id: 'CTU001',
            service_type: 'repair',
            priority: 'high',
            status: 'assigned',
            equipment_type: 'Printer',
            equipment_model: 'HP LaserJet Pro M404dn',
            equipment_serial: 'SN12345678',
            equipment_location: 'Admin Building, Room 201',
            description: 'Printer showing error code E01. Not printing documents correctly.',
            contact_person: 'Maria Santos',
            contact_phone: '09123456789',
            contact_email: 'maria.santos@ctu.edu.ph',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            history: [
                {
                    id: 1,
                    previous_status: 'new',
                    new_status: 'assigned',
                    notes: 'Status changed from new to assigned',
                    created_at: new Date().toISOString(),
                    user_name: 'Admin User',
                    role: 'admin'
                }
            ]
        },
        {
            id: 2,
            request_number: '2025-0002',
            institution_name: 'Cebu Technological University',
            institution_id: 'CTU001',
            service_type: 'maintenance',
            priority: 'medium',
            status: 'in_progress',
            equipment_type: 'Projector',
            equipment_model: 'Epson EB-X41',
            equipment_serial: 'EPJ7890123',
            equipment_location: 'Engineering Building, Room 305',
            description: 'Scheduled maintenance for projector. Image quality has decreased.',
            contact_person: 'Jose Reyes',
            contact_phone: '09234567890',
            contact_email: 'jose.reyes@ctu.edu.ph',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            history: [
                {
                    id: 2,
                    previous_status: 'new',
                    new_status: 'assigned',
                    notes: 'Status changed from new to assigned',
                    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    user_name: 'Admin User',
                    role: 'admin'
                },
                {
                    id: 3,
                    previous_status: 'assigned',
                    new_status: 'in_progress',
                    notes: 'Started working on the projector',
                    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    user_name: 'Markivan Note',
                    role: 'technician'
                }
            ]
        },
        {
            id: 3,
            request_number: '2025-0003',
            institution_name: 'Cebu Technological University',
            institution_id: 'CTU001',
            service_type: 'installation',
            priority: 'urgent',
            status: 'assigned',
            equipment_type: 'Desktop Computer',
            equipment_model: 'Dell OptiPlex 7090',
            equipment_serial: 'DELL4567890',
            equipment_location: 'Computer Lab, Building A, Room 101',
            description: 'New computers need to be set up for the upcoming programming competition.',
            contact_person: 'Ana Cruz',
            contact_phone: '09345678901',
            contact_email: 'ana.cruz@ctu.edu.ph',
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
            updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            history: [
                {
                    id: 4,
                    previous_status: 'new',
                    new_status: 'assigned',
                    notes: 'Status changed from new to assigned',
                    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                    user_name: 'Admin User',
                    role: 'admin'
                }
            ]
        }
    ];
    
    serviceRequests = mockRequests;
    renderServiceRequests(mockRequests);
}

// Render service requests in the table
function renderServiceRequests(requests) {
    const tableBody = document.getElementById('serviceRequestsList');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('serviceRequestsTable');
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Handle empty state
    if (!requests || requests.length === 0) {
        emptyState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        return;
    }
    
    // Show table, hide empty state
    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    
    // Create table rows
    requests.forEach(request => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-100';
        row.dataset.requestId = request.id;
        
        // Format date
        const createdDate = new Date(request.created_at);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Set status and priority styling
        const statusClass = getStatusClass(request.status);
        const priorityClass = getPriorityClass(request.priority);
        
        // Populate row
            row.innerHTML = `
                <td class="py-3 px-6">${request.request_number}</td>
                <td class="py-3 px-6">${request.institution_name}</td>
                <td class="py-3 px-6">${request.service_type || 'N/A'}</td>
                <td class="py-3 px-6">${request.model || request.equipment_model || 'N/A'} (${request.serial_number || request.equipment_serial || ''})</td>
                <td class="py-3 px-6">
                    <span class="py-1 px-2 rounded-full text-xs ${statusClass}">
                        ${capitalizeFirstLetter(request.status.replace('_', ' '))}
                    </span>
                </td>
                <td class="py-3 px-6">
                    <span class="py-1 px-2 rounded-full text-xs ${priorityClass}">
                        ${capitalizeFirstLetter(request.priority)}
                    </span>
                </td>
                <td class="py-3 px-6">${formattedDate}</td>
                <td class="py-3 px-6 text-center">
                    <button class="view-details-btn bg-blue-500 text-white rounded px-2 py-1 text-xs">
                        View Details
                    </button>
                </td>
            `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view detail buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const requestId = this.closest('tr').dataset.requestId;
            openRequestDetails(requestId);
        });
    });
}

// Open service request details modal
async function openRequestDetails(requestId) {
    try {
        currentRequestId = requestId;
        const modal = document.getElementById('requestDetailsModal');
        const detailsContainer = document.getElementById('requestDetails');
        
        // Show modal with loading state
        modal.classList.remove('hidden');
        detailsContainer.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        `;
        
        // Get stored token
        const token = localStorage.getItem('token');
        
        // Fetch request details with authentication header
        try {
            const response = await fetch(`/api/technician/service-requests/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                // Handle unauthorized
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch service request details');
            }
            
            const request = await response.json();
            populateRequestDetails(request);
        } catch (error) {
            console.error('API error:', error);
            
            // For demo purposes, use the service request from our local array
            const mockRequest = serviceRequests.find(req => req.id == requestId);
            if (mockRequest) {
                populateRequestDetails(mockRequest);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error fetching request details:', error);
        showToast('Failed to load request details', 'error');
        
        document.getElementById('requestDetails').innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
                <p class="text-gray-700 text-lg">Could not load request details</p>
                <p class="text-gray-500">Please try again later</p>
            </div>
        `;
    }
}

// Populate request details in modal
function populateRequestDetails(request) {
    // Update modal title
    document.getElementById('modalRequestNumber').textContent = `Request #${request.request_number}`;
    
    const detailsContainer = document.getElementById('requestDetails');
    
    // Format date
    const createdDate = new Date(request.created_at);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Set status and priority styling
    const statusClass = getStatusClass(request.status);
    const priorityClass = getPriorityClass(request.priority);
    
    // Render request details
    detailsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-bold text-lg mb-4">Request Information</h4>
                <div class="space-y-3">
                    <p><span class="font-semibold">Status:</span> 
                        <span class="py-1 px-2 rounded-full text-xs ${statusClass}">
                            ${capitalizeFirstLetter(request.status.replace('_', ' '))}
                        </span>
                    </p>
                    <p><span class="font-semibold">Priority:</span> 
                        <span class="py-1 px-2 rounded-full text-xs ${priorityClass}">
                            ${capitalizeFirstLetter(request.priority)}
                        </span>
                    </p>
                    <p><span class="font-semibold">Service Type:</span> ${capitalizeFirstLetter(request.service_type || 'N/A')}</p>
                    <p><span class="font-semibold">Submitted:</span> ${formattedDate}</p>
                    <p><span class="font-semibold">Requested Completion:</span> ${request.requested_completion_date ? new Date(request.requested_completion_date).toLocaleDateString() : 'Not specified'}</p>
                </div>
            </div>
            
            <div>
                <h4 class="font-bold text-lg mb-4">Institution Information</h4>
                <div class="space-y-3">
                    <p><span class="font-semibold">Name:</span> ${request.institution_name}</p>
                    <p><span class="font-semibold">Location:</span> ${request.location || 'N/A'}</p>
                    <p><span class="font-semibold">Contact:</span> ${request.contact_person || 'N/A'}</p>
                    <p><span class="font-semibold">Phone:</span> ${request.contact_phone || 'N/A'}</p>
                    <p><span class="font-semibold">Email:</span> ${request.contact_email || 'N/A'}</p>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-bold text-lg mb-2">Equipment Information</h4>
            <div class="space-y-3">
                <p><span class="font-semibold">Equipment Type:</span> ${request.equipment_type || 'N/A'}</p>
                <p><span class="font-semibold">Model:</span> ${request.equipment_model || request.printer_model || 'N/A'}</p>
                <p><span class="font-semibold">Serial Number:</span> ${request.equipment_serial || request.serial_number || 'N/A'}</p>
                <p><span class="font-semibold">Location in Building:</span> ${request.equipment_location || 'N/A'}</p>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-bold text-lg mb-2">Problem Description</h4>
            <div class="bg-gray-50 p-4 rounded-md">
                ${request.description || request.issue || 'No description provided.'}
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-bold text-lg mb-2">Service History</h4>
            <div class="max-h-48 overflow-y-auto">
                ${renderServiceHistory(request.history)}
            </div>
        </div>
    `;
    
    // Show/hide action buttons based on status
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    const completeRequestBtn = document.getElementById('completeRequestBtn');
    const reassignRequestBtn = document.getElementById('reassignRequestBtn');
    
    // Hide all buttons first
    updateStatusBtn.classList.add('hidden');
    completeRequestBtn.classList.add('hidden');
    reassignRequestBtn.classList.add('hidden');
    
    // Show appropriate buttons based on status
    if (['new', 'assigned', 'in_progress', 'on_hold'].includes(request.status)) {
        updateStatusBtn.classList.remove('hidden');
        completeRequestBtn.classList.remove('hidden');
        reassignRequestBtn.classList.remove('hidden');
    }
}

// Render service history timeline
function renderServiceHistory(history) {
    if (!history || history.length === 0) {
        return '<p class="text-gray-500">No history available</p>';
    }
    
    let historyHTML = '<div class="space-y-4">';
    
    history.forEach(entry => {
        const date = new Date(entry.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        historyHTML += `
            <div class="flex items-start">
                <div class="h-4 w-4 mt-1 rounded-full bg-blue-500 mr-3"></div>
                <div>
                    <p class="text-sm">
                        <span class="font-semibold">${date}</span>: 
                        Status changed from <span class="font-medium">${entry.previous_status.replace('_', ' ')}</span> 
                        to <span class="font-medium">${entry.new_status.replace('_', ' ')}</span>
                    </p>
                    ${entry.notes ? `<p class="text-sm text-gray-600 ml-1 mt-1">${entry.notes}</p>` : ''}
                    ${entry.user_name ? `<p class="text-xs text-gray-500 ml-1">By: ${entry.user_name} (${entry.role})</p>` : ''}
                </div>
            </div>
        `;
    });
    
    historyHTML += '</div>';
    return historyHTML;
}

// Update service request status
async function updateRequestStatus(requestId, status, notes) {
    try {
        // Get stored token
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`/api/technician/service-requests/${requestId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, notes })
            });
            
            if (response.status === 401) {
                // Handle unauthorized
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status');
            }
            
            // Success
            showToast('Status updated successfully');
        } catch (error) {
            console.error('API error:', error);
            
            // For demo purposes, simulate a successful update
            // Update the request in our local array
            const requestIndex = serviceRequests.findIndex(req => req.id == requestId);
            if (requestIndex !== -1) {
                const oldStatus = serviceRequests[requestIndex].status;
                serviceRequests[requestIndex].status = status;
                
                // Add to history
                if (!serviceRequests[requestIndex].history) {
                    serviceRequests[requestIndex].history = [];
                }
                
                serviceRequests[requestIndex].history.unshift({
                    id: Date.now(),
                    previous_status: oldStatus,
                    new_status: status,
                    notes: notes || `Status changed from ${oldStatus} to ${status}`,
                    created_at: new Date().toISOString(),
                    user_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Markivan Note',
                    role: 'technician'
                });
                
                showToast('Status updated successfully (Demo Mode)');
            } else {
                throw error;
            }
        }
        
        // Close the modal and refresh the list
        document.getElementById('updateStatusModal').classList.add('hidden');
        loadServiceRequests();
        
        // Also close the details modal
        document.getElementById('requestDetailsModal').classList.add('hidden');
    } catch (error) {
        console.error('Error updating status:', error);
        showToast(error.message, 'error');
    }
}

// Complete service request
async function completeRequest(requestId, formData) {
    try {
        // Validate required fields
        if (!formData.actions || !formData.signature) {
            throw new Error('Actions and signature are required');
        }
        
        // Get stored token
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`/api/technician/service-requests/${requestId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            if (response.status === 401) {
                // Handle unauthorized
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to complete request');
            }
            
            // Success
            showToast('Service request completed successfully');
        } catch (error) {
            console.error('API error:', error);
            
            // For demo purposes, simulate a successful completion
            // Update the request in our local array
            const requestIndex = serviceRequests.findIndex(req => req.id == requestId);
            if (requestIndex !== -1) {
                const oldStatus = serviceRequests[requestIndex].status;
                serviceRequests[requestIndex].status = 'completed';
                
                // Add to history
                if (!serviceRequests[requestIndex].history) {
                    serviceRequests[requestIndex].history = [];
                }
                
                serviceRequests[requestIndex].history.unshift({
                    id: Date.now(),
                    previous_status: oldStatus,
                    new_status: 'completed',
                    notes: formData.notes || 'Service request completed successfully',
                    created_at: new Date().toISOString(),
                    user_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Markivan Note',
                    role: 'technician'
                });
                
                showToast('Service request completed successfully (Demo Mode)');
            } else {
                throw error;
            }
        }
        
        // Close the modal and refresh the list
        document.getElementById('completeModal').classList.add('hidden');
        loadServiceRequests();
        
        // Also close the details modal
        document.getElementById('requestDetailsModal').classList.add('hidden');
    } catch (error) {
        console.error('Error completing request:', error);
        showToast(error.message, 'error');
    }
}

// Request reassignment
async function requestReassignment(requestId, reason, comments) {
    try {
        // Validate reason
        if (!reason) {
            throw new Error('Reason for reassignment is required');
        }
        
        // Get stored token
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`/api/technician/service-requests/${requestId}/reassign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason, comments })
            });
            
            if (response.status === 401) {
                // Handle unauthorized
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to request reassignment');
            }
            
            // Success
            showToast('Reassignment requested successfully');
        } catch (error) {
            console.error('API error:', error);
            
            // For demo purposes, simulate a successful reassignment request
            // Update the request in our local array
            const requestIndex = serviceRequests.findIndex(req => req.id == requestId);
            if (requestIndex !== -1) {
                const oldStatus = serviceRequests[requestIndex].status;
                serviceRequests[requestIndex].status = 'needs_reassignment';
                
                // Add to history
                if (!serviceRequests[requestIndex].history) {
                    serviceRequests[requestIndex].history = [];
                }
                
                serviceRequests[requestIndex].history.unshift({
                    id: Date.now(),
                    previous_status: oldStatus,
                    new_status: 'needs_reassignment',
                    notes: `REASSIGNMENT REQUESTED: Reason - ${reason}${comments ? '. ' + comments : ''}`,
                    created_at: new Date().toISOString(),
                    user_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Markivan Note',
                    role: 'technician'
                });
                
                showToast('Reassignment requested successfully (Demo Mode)');
            } else {
                throw error;
            }
        }
        
        // Close the modal and refresh the list
        document.getElementById('reassignModal').classList.add('hidden');
        loadServiceRequests();
        
        // Also close the details modal
        document.getElementById('requestDetailsModal').classList.add('hidden');
    } catch (error) {
        console.error('Error requesting reassignment:', error);
        showToast(error.message, 'error');
    }
}

// Initialize signature pad
function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    
    if (canvas) {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'white',
            penColor: 'black'
        });
        
        // Clear signature button
        document.getElementById('clearSignatureBtn').addEventListener('click', function() {
            signaturePad.clear();
        });
    }
}

// Helper functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getStatusClass(status) {
    switch (status) {
        case 'new': return 'bg-blue-100 text-blue-800';
        case 'assigned': return 'bg-indigo-100 text-indigo-800';
        case 'in_progress': return 'bg-yellow-100 text-yellow-800';
        case 'on_hold': return 'bg-orange-100 text-orange-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        case 'needs_reassignment': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-800';
        case 'high': return 'bg-orange-100 text-orange-800';
        case 'medium': return 'bg-blue-100 text-blue-800';
        case 'low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableContainer = document.getElementById('serviceRequestsTable');
    const emptyState = document.getElementById('emptyState');
    
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set color based on type
    if (type === 'error') {
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.remove('bg-red-500');
        toast.classList.add('bg-green-500');
    }
    
    // Show toast
    toast.classList.remove('translate-y-24');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-24');
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Filter and refresh
    document.getElementById('refreshBtn').addEventListener('click', loadServiceRequests);
    document.getElementById('statusFilter').addEventListener('change', loadServiceRequests);
    document.getElementById('priorityFilter').addEventListener('change', loadServiceRequests);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    });
    
    // Modal close buttons
    document.getElementById('closeModalBtn').addEventListener('click', function() {
        document.getElementById('requestDetailsModal').classList.add('hidden');
    });
    
    document.getElementById('updateStatusBtn').addEventListener('click', function() {
        document.getElementById('updateStatusModal').classList.remove('hidden');
    });
    
    document.getElementById('closeStatusModalBtn').addEventListener('click', function() {
        document.getElementById('updateStatusModal').classList.add('hidden');
    });
    
    document.getElementById('submitStatusBtn').addEventListener('click', function() {
        const status = document.getElementById('statusSelect').value;
        const notes = document.getElementById('statusNotes').value;
        updateRequestStatus(currentRequestId, status, notes);
    });
    
    document.getElementById('completeRequestBtn').addEventListener('click', function() {
        document.getElementById('completeModal').classList.remove('hidden');
        // Initialize signature pad when modal opens
        setTimeout(initSignaturePad, 100);
    });
    
    document.getElementById('closeCompleteModalBtn').addEventListener('click', function() {
        document.getElementById('completeModal').classList.add('hidden');
    });
    
    document.getElementById('addPartBtn').addEventListener('click', function() {
        const partsContainer = document.getElementById('partsContainer');
        const newPartRow = document.createElement('div');
        newPartRow.className = 'flex space-x-2';
        newPartRow.innerHTML = `
            <input type="text" class="part-name border border-gray-300 rounded-md px-3 py-2 w-3/4" placeholder="Part name">
            <input type="number" class="part-qty border border-gray-300 rounded-md px-3 py-2 w-1/4" placeholder="Qty" min="1" value="1">
        `;
        partsContainer.appendChild(newPartRow);
    });
    
    document.getElementById('submitCompleteBtn').addEventListener('click', function() {
        const actions = document.getElementById('actionsTaken').value;
        const notes = document.getElementById('additionalNotes').value;
        let signature = null;
        
        // Get signature if pad exists and is not empty
        if (signaturePad && !signaturePad.isEmpty()) {
            signature = signaturePad.toDataURL();
        }
        
        // Collect parts data
        const parts = [];
        const partNameInputs = document.querySelectorAll('.part-name');
        const partQtyInputs = document.querySelectorAll('.part-qty');
        
        for (let i = 0; i < partNameInputs.length; i++) {
            const name = partNameInputs[i].value.trim();
            const qty = parseInt(partQtyInputs[i].value, 10);
            
            if (name && !isNaN(qty) && qty > 0) {
                parts.push({ name, qty });
            }
        }
        
        const formData = {
            actions,
            notes,
            signature,
            parts
        };
        
        completeRequest(currentRequestId, formData);
    });
    
    document.getElementById('reassignRequestBtn').addEventListener('click', function() {
        document.getElementById('reassignModal').classList.remove('hidden');
    });
    
    document.getElementById('closeReassignModalBtn').addEventListener('click', function() {
        document.getElementById('reassignModal').classList.add('hidden');
    });
    
    document.getElementById('submitReassignBtn').addEventListener('click', function() {
        const reason = document.getElementById('reassignReason').value;
        const comments = document.getElementById('reassignNotes').value;
        requestReassignment(currentRequestId, reason, comments);
    });
}