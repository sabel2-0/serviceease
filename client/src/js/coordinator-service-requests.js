let assignedPrinters = [];

// Function to check and clean expired tokens
function checkAndCleanTokens() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Decode JWT token to check expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
                console.log('[AUTH] Token expired, clearing localStorage');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showToast('Your session has expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = '/client/src/pages/login.html';
                }, 2000);
                return false;
            }
            return true;
        } catch (error) {
            console.log('[AUTH] Invalid token format, clearing localStorage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return false;
        }
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    // Check tokens first before doing anything
    if (!checkAndCleanTokens()) {
        return; // Stop if tokens are invalid
    }
    
    setupModalHandlers();
    console.log('[DEBUG] DOMContentLoaded - initializing coordinator service requests page');
    loadCoordinatorData();
    initServiceRequestsPage();
    setupNewRequestForm(); // Add this line
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
}

/**
 * Initialize the service requests page
 */
function initServiceRequestsPage() {
    // Initialize search and filters
    const searchInput = document.getElementById('searchInput');
    const priorityFilter = document.getElementById('priorityFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAndDisplayByTab(currentTab));
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', () => filterAndDisplayByTab(currentTab));
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadServiceRequests);
    }
    
    // Set up tab event listeners
    const tabs = ['all', 'new', 'in-progress', 'pending-approval', 'completed'];
    tabs.forEach(tab => {
        const tabButton = document.getElementById(`tab-${tab}`);
        if (tabButton) {
            tabButton.addEventListener('click', () => filterAndDisplayByTab(tab));
        }
    });
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
    
    if (submitNewRequest && !submitNewRequest.dataset.listenerSet) {
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
            // if (!issueDescription || issueDescription.trim().length < 10) {
            //     showToast('Error: Please provide a detailed issue description (at least 10 characters).', 'error');
            //     return;
            // }

            try {
                // Get selected printer details using inventory_item_id
                const selectedPrinter = assignedPrinters.find(p => p.inventory_item_id == printerId);
                if (!selectedPrinter) {
                    showToast('Error: Invalid printer selected.', 'error');
                    return;
                }

                    // Prevent double submissions: disable the button immediately
                    submitNewRequest.disabled = true;

                    // Debug: count submits to detect duplicate firings
                    console.count('[DEBUG] submitNewRequest fired');

                    // Cap description length to avoid hitting unexpected validation in alternate routes
                    const maxDescLength = 2000; // reasonable cap for a long description
                    const safeDescription = (issueDescription || '').trim().slice(0, maxDescLength);

                    // Create service request object (server derives requested_by_user_id from auth token)
                    const serviceRequest = {
                        inventory_item_id: parseInt(printerId, 10), // This is inventory_item_id
                        institution_id: coordinatorData.institution_id,
                        priority: priority,
                        description: safeDescription,
                        location: location || selectedPrinter.location_note || '',
                        status: 'pending'
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
                    // Re-enable button so user can retry
                    submitNewRequest.disabled = false;
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
                // Ensure button is re-enabled on unexpected errors
                submitNewRequest.disabled = false;
            }
        });
        submitNewRequest.dataset.listenerSet = 'true';
    }
}

// Service request data and management
let serviceRequests = [];
let pendingApprovals = [];
let currentRequestId = null;
let currentApprovalId = null;
let currentTab = 'all'; // Track current active tab

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
            console.log('[DEBUG] Service requests received from API:', serviceRequests);
            // Log specific data for request 50 if it exists
            const request50 = serviceRequests.find(req => req.id === 50);
            if (request50) {
                console.log('[DEBUG] Request 50 data:', request50);
                console.log('[DEBUG] Request 50 started_at:', request50.started_at);
            }
        }
        
        updateStats(serviceRequests);
        filterAndDisplayByTab(currentTab);
        
    } catch (error) {
        console.error('Error loading service requests:', error);
        serviceRequests = []; // No sample data on error
        updateStats(serviceRequests);
        showEmptyState();
    }
}

// Sample data generation function has been removed

/**
 * Update request statistics and tab counts
 */
