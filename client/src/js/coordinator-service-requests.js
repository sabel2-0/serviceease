let assignedPrinters = [];
document.addEventListener('DOMContentLoaded', function() {
    setupModalHandlers();
    console.log('[DEBUG] DOMContentLoaded - initializing coordinator service requests page');
    loadCoordinatorData();
    initServiceRequestsPage();
    // Load assigned printers first, then service requests
    loadAssignedPrinters().then(() => {
        console.log('[DEBUG] Assigned printers loaded, now loading service requests');
        loadServiceRequests();
    });
});
console.log('[DEBUG] coordinator-service-requests.js loaded');
/**
 * Coordinator Service Requests Management
 * This script handles the service request functionality for coordinators,
 * displaying only printers assigned to their institut// Global variable to track loaded printers


/**
 * Load coordinator data from localStorage
 */
function loadCoordinatorData() {
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            coordinatorData = {
                id: user.id,
                email: user.email || '',
                institution_id: user.institution_id,
                institution_name: user.institution_name || 'Unknown Institution',
                first_name: user.first_name || '',
                last_name: user.last_name || ''
            };
            
            console.log('Coordinator data loaded:', coordinatorData);
            
            if (!coordinatorData.id || !coordinatorData.institution_id) {
                console.error('Missing critical coordinator data');
                showToast('Error: User data is incomplete. Please log in again.', 'error');
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            showToast('Error loading user data. Please log in again.', 'error');
        }
    } else {
        console.warn('No user data found in localStorage');
        showToast('Please log in to continue', 'error');
    }
}

/**
 * Update welcome message with coordinator info
 */
function updateWelcomeMessage() {
    const welcomeNameElement = document.getElementById('welcome-name');
    
    if (welcomeNameElement) {
        welcomeNameElement.textContent = coordinatorData.institution_name;
    }
}

/**
 * Set up event listeners for the modals
 */
function setupModalHandlers() {
    // New Request Modal
    const newRequestBtn = document.getElementById('new-service-request-btn');
    const newRequestModal = document.getElementById('newRequestModal');
    const cancelNewRequest = document.getElementById('cancelNewRequest');
    
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            console.log('[DEBUG] New Request button clicked');
            document.getElementById('newRequestModal').classList.remove('hidden');
            loadAssignedPrinters();
        });
    }
    
    if (cancelNewRequest) {
        cancelNewRequest.addEventListener('click', () => {
            document.getElementById('newRequestModal').classList.add('hidden');
        });
    }
    
    // Request Detail Modal
    const closeRequestModal = document.getElementById('closeRequestModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    if (closeRequestModal) {
        closeRequestModal.addEventListener('click', hideRequestModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideRequestModal);
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.fixed.inset-0').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    // Status Update Modal
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    const submitStatusUpdate = document.getElementById('submitStatusUpdate');
    const cancelStatusUpdate = document.getElementById('cancelStatusUpdate');
    
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', showStatusModal);
    }
    
    if (submitStatusUpdate) {
        submitStatusUpdate.addEventListener('click', handleStatusUpdate);
    }
    
    if (cancelStatusUpdate) {
        cancelStatusUpdate.addEventListener('click', hideStatusModal);
    }
}

/**
 * Initialize the service requests page
 */
function initServiceRequestsPage() {
    // Initialize search and filters
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterRequests);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRequests);
    }
    
        // Service type filter removed
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadServiceRequests);
    }
}

/**
 * Load printers assigned to the coordinator's institution
 */