function updateStats(requests) {
    // Calculate stats
    const stats = {
        total: requests.length,
        new: requests.filter(r => r.status === 'new').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        pending_approval: requests.filter(r => r.status === 'pending_approval').length,
        completed: requests.filter(r => r.status === 'completed').length,
        active: requests.filter(r => ['new', 'in_progress', 'pending_approval'].includes(r.status)).length,
        monthly: requests.filter(r => {
            const requestDate = new Date(r.created_at);
            const currentDate = new Date();
            return requestDate.getMonth() === currentDate.getMonth() && 
                   requestDate.getFullYear() === currentDate.getFullYear();
        }).length
    };

    // Update tab counts
    document.getElementById('all-count').textContent = stats.total;
    document.getElementById('new-count').textContent = stats.new;
    document.getElementById('progress-count').textContent = stats.in_progress;
    document.getElementById('pending-approval-count').textContent = stats.pending_approval;
    document.getElementById('completed-count').textContent = stats.completed;
    
    // Update stats overview
    document.getElementById('totalRequests').textContent = stats.total;
    document.getElementById('activeRequests').textContent = stats.active;
    document.getElementById('completedRequests').textContent = stats.completed;
    document.getElementById('monthlyRequests').textContent = stats.monthly;
}

/**
 * Filter and display requests based on active tab
 */
function filterAndDisplayByTab(tab) {
    currentTab = tab;
    
    // Update tab appearance
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        btn.classList.add('text-gray-600');
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
        activeTab.classList.remove('text-gray-600');
    }
    
    // Filter requests based on tab
    let filteredRequests = serviceRequests;
    
    switch (tab) {
        case 'new':
            filteredRequests = serviceRequests.filter(r => r.status === 'new');
            break;
        case 'in-progress':
            filteredRequests = serviceRequests.filter(r => r.status === 'in_progress');
            break;
        case 'pending-approval':
            filteredRequests = serviceRequests.filter(r => r.status === 'pending_approval');
            break;
        case 'completed':
            filteredRequests = serviceRequests.filter(r => r.status === 'completed');
            break;
        case 'all':
        default:
            filteredRequests = serviceRequests;
            break;
    }
    
    // Apply additional filters (search, priority)
    filteredRequests = applyFilters(filteredRequests);
    
    if (filteredRequests.length === 0) {
        showEmptyState();
    } else {
        displayRequests(filteredRequests);
    }
}

/**
 * Apply search and priority filters
 */
function applyFilters(requests) {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const priority = document.getElementById('priorityFilter')?.value || '';
    
    return requests.filter(request => {
        // Match by search term
        const matchesSearch = !searchTerm || 
            request.id.toString().includes(searchTerm) ||
            (request.equipment_model && request.equipment_model.toLowerCase().includes(searchTerm)) ||
            (request.equipment_serial && request.equipment_serial.toLowerCase().includes(searchTerm)) ||
            request.description.toLowerCase().includes(searchTerm);
            
        // Match by priority
        const matchesPriority = !priority || request.priority === priority;
        
        return matchesSearch && matchesPriority;
    });
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
    console.log('[DEBUG] Creating card for request:', request.id, 'started_at:', request.started_at);
    
    const card = document.createElement('div');
    card.className = 'service-card bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 mb-6 fade-in';
    
    const statusColors = {
        new: 'bg-blue-100 text-blue-800',
        in_progress: 'bg-yellow-100 text-yellow-800',
        pending_approval: 'bg-orange-100 text-orange-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };

    const statusColor = statusColors[request.status] || 'bg-gray-100 text-gray-800';
    const formattedDate = new Date(request.created_at).toLocaleDateString();
    
    // Format start time if available
    let startTimeDisplay = '';
    console.log('[DEBUG] Request status:', request.status, 'started_at value:', request.started_at);
    
    if (request.started_at && request.started_at !== null) {
        console.log('[DEBUG] Service has started_at, formatting time...');
        const startTime = new Date(request.started_at);
        startTimeDisplay = `
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Service Started</h4>
            <p class="text-sm font-medium text-green-600">
                <i class="fas fa-play mr-1"></i>${startTime.toLocaleDateString()}
            </p>
            <p class="text-xs text-green-500">
                ${startTime.toLocaleTimeString()}
            </p>
        `;
    } else if (request.status === 'in_progress') {
        console.log('[DEBUG] Service is in_progress but no started_at time');
        startTimeDisplay = `
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Service Started</h4>
            <p class="text-sm font-medium text-gray-500">
                <i class="fas fa-clock mr-1"></i>Not recorded
            </p>
        `;
    } else {
        startTimeDisplay = `
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Service Status</h4>
            <p class="text-sm font-medium text-gray-600 capitalize">
                ${request.status.replace('_', ' ')}
            </p>
        `;
    }
    
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
        <div class="relative overflow-hidden">
            <!-- Status indicator bar -->
            <div class="absolute top-0 left-0 right-0 h-1 ${getStatusBarColor(request.status)}"></div>
            
            <div class="p-6 bg-gradient-to-br from-white to-gray-50">
                <!-- Header Section -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <div class="flex items-center space-x-2">
                                <div class="p-2 rounded-lg ${getStatusIconBg(request.status)}">
                                    <i class="${getStatusIcon(request.status)} ${getStatusIconColor(request.status)}"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900">
                                        ${printerInfo.model}
                                    </h3>
                                    <p class="text-sm text-gray-500">SN: ${printerInfo.serial_number}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 text-sm">
                            <span class="px-3 py-1 ${statusColor} rounded-full font-medium capitalize shadow-sm">
                                ${request.status.replace('_', ' ')}
                            </span>
                            <span class="text-gray-600 flex items-center">
                                <i class="fas fa-hashtag mr-1"></i>ID: ${request.id}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500 mb-1">Requested</p>
                        <p class="text-sm font-semibold text-gray-700">${formattedDate}</p>
                        <div class="mt-1">
                            ${getPriorityBadge(request.priority)}
                        </div>
                    </div>
                </div>

                <!-- Information Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div class="text-center md:text-left">
                            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Updated</h4>
                            <p class="text-sm font-medium text-gray-700">${new Date(request.updated_at || request.last_updated).toLocaleDateString()}</p>
                            <p class="text-xs text-gray-500">${new Date(request.updated_at || request.last_updated).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div class="text-center md:text-left">
                            ${startTimeDisplay}
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div class="text-center md:text-left">
                            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Location</h4>
                            <p class="text-sm font-medium text-gray-700 flex items-center">
                                <i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>
                                ${request.location || 'Not specified'}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Description Section -->
                <div class="bg-white rounded-lg p-4 border border-gray-100 shadow-sm mb-4">
                    <h4 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <i class="fas fa-tools mr-2 text-red-500"></i>Issue Description
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed">
                        ${request.description.length > 120 ? request.description.substring(0, 120) + '...' : request.description}
                    </p>
                </div>

                <!-- Action Section -->
                <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div class="text-sm text-gray-500">
                        <i class="fas fa-calendar mr-1"></i>
                        Created ${formatTimeAgo(request.created_at)}
                    </div>
                    ${request.status === 'pending_approval' ? `
                        <div class="flex space-x-2">
                            <button class="view-approval-btn px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg" data-id="${request.id}" style="background: linear-gradient(to right, #ea580c, #c2410c); color: #ffffff !important;">
                                <i class="fas fa-clipboard-check mr-2" style="color: #ffffff !important;"></i>Review & Approve
                            </button>
                        </div>
                    ` : `
                        <button class="view-details-btn px-6 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg" data-id="${request.id}" style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: #ffffff !important;">
                            <i class="fas fa-eye mr-2" style="color: #ffffff !important;"></i>View Details
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Add event listener to the view details button
    card.querySelector('.view-details-btn')?.addEventListener('click', () => {
        viewRequestDetails(request.id);
    });
    
    // Add event listener to the view approval button
    card.querySelector('.view-approval-btn')?.addEventListener('click', () => {
        viewApprovalDetails(request.id);
    });
    
    return card;
}

/**
 * Get status bar color for card top border
 */
function getStatusBarColor(status) {
    const colors = {
        'new': 'bg-blue-500',
        'in_progress': 'bg-yellow-500',
        'pending_approval': 'bg-orange-500',
        'completed': 'bg-green-500',
        'cancelled': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
    const icons = {
        'new': 'fas fa-plus',
        'in_progress': 'fas fa-cogs',
        'pending_approval': 'fas fa-clock',
        'completed': 'fas fa-check',
        'cancelled': 'fas fa-times'
    };
    return icons[status] || 'fas fa-question';
}

/**
 * Get status icon background color
 */
function getStatusIconBg(status) {
    const colors = {
        'new': 'bg-blue-100',
        'in_progress': 'bg-yellow-100',
        'pending_approval': 'bg-orange-100',
        'completed': 'bg-green-100',
        'cancelled': 'bg-red-100'
    };
    return colors[status] || 'bg-gray-100';
}

/**
 * Get status icon color
 */
function getStatusIconColor(status) {
    const colors = {
        'new': 'text-blue-600',
        'in_progress': 'text-yellow-600',
        'pending_approval': 'text-orange-600',
        'completed': 'text-green-600',
        'cancelled': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
}

/**
 * Get priority badge
 */
function getPriorityBadge(priority) {
    const badges = {
        'urgent': '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase">Urgent</span>',
        'high': '<span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase">High</span>',
        'medium': '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full uppercase">Medium</span>',
        'low': '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">Low</span>'
    };
    return badges[priority] || '<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase">Unknown</span>';
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
        return 'just now';
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
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
        let printerInfo = assignedPrinters.find(p => String(p.inventory_item_id) === String(request.inventory_item_id));
        if (!printerInfo) {
            printerInfo = {
                name: 'Unknown Printer',
                model: 'Unknown Model',
                serial_number: 'Unknown Serial',
                location_note: request.location || 'Unknown Location'
            };
        }
        
        // Format start time information
        let startTimeInfo = '';
        if (request.started_at) {
            const startTime = new Date(request.started_at);
            startTimeInfo = `
                <p><span class="font-medium">Service Started:</span> 
                    <span class="text-green-600">
                        <i class="fas fa-play-circle mr-1"></i>
                        ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}
                    </span>
                </p>
            `;
        } else if (request.status === 'in_progress') {
            startTimeInfo = `
                <p><span class="font-medium">Service Started:</span> 
                    <span class="text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        Not recorded
                    </span>
                </p>
            `;
        }
        
        // Format completion time information
        let completionTimeInfo = '';
        if (request.completed_at) {
            const completedTime = new Date(request.completed_at);
            completionTimeInfo = `
                <p><span class="font-medium">Service Completed:</span> 
                    <span class="text-green-600">
                        <i class="fas fa-check-circle mr-1"></i>
                        ${completedTime.toLocaleDateString()} at ${completedTime.toLocaleTimeString()}
                    </span>
                </p>
            `;
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
                            <p><span class="font-medium">Status:</span> <span class="capitalize">${request.status.replace('_', ' ')}</span></p>
                            <p><span class="font-medium">Created:</span> ${new Date(request.created_at).toLocaleDateString()} at ${new Date(request.created_at).toLocaleTimeString()}</p>
                            ${startTimeInfo}
                            ${completionTimeInfo}
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

/**
 * View approval details for a pending service completion
 */
async function viewApprovalDetails(requestId) {
    try {
        currentRequestId = requestId;
        
        // Find the request in our data
        const request = serviceRequests.find(req => req.id == requestId);
        
        if (!request || request.status !== 'pending_approval') {
            throw new Error('Service approval not found or not pending');
        }
        
        // First, fetch all pending approvals to get the approval ID
        const pendingResponse = await fetch(`/api/coordinator/service-approvals/pending`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!pendingResponse.ok) {
            console.error('Failed to fetch pending approvals:', pendingResponse.status, pendingResponse.statusText);
            throw new Error(`Failed to fetch pending approvals: ${pendingResponse.status} ${pendingResponse.statusText}`);
        }
        
        const approvals = await pendingResponse.json();
        console.log('[DEBUG] Pending approvals:', approvals);
        
        const approval = approvals.find(a => a.service_request_id == requestId);
        
        if (!approval) {
            console.error('Approval record not found for request ID:', requestId);
            console.error('Available approvals:', approvals.map(a => ({ id: a.approval_id, request_id: a.service_request_id })));
            throw new Error('Approval record not found');
        }
        
        currentApprovalId = approval.approval_id;
        console.log('[DEBUG] Found approval ID:', currentApprovalId);
        
        // Now fetch detailed approval information
        const detailsResponse = await fetch(`/api/coordinator/service-approvals/${currentApprovalId}/details`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!detailsResponse.ok) {
            console.error('Failed to fetch approval details:', detailsResponse.status, detailsResponse.statusText);
            // If details endpoint fails, use the basic approval data we already have
            console.log('[DEBUG] Using basic approval data instead of detailed data');
        }
        
        let approvalDetails = approval; // fallback to basic data
        let partsUsed = [];
        
        if (detailsResponse.ok) {
            const detailedData = await detailsResponse.json();
            approvalDetails = detailedData.approval;
            partsUsed = detailedData.parts_used || [];
        }
        
        // Find printer details
        let printerInfo = assignedPrinters.find(p => String(p.inventory_item_id) === String(request.inventory_item_id));
        if (!printerInfo) {
            printerInfo = {
                name: 'Unknown Printer',
                model: 'Unknown Model',
                serial_number: 'Unknown Serial',
                location_note: request.location || 'Unknown Location'
            };
        }
        
        // Format submission time
        const submittedTime = new Date(approval.submitted_at);
        
        // Parse parts used - handle both detailed and basic data
        let partsUsedDisplay = '';
        if (partsUsed.length > 0) {
            partsUsedDisplay = partsUsed.map(part => `<li class="text-sm text-gray-600">• ${part.part_name} (${part.quantity_used} ${part.unit})</li>`).join('');
        } else if (approval.parts_used) {
            partsUsedDisplay = approval.parts_used.split(', ').map(part => `<li class="text-sm text-gray-600">• ${part}</li>`).join('');
        } else {
            partsUsedDisplay = '<li class="text-sm text-gray-500">• No parts used</li>';
        }
        
        const approvalModalContent = document.getElementById('approvalModalContent');
        approvalModalContent.innerHTML = `
            <div class="space-y-4">
                <!-- Service Request Information - Compact -->
                <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 class="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                        <i class="fas fa-info-circle mr-2"></i>Service Request Information
                    </h4>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="space-y-1">
                            <p class="text-blue-700"><span class="font-medium">Request ID:</span> #${request.id}</p>
                            <p class="text-blue-700"><span class="font-medium">Priority:</span> <span class="capitalize">${request.priority}</span></p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-blue-700"><span class="font-medium">Printer:</span> ${printerInfo.model}</p>
                            <p class="text-blue-700"><span class="font-medium">Serial:</span> ${printerInfo.serial_number}</p>
                        </div>
                    </div>
                </div>

                <!-- Original Issue - Compact -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 mb-1 flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Original Issue
                    </h4>
                    <div class="bg-gray-50 p-3 rounded-lg border text-xs text-gray-700">
                        ${request.description}
                    </div>
                </div>

                <!-- Technician & Resolution - Combined and Compact -->
                <div class="bg-green-50 rounded-lg p-3 border border-green-200">
                    <h4 class="text-sm font-semibold text-green-900 mb-2 flex items-center">
                        <i class="fas fa-user-cog mr-2"></i>Service Completion
                    </h4>
                    <div class="space-y-1 text-xs text-green-700 mb-3">
                        <p><span class="font-medium">Technician:</span> ${approval.technician_first_name} ${approval.technician_last_name}</p>
                        <p><span class="font-medium">Submitted:</span> ${submittedTime.toLocaleDateString()} at ${submittedTime.toLocaleTimeString()}</p>
                    </div>
                    ${(approvalDetails.resolution_notes || approval.actions_performed) ? `
                    <div class="bg-white p-2 rounded border border-green-200 text-xs text-gray-700">
                        <p class="font-medium text-green-800 mb-1">Resolution:</p>
                        ${approvalDetails.resolution_notes || approval.actions_performed || 'No notes provided'}
                    </div>
                    ` : ''}
                </div>

                <!-- Parts Used - Compact -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 mb-1 flex items-center">
                        <i class="fas fa-cogs mr-2 text-orange-500"></i>Parts Used
                    </h4>
                    <div class="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <ul class="space-y-1 text-xs">
                            ${partsUsedDisplay}
                        </ul>
                    </div>
                </div>

                <!-- Approval Actions Guide - Compact -->
                <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <div class="text-xs text-yellow-800 space-y-1">
                        <p><strong>✅ Approve:</strong> Parts will be deducted from technician inventory</p>
                        <p><strong>❌ Reject:</strong> Request returns to technician; parts usage cleared</p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('approvalModal').classList.remove('hidden');
        
        // Set up approval action event listeners
        setupApprovalActions();
        
    } catch (error) {
        console.error('Error fetching approval details:', error);
        showToast('Failed to load approval details. Please try again.', 'error');
    }
}

/**
 * Set up approval action event listeners
 */
function setupApprovalActions() {
    // Remove any existing event listeners first
    const approveBtn = document.getElementById('approveServiceBtn');
    const rejectBtn = document.getElementById('rejectServiceBtn');
    const closeBtn = document.getElementById('closeApprovalModal');
    const closeBtnAlt = document.getElementById('closeApprovalModalBtn');
    
    // Clone and replace to remove all event listeners
    if (approveBtn) {
        const newApproveBtn = approveBtn.cloneNode(true);
        approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
        newApproveBtn.addEventListener('click', () => showApprovalActionModal('approve'));
    }
    
    if (rejectBtn) {
        const newRejectBtn = rejectBtn.cloneNode(true);
        rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
        newRejectBtn.addEventListener('click', () => showApprovalActionModal('reject'));
    }
    
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', hideApprovalModal);
    }
    
    if (closeBtnAlt) {
        const newCloseBtnAlt = closeBtnAlt.cloneNode(true);
        closeBtnAlt.parentNode.replaceChild(newCloseBtnAlt, closeBtnAlt);
        newCloseBtnAlt.addEventListener('click', hideApprovalModal);
    }
    
    // Set up approval action modal handlers (these are static)
    const closeActionModal = document.getElementById('closeApprovalActionModal');
    const cancelAction = document.getElementById('cancelApprovalAction');
    const confirmAction = document.getElementById('confirmApprovalAction');
    
    if (closeActionModal && !closeActionModal.hasAttribute('data-listener-set')) {
        closeActionModal.addEventListener('click', hideApprovalActionModal);
        closeActionModal.setAttribute('data-listener-set', 'true');
    }
    
    if (cancelAction && !cancelAction.hasAttribute('data-listener-set')) {
        cancelAction.addEventListener('click', hideApprovalActionModal);
        cancelAction.setAttribute('data-listener-set', 'true');
    }
    
    if (confirmAction && !confirmAction.hasAttribute('data-listener-set')) {
        confirmAction.addEventListener('click', confirmApprovalAction);
        confirmAction.setAttribute('data-listener-set', 'true');
    }
}