function loadAssignedPrinters() {
    console.log('[DEBUG] loadAssignedPrinters called');
    console.log('Loading assigned printers...');
    const servicePrinterSelect = document.getElementById('servicePrinterSelect');
    if (!servicePrinterSelect) {
        console.error('Printer select dropdown not found');
        return;
    }

    // Get user data from localStorage
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
        console.error('[DEBUG] No user data found in localStorage');
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: User not logged in</option>';
        return;
    }
    let user;
    try {
        user = JSON.parse(userRaw);
    } catch (e) {
        console.error('[DEBUG] Failed to parse user data:', userRaw);
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: Invalid user data</option>';
        return;
    }
    if (!user.institution_id) {
        console.error('[DEBUG] Missing institution ID:', user);
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: Institution ID missing</option>';
        return;
    }

    console.log('[DEBUG] Loading printers for institution ID:', user.institution_id);
    servicePrinterSelect.innerHTML = '<option value="" selected>Loading printers...</option>';

    servicePrinterSelect.classList.add('w-full', 'px-4', 'py-2', 'border', 'rounded-md', 'bg-white', 'text-gray-900');

    fetch(`/api/institutions/${user.institution_id}/printers`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(res => {
        console.log('[DEBUG] Printer fetch response status:', res.status);
        if (!res.ok) {
            throw new Error('Failed to fetch printers');
        }
        return res.json();
    })
    .then(printers => {
        console.log('[DEBUG] Printers fetched:', printers);
        assignedPrinters = Array.isArray(printers) ? printers : [];

        servicePrinterSelect.innerHTML = '<option value="" selected disabled>Select a printer</option>';

        if (!assignedPrinters.length) {
            console.warn('[DEBUG] No printers returned for institution:', user.institution_id);
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No printers available for your institution";
            option.disabled = true;
            servicePrinterSelect.appendChild(option);
            return;
        }

        assignedPrinters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        assignedPrinters.forEach(printer => {
            console.log('[DEBUG] Adding printer option:', printer);
            const option = document.createElement('option');
            option.value = printer.inventory_item_id || printer.id;
            option.textContent = `${printer.name} - ${printer.model} (${printer.serial_number})`;
            servicePrinterSelect.appendChild(option);
        });

        servicePrinterSelect.classList.add('w-full', 'px-4', 'py-2', 'border', 'rounded-md', 'bg-white', 'text-gray-900');
    })
    .catch(error => {
        console.error('[DEBUG] Error loading assigned printers:', error);
        assignedPrinters = [];
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Failed to load printers</option>';
        showToast('Failed to load printers. Please try again.', 'error');
    });
}

/**
 * Set up the new service request form
 */
function setupNewRequestForm() {
    const submitNewRequest = document.getElementById('submitNewRequest');
    
    if (submitNewRequest) {
        submitNewRequest.addEventListener('click', async () => {
            // Get form values
            const printerId = document.getElementById('servicePrinterSelect').value;
            const location = document.getElementById('printerLocation').value;
            const priority = document.getElementById('priority').value;
            const issueDescription = document.getElementById('issueDescription').value;

            // Validate form
            if (!printerId || isNaN(printerId)) {
                showToast('Error: Please select a valid printer.', 'error');
                return;
            }
            if (!priority) {
                showToast('Error: Please select a priority.', 'error');
                return;
            }
            if (!issueDescription || issueDescription.trim().length < 10) {
                showToast('Error: Please provide a detailed issue description (at least 10 characters).', 'error');
                return;
            }

            try {
                // Get selected printer details using inventory_item_id
                const selectedPrinter = assignedPrinters.find(p => p.inventory_item_id == printerId);
                if (!selectedPrinter) {
                    showToast('Error: Invalid printer selected.', 'error');
                    return;
                }

                // Create service request object
                const serviceRequest = {
                    inventory_item_id: parseInt(printerId, 10), // This is inventory_item_id
                    institution_id: coordinatorData.institution_id,
                    coordinator_id: coordinatorData.id,
                    priority: priority,
                    description: issueDescription.trim(),
                    location: location || selectedPrinter.location_note || '',
                    status: 'new'
                };

                console.log('[DEBUG] Service request data to send:', serviceRequest);

                // Submit request to server
                const token = localStorage.getItem('token');
                const response = await fetch('/api/service-requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(serviceRequest)
                });
                const data = await response.json();

                if (!response.ok) {
                    let errorMsg = data.error || data.message || 'Failed to submit service request.';
                    showToast(`Error: ${errorMsg}`, 'error');
                    throw new Error(errorMsg);
                }

                // Log the request number from the backend response
                console.log('Generated request number from backend:', data.request_number);

                // Close modal and show success message
                document.getElementById('newRequestModal').classList.add('hidden');
                document.getElementById('newRequestForm').reset();

                showToast(`Service request ${data.request_number || ''} created successfully`, 'success');

                // Reload service requests
                loadServiceRequests();

            } catch (error) {
                console.error('Error submitting service request:', error);
                showToast(`Failed to submit service request: ${error.message}`, 'error');
            }
        });
    }
}

// Service request data and management
let serviceRequests = [];
let currentRequestId = null;

/**
 * Load service requests for the coordinator's institution
 */