/**
 * Show approval action modal for approve/reject
 */
function showApprovalActionModal(action) {
    const modal = document.getElementById('approvalActionModal');
    const title = document.getElementById('approvalActionTitle');
    const label = document.getElementById('approvalNotesLabel');
    const required = document.getElementById('approvalNotesRequired');
    const helpText = document.getElementById('approvalNotesHelpText');
    const confirmBtn = document.getElementById('confirmApprovalAction');
    const notesTextarea = document.getElementById('approvalNotes');
    
    // Clear previous notes
    notesTextarea.value = '';
    
    if (action === 'approve') {
        title.textContent = 'Approve Service Completion';
        label.textContent = 'Approval Notes';
        required.classList.add('hidden');
        helpText.textContent = 'Optional notes for this approval';
        confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Approve Service';
        confirmBtn.className = 'bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105';
        confirmBtn.dataset.action = 'approve';
    } else {
        title.textContent = 'Reject Service Completion';
        label.textContent = 'Rejection Reason';
        required.classList.remove('hidden');
        helpText.textContent = 'Please provide a reason for rejection (required)';
        confirmBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Reject Service';
        confirmBtn.className = 'bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105';
        confirmBtn.dataset.action = 'reject';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Hide approval action modal
 */
function hideApprovalActionModal() {
    document.getElementById('approvalActionModal').classList.add('hidden');
    document.getElementById('approvalNotes').value = '';
}

/**
 * Confirm approval action (approve or reject)
 */
async function confirmApprovalAction() {
    try {
        const action = document.getElementById('confirmApprovalAction').dataset.action;
        const notes = document.getElementById('approvalNotes').value.trim();
        
        // Validate required fields
        if (action === 'reject' && !notes) {
            showToast('Please provide a reason for rejection', 'error');
            return;
        }
        
        // Make API call
        const endpoint = action === 'approve' ? 'approve' : 'reject';
        const response = await fetch(`/api/coordinator/service-approvals/${currentApprovalId}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ notes })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} service`);
        }
        
        const result = await response.json();
        
        // Close modals
        hideApprovalActionModal();
        hideApprovalModal();
        
        // Show success message
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        showToast(`Service completion ${actionText} successfully`, 'success');
        
        // Reload service requests to refresh the data
        loadServiceRequests();
        
    } catch (error) {
        console.error(`Error ${document.getElementById('confirmApprovalAction').dataset.action}ing service:`, error);
        showToast(`Failed to ${document.getElementById('confirmApprovalAction').dataset.action} service: ${error.message}`, 'error');
    }
}

/**
 * Hide approval modal
 */
function hideApprovalModal() {
    document.getElementById('approvalModal').classList.add('hidden');
    document.getElementById('approvalModalContent').innerHTML = '';
    currentApprovalId = null;
}

// Make functions accessible to the HTML page
window.viewRequestDetails = viewRequestDetails;
window.viewApprovalDetails = viewApprovalDetails;
window.loadAssignedPrinters = loadAssignedPrinters;
window.loadServiceRequests = loadServiceRequests;