async function loadServiceRequests() {
    try {
        showLoadingState();
        
        // Get token or use empty string if not available
        const authToken = localStorage.getItem('token') || '';
        
        // Fetch service requests for the coordinator's institution (correct endpoint)
        const response = await fetch(`/api/institutions/${coordinatorData.institution_id}/service-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            console.warn('Response not OK:', response.status);
            serviceRequests = []; // No sample data, just empty array
        } else {
            serviceRequests = await response.json();
        }
        
        updateStats(serviceRequests);
        
        if (serviceRequests.length === 0) {
            showEmptyState();
        } else {
            displayRequests(serviceRequests);
        }
    } catch (error) {
        console.error('Error loading service requests:', error);
        serviceRequests = []; // No sample data on error
        updateStats(serviceRequests);
        showEmptyState();
    }
}

// Sample data generation function has been removed

/**
 * Update request statistics
 */
function updateStats(requests) {
    // Reset all counters to zero first
    document.getElementById('newRequests').textContent = '0';
    document.getElementById('inProgressRequests').textContent = '0';
    document.getElementById('completedRequests').textContent = '0';
    document.getElementById('issueRequests').textContent = '0';
    
    // Only calculate stats if there are actual requests
    if (requests && requests.length > 0) {
        const stats = requests.reduce((acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {});

        document.getElementById('newRequests').textContent = stats.new || 0;
        document.getElementById('inProgressRequests').textContent = stats.in_progress || 0;
        document.getElementById('completedRequests').textContent = stats.completed || 0;
        document.getElementById('issueRequests').textContent = stats.issue || 0;
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('requestsContainer').classList.add('hidden');
}

/**
 * Show empty state
 */
function showEmptyState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('requestsContainer').classList.add('hidden');
}

/**
 * Display service requests
 */
function displayRequests(requests) {
    const requestsContainer = document.getElementById('requestsContainer');
    
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    requestsContainer.classList.remove('hidden');
    
    requestsContainer.innerHTML = '';
    
    requests.forEach(request => {
        const requestCard = createRequestCard(request);
        requestsContainer.appendChild(requestCard);
    });
}

/**
 * Create a service request card
 */
function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-4';
    
    const statusColors = {
        new: 'bg-blue-100 text-blue-800',
        in_progress: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        issue: 'bg-red-100 text-red-800'
    };

    const statusColor = statusColors[request.status] || 'bg-gray-100 text-gray-800';
    const formattedDate = new Date(request.created_at).toLocaleDateString();
    
    // Debugging: log assignedPrinters and request.inventory_item_id
    console.log('[DEBUG] assignedPrinters:', assignedPrinters);
    console.log('[DEBUG] request.inventory_item_id:', request.inventory_item_id);
    let printerInfo = assignedPrinters.find(p => String(p.inventory_item_id) === String(request.inventory_item_id));
    if (!printerInfo) {
        console.warn('[DEBUG] No matching printer found for inventory_item_id:', request.inventory_item_id);
        printerInfo = {
            name: 'Unknown Printer',
            model: 'Unknown Model',
            serial_number: 'Unknown Serial',
            location_note: request.location || 'Unknown Location'
        };
    }
    card.innerHTML = `
        <div class="p-6">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <div class="flex items-center space-x-3">
                        <h3 class="text-lg font-semibold text-gray-900">
                            ${printerInfo.model} (${printerInfo.serial_number})
                        </h3>
                        <span class="px-3 py-1 ${statusColor} rounded-full text-sm font-medium capitalize">
                            ${request.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">Service ID: ${request.id}</p>
                </div>
                <p class="text-sm text-gray-500">Requested: ${formattedDate}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-1">Priority</h4>
                    <p class="text-sm text-gray-600 capitalize">${request.priority}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-1">Last Updated</h4>
                    <p class="text-sm text-gray-600">${new Date(request.last_updated).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="border-t pt-4 flex justify-between items-center">
                <div class="text-sm text-gray-600 line-clamp-1">
                    <span class="font-medium">Issue:</span> ${request.description.substring(0, 50)}${request.description.length > 50 ? '...' : ''}
                </div>
                <button class="view-details-btn px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" data-id="${request.id}">
                    <i class="fas fa-info-circle mr-2"></i>View Details
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to the view details button
    card.querySelector('.view-details-btn').addEventListener('click', () => {
        viewRequestDetails(request.id);
    });
    
    return card;
}

/**
 * Filter service requests based on search term and filters
 */
function filterRequests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    const filteredRequests = serviceRequests.filter(request => {
        // Match by search term (printer model, serial, or request ID)
        const matchesSearch = !searchTerm || 
            (request.equipment_model && request.equipment_model.toLowerCase().includes(searchTerm)) ||
            (request.equipment_serial && request.equipment_serial.toLowerCase().includes(searchTerm)) ||
            request.id.toString().toLowerCase().includes(searchTerm) ||
            request.description.toLowerCase().includes(searchTerm);
            
        // Match by status
        const matchesStatus = !status || request.status === status;
        
        // Match by service type (if used)
            const matchesType = true; // Service type filter removed
        
        return matchesSearch && matchesStatus && matchesType;
    });
    
    if (filteredRequests.length === 0) {
        showEmptyState();
    } else {
        displayRequests(filteredRequests);
    }
}

/**
 * View service request details
 */
async function viewRequestDetails(requestId) {
    try {
        currentRequestId = requestId;
        
        // Find the request in our data
        const request = serviceRequests.find(req => req.id == requestId);
        
        if (!request) {
            throw new Error('Service request not found');
        }
        
        // Find printer details
        // let printerInfo = assignedPrinters.find(p => p.inventory_item_id == request.printer_id);
         let printerInfo = assignedPrinters.find(p => String(p.inventory_item_id) === String(request.inventory_item_id));
        if (!printerInfo) {
            printerInfo = {
                name: 'Unknown Printer',
                model: 'Unknown Model',
                serial_number: 'Unknown Serial',
                location_note: request.location || 'Unknown Location'
            };
        }
        
        const requestModalContent = document.getElementById('requestModalContent');
        requestModalContent.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Printer Information</h4>
                        <div class="text-sm space-y-2">
                            <p><span class="font-medium">Name:</span> ${printerInfo.name}</p>
                            <p><span class="font-medium">Model:</span> ${printerInfo.model}</p>
                            <p><span class="font-medium">Serial Number:</span> ${printerInfo.serial_number}</p>
                            <p><span class="font-medium">Location:</span> ${printerInfo.location_note}</p>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Service Information</h4>
                        <div class="text-sm space-y-2">
                            <p><span class="font-medium">ID:</span> ${request.id}</p>
                            <p><span class="font-medium">Priority:</span> ${request.priority}</p>
                            <p><span class="font-medium">Status:</span> ${request.status.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="text-lg font-medium text-gray-900 mb-2">Issue Description</h4>
                    <div class="text-sm bg-gray-50 p-4 rounded-lg">
                        ${request.description}
                    </div>
                </div>

                <div>
                    <h4 class="text-lg font-medium text-gray-900 mb-2">Service History</h4>
                    <div class="space-y-3">
                        ${request.history && request.history.length ? request.history.map(entry => `
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="flex justify-between text-sm">
                                    <span class="font-medium">${entry.status.replace('_', ' ')}</span>
                                    <span class="text-gray-500">${new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-1">${entry.notes || 'No notes provided'}</p>
                            </div>
                        `).join('') : `
                            <div class="text-center py-4 text-gray-500">
                                <p>No service history available for this request</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('requestModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching request details:', error);
        showToast('Failed to load request details. Please try again.', 'error');
    }
}

/**
 * Hide request details modal
 */
function hideRequestModal() {
    document.getElementById('requestModal').classList.add('hidden');
    document.getElementById('requestModalContent').innerHTML = '';
    currentRequestId = null;
}

/**
 * Show status update modal
 */
function showStatusModal() {
    if (!currentRequestId) return;
    document.getElementById('statusModal').classList.remove('hidden');
}

/**
 * Hide status update modal
 */
function hideStatusModal() {
    document.getElementById('statusModal').classList.add('hidden');
    document.getElementById('statusUpdateForm').reset();
}

/**
 * Handle service status update
 */
async function handleStatusUpdate() {
    if (!currentRequestId) return;

    const newStatus = document.getElementById('newStatus').value;
    const notes = document.getElementById('statusNotes').value;

    try {
        // In a real implementation, this would make an API call
        // For now, we'll just update our local data
        
        const requestIndex = serviceRequests.findIndex(req => req.id == currentRequestId);
        if (requestIndex !== -1) {
            // Update the request status
            serviceRequests[requestIndex].status = newStatus;
            serviceRequests[requestIndex].last_updated = new Date().toISOString();
            
            // Add to history
            if (!serviceRequests[requestIndex].history) {
                serviceRequests[requestIndex].history = [];
            }
            
            serviceRequests[requestIndex].history.push({
                status: newStatus,
                timestamp: new Date().toISOString(),
                notes: notes || 'Status updated'
            });
            
            hideStatusModal();
            hideRequestModal();
            
            // Refresh the display
            displayRequests(serviceRequests);
            updateStats(serviceRequests);
            
            showToast('Service request status updated successfully', 'success');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status. Please try again.', 'error');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `mb-3 p-4 rounded-lg shadow-lg flex items-center w-72 transform transition-all duration-300 ease-in-out translate-y-2 opacity-0 ${type === 'error' ? 'bg-red-500 text-white' : type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon} mr-3"></i>
        <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Make functions accessible to the HTML page
window.viewRequestDetails = viewRequestDetails;
window.loadAssignedPrinters = loadAssignedPrinters;
window.loadServiceRequests = loadServiceRequests;