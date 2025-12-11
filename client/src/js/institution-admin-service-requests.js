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
    setupPaginationHandlers(); // Add pagination handlers
    console.log('[DEBUG] DOMContentLoaded - initializing institutionAdmin service requests page');
    loadinstitutionAdminData();
    initServiceRequestsPage();
    setupNewRequestForm(); // Add this line
    // Load assigned printers first, then service requests
    loadAssignedPrinters().then(() => {
        console.log('[DEBUG] Assigned printers loaded, now loading service requests');
        loadServiceRequests().then(() => {
            // Check if there's an ID in the URL to open specific request
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');
            if (requestId) {
                console.log('[DEBUG] Opening request from URL:', requestId);
                // Wait a bit for the page to fully render
                setTimeout(() => {
                    const request = serviceRequests.find(r => r.id == requestId);
                    if (request) {
                        if (request.status === 'pending_approval') {
                            viewApprovalDetails(requestId);
                        } else {
                            viewRequestDetails(requestId);
                        }
                        // Remove the ID from URL without reloading
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }, 500);
            }
        });
    });
});
console.log('[DEBUG] institution_admin-service-requests.js loaded');
/**
 * institutionAdmin Service Requests Management
 * This script handles the service request functionality for institutionAdmins,
 * displaying only printers assigned to their institut// Global variable to track loaded printers


/**
 * Load institutionAdmin data from localStorage
 */
function loadinstitutionAdminData() {
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            institutionAdminData = {
                id: user.id,
                email: user.email || '',
                institution_id: user.institution_id,
                institution_name: user.institution_name || 'Unknown Institution',
                first_name: user.first_name || '',
                last_name: user.last_name || ''
            };
            
            console.log('institutionAdmin data loaded:', institutionAdminData);
            
            if (!institutionAdminData.id || !institutionAdminData.institution_id) {
                console.error('Missing critical institutionAdmin data');
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
 * Update welcome message with institutionAdmin info
 */
function updateWelcomeMessage() {
    const welcomeNameElement = document.getElementById('welcome-name');
    
    if (welcomeNameElement) {
        welcomeNameElement.textContent = institutionAdminData.institution_name;
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
    
    // Close modal when clicking backdrop
    const requestModalBackdrop = document.getElementById('requestModalBackdrop');
    if (requestModalBackdrop) {
        requestModalBackdrop.addEventListener('click', hideRequestModal);
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
 * Load printers assigned to the institutionAdmin's institution
 */
function loadAssignedPrinters() {
    console.log('[DEBUG] loadAssignedPrinters called');
    console.log('Loading assigned printers...');
    const servicePrinterSelect = document.getElementById('servicePrinterSelect');
    if (!servicePrinterSelect) {
        console.error('Printer select dropdown not found');
        return Promise.resolve();
    }

    // Get user data from localStorage
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
        console.error('[DEBUG] No user data found in localStorage');
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: User not logged in</option>';
        return Promise.resolve();
    }
    let user;
    try {
        user = JSON.parse(userRaw);
    } catch (e) {
        console.error('[DEBUG] Failed to parse user data:', userRaw);
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: Invalid user data</option>';
        return Promise.resolve();
    }
    if (!user.institution_id) {
        console.error('[DEBUG] Missing institution ID:', user);
        servicePrinterSelect.innerHTML = '<option value="" disabled selected>Error: Institution ID missing</option>';
        return Promise.resolve();
    }

    console.log('[DEBUG] Loading printers for institution ID:', user.institution_id);
    servicePrinterSelect.innerHTML = '<option value="" selected>Loading printers...</option>';

    servicePrinterSelect.classList.add('w-full', 'px-4', 'py-2', 'border', 'rounded-md', 'bg-white', 'text-gray-900');

    return fetch(`/api/institutions/${user.institution_id}/printers`, {
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
            option.value = printer.printer_id || printer.id;
            option.textContent = `${printer.name} - ${printer.model} (${printer.serial_number})`;
            option.dataset.location = printer.location || ''; // Store location in dataset
            servicePrinterSelect.appendChild(option);
        });

        servicePrinterSelect.classList.add('w-full', 'px-4', 'py-2', 'border', 'rounded-md', 'bg-white', 'text-gray-900');
        
        // Add event listener to auto-fill location when printer is selected
        servicePrinterSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const locationInput = document.getElementById('printerLocation');
            const locationRequired = document.getElementById('locationRequired');
            const locationHint = document.getElementById('locationHint');
            
            if (selectedOption && locationInput) {
                const printerLocation = selectedOption.dataset.location || '';
                locationInput.value = printerLocation;
                
                if (printerLocation) {
                    console.log('[DEBUG] Auto-filled location:', printerLocation);
                    locationInput.placeholder = printerLocation;
                    locationInput.required = false;
                    if (locationRequired) locationRequired.classList.add('hidden');
                    if (locationHint) locationHint.textContent = 'Current printer location (you can update it)';
                } else {
                    console.log('[DEBUG] No location set for this printer - admin must enter it');
                    locationInput.placeholder = 'e.g., Building A, 2nd Floor, Room 201, IT Department';
                    locationInput.required = true;
                    if (locationRequired) locationRequired.classList.remove('hidden');
                    if (locationHint) locationHint.textContent = 'Required - This will become the printer\'s permanent location';
                }
            }
        });
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
            
            // Check if location is required (when printer doesn't have a saved location)
            const locationInput = document.getElementById('printerLocation');
            if (locationInput && locationInput.required && (!location || location.trim().length === 0)) {
                showToast('Error: Please enter the printer location. This will be saved for future requests.', 'error');
                locationInput.focus();
                return;
            }
            
            // if (!issueDescription || issueDescription.trim().length < 10) {
            //     showToast('Error: Please provide a detailed issue description (at least 10 characters).', 'error');
            //     return;
            // }

            try {
                // Get selected printer details using printer_id
                const selectedPrinter = assignedPrinters.find(p => p.printer_id == printerId);
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

                    // Create service request object (server derives requested_by from auth token)
                    const serviceRequest = {
                        printer_id: parseInt(printerId, 10), // Server expects printer_id (snake_case)
                        institution_id: institutionAdminData.institution_id,
                        priority: priority,
                        description: safeDescription,
                        location: (location && location.trim()) ? location.trim() : null,
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

// Pagination variables
let currentPage = 1;
const itemsPerPage = 6; // 2 rows of 3 cards each
let filteredRequests = [];
let totalPages = 0;

/**
 * Load service requests for the institutionAdmin's institution
 */
async function loadServiceRequests() {
    try {
        showLoadingState();
        
        // Get token or use empty string if not available
        const authToken = localStorage.getItem('token') || '';
        
        // Fetch service requests for the institutionAdmin's institution (correct endpoint)
        const response = await fetch(`/api/institutions/${institutionAdminData.institution_id}/service-requests`, {
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
        new: requests.filter(r => r.status === 'pending' || r.status === 'new').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        pending_approval: requests.filter(r => r.status === 'pending_approval').length,
        completed: requests.filter(r => r.status === 'completed').length,
        active: requests.filter(r => ['new', 'pending', 'in_progress', 'pending_approval'].includes(r.status)).length,
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
    currentPage = 1; // Reset to first page when changing tabs
    
    // Update tab appearance with new modern design
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-md', 'border-blue-500', 'text-yellow-600', 'border-yellow-500', 'text-orange-600', 'border-orange-500', 'text-green-600', 'border-green-500');
        btn.classList.add('bg-gray-50', 'text-gray-600', 'border-transparent');
        
        // Reset all count badges to default style with better visibility
        const countBadge = btn.querySelector('span[id$="-count"]');
        if (countBadge) {
            countBadge.classList.remove('bg-blue-600', 'text-white', 'bg-yellow-600', 'bg-orange-600', 'bg-green-600', 'bg-blue-100', 'text-blue-600', 'bg-yellow-100', 'text-yellow-700', 'bg-orange-100', 'text-orange-700', 'bg-green-100', 'text-green-700');
            // Default inactive state
            const btnId = btn.id;
            if (btnId.includes('all') || btnId.includes('new')) {
                countBadge.classList.add('bg-blue-100', 'text-blue-700');
            } else if (btnId.includes('progress')) {
                countBadge.classList.add('bg-yellow-100', 'text-yellow-700');
            } else if (btnId.includes('pending')) {
                countBadge.classList.add('bg-orange-100', 'text-orange-700');
            } else if (btnId.includes('completed')) {
                countBadge.classList.add('bg-green-100', 'text-green-700');
            }
        }
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.remove('bg-gray-50', 'text-gray-600', 'border-transparent');
        activeTab.classList.add('bg-white', 'shadow-md');
        
        // Style active tab based on type with high contrast badges
        const countBadge = activeTab.querySelector('span[id$="-count"]');
        
        switch(tab) {
            case 'all':
                activeTab.classList.add('text-blue-600', 'border-blue-500');
                if (countBadge) {
                    countBadge.classList.remove('bg-blue-100', 'text-blue-700');
                    countBadge.classList.add('bg-blue-600', 'text-white', 'shadow-md');
                }
                break;
            case 'new':
                activeTab.classList.add('text-blue-600', 'border-blue-500');
                if (countBadge) {
                    countBadge.classList.remove('bg-blue-100', 'text-blue-700');
                    countBadge.classList.add('bg-blue-600', 'text-white', 'shadow-md');
                }
                break;
            case 'in-progress':
                activeTab.classList.add('text-yellow-600', 'border-yellow-500');
                if (countBadge) {
                    countBadge.classList.remove('bg-yellow-100', 'text-yellow-700');
                    countBadge.classList.add('bg-yellow-600', 'text-white', 'shadow-md');
                }
                break;
            case 'pending-approval':
                activeTab.classList.add('text-orange-600', 'border-orange-500');
                if (countBadge) {
                    countBadge.classList.remove('bg-orange-100', 'text-orange-700');
                    countBadge.classList.add('bg-orange-600', 'text-white', 'shadow-md');
                }
                break;
            case 'completed':
                activeTab.classList.add('text-green-600', 'border-green-500');
                if (countBadge) {
                    countBadge.classList.remove('bg-green-100', 'text-green-700');
                    countBadge.classList.add('bg-green-600', 'text-white', 'shadow-md');
                }
                break;
        }
    }
    
    // Filter requests based on tab
    filteredRequests = serviceRequests;
    
    switch (tab) {
        case 'new':
            filteredRequests = serviceRequests.filter(r => r.status === 'pending' || r.status === 'new');
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
    
    // Calculate total pages
    totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    
    if (filteredRequests.length === 0) {
        showEmptyState();
        hidePagination();
    } else {
        displayRequests(filteredRequests);
        updatePaginationUI();
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
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRequests = requests.slice(startIndex, endIndex);
    
    console.log(`[PAGINATION] Displaying page ${currentPage} of ${totalPages}, showing ${paginatedRequests.length} items (${startIndex}-${endIndex} of ${requests.length})`);
    
    // Create a grid container for 3 columns
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    
    paginatedRequests.forEach(request => {
        const requestCard = createRequestCard(request);
        gridContainer.appendChild(requestCard);
    });
    
    requestsContainer.appendChild(gridContainer);
    
    // Show pagination controls if needed
    if (requests.length > itemsPerPage) {
        showPagination();
    } else {
        hidePagination();
    }
}

/**
 * Create a service request card
 */
function createRequestCard(request) {
    console.log('[DEBUG] Creating card for request:', request.id, 'started_at:', request.started_at);
    
    const card = document.createElement('div');
    card.className = 'service-card transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer';
    
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
    
    // Use printer info from the request itself (includes brand, model, serial_number)
    // Fallback to assignedPrinters lookup if needed
    let printerInfo = {
        name: request.equipment_name || request.printer_name || 'Unknown Printer',
        brand: request.brand || request.printer_brand || '',
        model: request.model || request.printer_model || '',
        serial_number: request.serial_number || request.equipment_serial || request.printer_serial_number || 'Unknown Serial',
        location_note: request.location || 'Unknown Location'
    };
    
    // If we don't have printer info from request, try to find it in assignedPrinters
    if (!request.equipment_name && !request.printer_name && !request.brand) {
        console.log('[DEBUG] assignedPrinters:', assignedPrinters);
        console.log('[DEBUG] request.printer_id:', request.printer_id);
        const foundPrinter = assignedPrinters.find(p => String(p.printer_id) === String(request.printer_id));
        if (foundPrinter) {
            printerInfo = {
                name: foundPrinter.name || 'Unknown Printer',
                brand: foundPrinter.brand || '',
                model: foundPrinter.model || '',
                serial_number: foundPrinter.serial_number || 'Unknown Serial',
                location_note: request.location || foundPrinter.location_note || 'Unknown Location'
            };
        } else {
            console.warn('[DEBUG] No matching printer found for printer_id:', request.printer_id);
        }
    }
    
    card.innerHTML = `
        <div class="relative overflow-hidden rounded-xl border-2 border-gray-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-gray-100 to-gray-50">
            <!-- Gradient status bar -->
            <div class="absolute top-0 left-0 right-0 h-2 ${getStatusGradient(request.status)}"></div>
            
            <!-- Card content -->
            <div class="relative">
                <div class="p-6 pt-8">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-5">
                        <div class="flex items-center space-x-4 flex-1 min-w-0">
                            <!-- Icon badge -->
                            <div class="flex-shrink-0 p-3 ${getStatusIconBg(request.status)} rounded-xl shadow-md border-2 border-gray-300">
                                <i class="${getStatusIcon(request.status)} ${getStatusIconColor(request.status)} text-lg"></i>
                            </div>
                            
                            <!-- Printer info -->
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-bold text-gray-900 truncate mb-1">
                                    ${printerInfo.name || printerInfo.model || 'Unknown Printer'}
                                </h3>
                                <p class="text-sm text-gray-700 truncate">
                                    ${printerInfo.brand && printerInfo.model ? `${printerInfo.brand} ${printerInfo.model} • ` : ''}<span class="text-gray-600">Serial: ${printerInfo.serial_number}</span>
                                </p>
                            </div>
                        </div>
                        
                        <!-- Priority badge -->
                        <div class="flex-shrink-0 ml-3">
                            ${(() => {
                                console.log('[DEBUG] Request #' + request.id + ' priority:', request.priority, 'type:', typeof request.priority);
                                return getPriorityBadgeMedium(request.priority);
                            })()}
                        </div>
                    </div>

                    <!-- Status and ID badges -->
                    <div class="flex items-center gap-3 mb-5">
                        <span class="inline-flex items-center px-4 py-2 rounded-lg font-bold text-sm shadow-md" style="background-color: ${getStatusBadgeColor(request.status)} !important; color: white !important;">
                            ${request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg font-semibold text-sm" style="background-color: #dbeafe !important; color: #1e3a8a !important; border: 2px solid #93c5fd;">
                            <i class="fas fa-hashtag mr-1.5"></i>#${request.id}
                        </span>
                        <span class="ml-auto text-sm font-semibold" style="color: #374151 !important;">
                            <i class="far fa-calendar-alt mr-1.5"></i>${formattedDate}
                        </span>
                    </div>

                    <!-- Description -->
                    <div class="mb-5 p-4 bg-gradient-to-r from-gray-200 to-blue-100 rounded-xl border-2 border-gray-300 shadow-sm">
                        <div class="flex items-start space-x-3">
                            <div class="flex-shrink-0 mt-0.5">
                                <i class="fas fa-tools text-red-600 text-base"></i>
                            </div>
                            <p class="text-sm text-gray-900 font-medium leading-relaxed break-words line-clamp-2 flex-1">
                                ${request.description}
                            </p>
                        </div>
                    </div>

                    <!-- Info grid -->
                    <div class="grid grid-cols-2 gap-4 mb-5">
                        <div class="flex items-center p-3 bg-purple-200 rounded-xl border-2 border-purple-400 shadow-sm">
                            <i class="fas fa-map-marker-alt text-purple-800 mr-3 flex-shrink-0 text-base"></i>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-purple-900 font-bold truncate">${request.location || 'Not specified'}</p>
                            </div>
                        </div>
                        <div class="flex items-center p-3 ${request.started_at ? 'bg-green-200 border-green-400' : 'bg-gray-200 border-gray-400'} rounded-xl border-2 shadow-sm">
                            <i class="far fa-clock ${request.started_at ? 'text-green-800' : 'text-gray-800'} mr-3 flex-shrink-0 text-base"></i>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm ${request.started_at ? 'text-green-900' : 'text-gray-900'} font-bold truncate">
                                    ${request.started_at ? new Date(request.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Technician Info -->
                    ${(() => {
                        console.log('[DEBUG] Technician check - Status:', request.status, 'Technician Name:', request.technician_name);
                        if ((request.status === 'in_progress' || request.status === 'pending_approval' || request.status === 'completed') && request.technician_name) {
                            return `
                    <div class="mb-5 p-3 bg-blue-50 rounded-xl border-2 border-blue-300 shadow-sm">
                        <div class="flex items-center">
                            <i class="fas fa-user-cog text-blue-700 mr-3 text-base"></i>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs text-blue-600 font-semibold uppercase mb-0.5">Technician</p>
                                <p class="text-sm text-blue-900 font-bold truncate">${request.technician_name}</p>
                            </div>
                        </div>
                    </div>`;
                        }
                        return '';
                    })()}

                    <!-- Action button -->
                    ${request.status === 'pending_approval' ? `
                        <button class="view-approval-btn w-full px-5 py-3 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center space-x-2 text-base font-bold" style="background: linear-gradient(to right, #ea580c, #c2410c) !important; color: white !important;" data-id="${request.id}">
                            <i class="fas fa-clipboard-check" style="color: white !important;"></i>
                            <span style="color: white !important;">Review & Approve</span>
                        </button>
                    ` : `
                        <button class="view-details-btn w-full px-5 py-3 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center space-x-2 text-base font-bold" style="background: linear-gradient(to right, #2563eb, #1d4ed8) !important; color: white !important;" data-id="${request.id}">
                            <i class="fas fa-eye" style="color: white !important;"></i>
                            <span style="color: white !important;">View Details</span>
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
 * Get status gradient for top bar
 */
function getStatusGradient(status) {
    const gradients = {
        'new': 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600',
        'in_progress': 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600',
        'pending_approval': 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600',
        'completed': 'bg-gradient-to-r from-green-400 via-green-500 to-green-600',
        'cancelled': 'bg-gradient-to-r from-red-400 via-red-500 to-red-600'
    };
    return gradients[status] || 'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600';
}

/**
 * Get status gradient classes for badges
 */
function getStatusGradientClasses(status) {
    const gradients = {
        'new': 'from-blue-500 to-blue-600',
        'in_progress': 'from-yellow-500 to-yellow-600',
        'pending_approval': 'from-orange-500 to-orange-600',
        'completed': 'from-green-500 to-green-600',
        'cancelled': 'from-red-500 to-red-600'
    };
    return gradients[status] || 'from-gray-500 to-gray-600';
}

/**
 * Get status badge classes with high contrast text
 */
function getStatusBadgeClasses(status) {
    const badges = {
        'new': 'bg-blue-700 text-white',
        'in_progress': 'bg-orange-600 text-white',
        'pending_approval': 'bg-orange-700 text-white',
        'completed': 'bg-green-700 text-white',
        'cancelled': 'bg-red-700 text-white'
    };
    return badges[status] || 'bg-gray-700 text-white';
}

/**
 * Get status badge background color (hex values)
 */
function getStatusBadgeColor(status) {
    const colors = {
        'new': '#1d4ed8',
        'in_progress': '#ea580c',
        'pending_approval': '#c2410c',
        'completed': '#15803d',
        'cancelled': '#b91c1c'
    };
    return colors[status] || '#374151';
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
    const icons = {
        'new': 'fas fa-plus-circle',
        'in_progress': 'fas fa-sync-alt',
        'pending_approval': 'fas fa-hourglass-half',
        'completed': 'fas fa-check-circle',
        'cancelled': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-question-circle';
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
 * Get status gradient banner for modal
 */
function getStatusGradientBanner(status) {
    const gradients = {
        'new': 'from-blue-500 to-blue-600',
        'in_progress': 'from-yellow-500 to-orange-500',
        'pending_approval': 'from-orange-500 to-red-500',
        'completed': 'from-green-500 to-emerald-600',
        'cancelled': 'from-red-500 to-red-700'
    };
    return gradients[status] || 'from-gray-500 to-gray-600';
}

/**
 * Get priority text color
 */
function getPriorityColor(priority) {
    const colors = {
        'urgent': 'text-red-600',
        'high': 'text-orange-600',
        'medium': 'text-yellow-600',
        'low': 'text-green-600'
    };
    return colors[priority?.toLowerCase()] || 'text-gray-600';
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
 * Get compact priority badge
 */
function getPriorityBadgeCompact(priority) {
    const badges = {
        'urgent': `
            <div class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 rounded-md shadow-sm">
                <i class="fas fa-exclamation-triangle text-white text-xs mr-1"></i>
                <span class="text-white font-bold text-xs">URGENT</span>
            </div>
        `,
        'high': `
            <div class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-md shadow-sm">
                <i class="fas fa-arrow-up text-white text-xs mr-1"></i>
                <span class="text-white font-bold text-xs">HIGH</span>
            </div>
        `,
        'medium': `
            <div class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-md shadow-sm">
                <i class="fas fa-minus text-white text-xs mr-1"></i>
                <span class="text-white font-bold text-xs">MED</span>
            </div>
        `,
        'low': `
            <div class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 rounded-md shadow-sm">
                <i class="fas fa-arrow-down text-white text-xs mr-1"></i>
                <span class="text-white font-bold text-xs">LOW</span>
            </div>
        `
    };
    return badges[priority] || `
        <div class="inline-flex items-center px-2 py-1 bg-gradient-to-r from-gray-500 to-gray-600 rounded-md shadow-sm">
            <i class="fas fa-question text-white text-xs mr-1"></i>
            <span class="text-white font-bold text-xs">N/A</span>
        </div>
    `;
}

/**
 * Get medium priority badge
 */
function getPriorityBadgeMedium(priority) {
    // Handle null, undefined, or empty priority
    if (!priority || priority === 'null' || priority === 'undefined') {
        return `
            <div class="inline-flex items-center px-3 py-1.5 bg-gray-600 rounded-lg shadow-md" style="background-color: #4b5563 !important;">
                <i class="fas fa-question text-white text-sm mr-1.5" style="color: white !important;"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">No Priority</span>
            </div>
        `;
    }
    
    const badges = {
        'urgent': `
            <div class="inline-flex items-center px-3 py-1.5 bg-red-600 rounded-lg shadow-md" style="background-color: #dc2626 !important;">
                <i class="fas fa-exclamation-triangle text-white text-sm mr-1.5" style="color: white !important;"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">Urgent</span>
            </div>
        `,
        'high': `
            <div class="inline-flex items-center px-3 py-1.5 bg-orange-600 rounded-lg shadow-md" style="background-color: #ea580c !important;">
                <i class="fas fa-arrow-up text-white text-sm mr-1.5" style="color: white !important;"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">High</span>
            </div>
        `,
        'medium': `
            <div class="inline-flex items-center px-3 py-1.5 bg-yellow-600 rounded-lg shadow-md" style="background-color: #ca8a04 !important;">
                <i class="fas fa-minus text-white text-sm mr-1.5" style="color: white !important;"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">Medium</span>
            </div>
        `,
        'low': `
            <div class="inline-flex items-center px-3 py-1.5 bg-green-600 rounded-lg shadow-md" style="background-color: #16a34a !important;">
                <i class="fas fa-arrow-down text-white text-sm mr-1.5" style="color: white !important;"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">Low</span>
            </div>
        `
    };
    
    return badges[priority.toLowerCase()] || `
        <div class="inline-flex items-center px-3 py-1.5 bg-gray-600 rounded-lg shadow-md" style="background-color: #4b5563 !important;">
            <i class="fas fa-question text-white text-sm mr-1.5" style="color: white !important;"></i>
            <span class="text-white font-bold text-xs uppercase tracking-wide" style="color: white !important;">Unknown</span>
        </div>
    `;
}

/**
 * Get enhanced priority badge with modern styling
 */
function getPriorityBadgeEnhanced(priority) {
    const badges = {
        'urgent': `
            <div class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg">
                <i class="fas fa-exclamation-triangle text-white mr-2"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide">Urgent</span>
            </div>
        `,
        'high': `
            <div class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <i class="fas fa-arrow-up text-white mr-2"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide">High</span>
            </div>
        `,
        'medium': `
            <div class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                <i class="fas fa-minus text-white mr-2"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide">Medium</span>
            </div>
        `,
        'low': `
            <div class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                <i class="fas fa-arrow-down text-white mr-2"></i>
                <span class="text-white font-bold text-xs uppercase tracking-wide">Low</span>
            </div>
        `
    };
    return badges[priority] || `
        <div class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl shadow-lg">
            <i class="fas fa-question text-white mr-2"></i>
            <span class="text-white font-bold text-xs uppercase tracking-wide">Unknown</span>
        </div>
    `;
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
        
        // Debug log approver info
        console.log('[DEBUG] Request approver info:', {
            id: request.id,
            status: request.status,
            approver_first_name: request.approver_first_name,
            approver_last_name: request.approver_last_name,
            approver_role: request.approver_role,
            resolution_notes: request.resolution_notes
        });
        
        // Extract approver from resolution_notes if approver fields are undefined
        let approverName = null;
        let approverRole = null;
        if (request.status === 'completed' && request.resolution_notes && !request.approver_first_name) {
            const match = request.resolution_notes.match(/Approved by ([^-]+) - (.+?)(?:\.|$)/);
            if (match) {
                approverRole = match[1].trim();
                approverName = match[2].trim();
            }
        } else if (request.approver_first_name) {
            approverName = `${request.approver_first_name} ${request.approver_last_name}`;
            approverRole = request.approver_role ? request.approver_role.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
        }
        
        // Find printer details
        let printerInfo = assignedPrinters.find(p => String(p.printer_id) === String(request.printer_id));
        if (!printerInfo) {
            printerInfo = {
                name: request.equipment_name || 'Unknown Printer',
                model: request.model || 'Unknown Model',
                serial_number: request.serial_number || 'Unknown Serial',
                location: request.location || 'Not specified'
            };
        } else {
            // Ensure location is set from request if available
            printerInfo.location = request.location || printerInfo.location || 'Not specified';
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto">
                <!-- Left Column -->
                <div class="space-y-3">
                <!-- Status Banner -->
                <div class="bg-gradient-to-r ${getStatusGradientBanner(request.status)} rounded-lg p-3 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <div class="bg-white/20 rounded-full p-2">
                                <i class="${getStatusIcon(request.status)} text-lg"></i>
                            </div>
                            <div>
                                <p class="text-xs font-medium opacity-90">Status</p>
                                <p class="text-base font-bold capitalize">${request.status.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-medium opacity-90">ID</p>
                            <p class="text-base font-bold">#${request.id}</p>
                        </div>
                    </div>
                </div>

                <!-- Info Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- Printer Card -->
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                        <div class="flex items-center mb-2">
                            <div class="bg-purple-600 rounded-lg p-1.5 mr-2">
                                <i class="fas fa-print text-white text-xs"></i>
                            </div>
                            <h4 class="text-sm font-bold text-purple-900">Printer</h4>
                        </div>
                        <div class="space-y-1 text-xs">
                            <div class="flex justify-between">
                                <span class="text-purple-700 font-medium">Name:</span>
                                <span class="text-purple-900 font-semibold">${printerInfo.name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700 font-medium">Model:</span>
                                <span class="text-purple-900">${printerInfo.model}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700 font-medium">Serial:</span>
                                <span class="text-purple-900 font-mono">${printerInfo.serial_number}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700 font-medium">Location:</span>
                                <span class="text-purple-900">${printerInfo.location}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Service Details Card -->
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div class="flex items-center mb-2">
                            <div class="bg-blue-600 rounded-lg p-2 mr-2">
                                <i class="fas fa-tools text-white text-sm"></i>
                            </div>
                            <h4 class="text-base font-bold text-blue-900">Service Details</h4>
                        </div>
                        <div class="space-y-1.5 text-sm">
                            <div class="flex justify-between">
                                <span class="text-blue-700 font-medium">Priority:</span>
                                <span class="font-semibold ${getPriorityColor(request.priority)}">${request.priority.toUpperCase()}</span>
                            </div>
                            ${request.technician_name ? `
                            <div class="flex justify-between">
                                <span class="text-blue-700 font-medium">Technician:</span>
                                <span class="text-blue-900 font-semibold">${request.technician_name}</span>
                            </div>
                            ` : ''}
                            <div class="flex justify-between">
                                <span class="text-blue-700 font-medium">Created:</span>
                                <span class="text-blue-900">${new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                            ${request.started_at ? `
                            <div class="flex justify-between">
                                <span class="text-blue-700 font-medium">Started:</span>
                                <span class="text-green-600 font-semibold">${new Date(request.started_at).toLocaleDateString()}</span>
                            </div>
                            ` : ''}
                            ${request.completed_at ? `
                            <div class="flex justify-between">
                                <span class="text-blue-700 font-medium">Completed:</span>
                                <span class="text-green-600 font-semibold">${new Date(request.completed_at).toLocaleDateString()}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Issue Description -->
                <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    <div class="flex items-center mb-2">
                        <div class="bg-orange-600 rounded-lg p-1.5 mr-2">
                            <i class="fas fa-exclamation-circle text-white text-xs"></i>
                        </div>
                        <h4 class="text-sm font-bold text-orange-900">Issue</h4>
                    </div>
                    <div class="bg-white/60 rounded-lg p-2 text-gray-800 text-xs leading-relaxed">
                        ${request.description}
                    </div>
                </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-3">
                <!-- Parts Used (if any) -->
                ${request.parts_used && request.parts_used.length > 0 ? `
                <div class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3 border border-teal-200">
                    <div class="flex items-center mb-2">
                        <div class="bg-teal-600 rounded-lg p-1.5 mr-2">
                            <i class="fas fa-toolbox text-white text-xs"></i>
                        </div>
                        <h4 class="text-sm font-bold text-teal-900">Parts Used</h4>
                    </div>
                    <div class="space-y-1">
                        ${request.parts_used.map(part => `
                        <div class="bg-white/60 rounded p-2 flex justify-between items-center">
                            <div class="flex-1">
                                <span class="text-xs font-semibold text-teal-900">${part.part_name}</span>
                                ${part.brand ? `<span class="text-xs text-teal-700 ml-1">(${part.brand})</span>` : ''}
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-bold text-teal-800">${part.quantity_used} ${part.unit || 'pcs'}</span>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Approver Information (if approved) -->
                ${(request.status === 'completed' && (approverName || request.approver_first_name)) ? `
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300">
                    <div class="flex items-center mb-3">
                        <div class="bg-green-600 rounded-lg p-2 mr-2">
                            <i class="fas fa-user-check text-white text-base"></i>
                        </div>
                        <h4 class="text-base font-bold text-green-900">✅ Approval Information</h4>
                    </div>
                    <div class="bg-white/80 rounded-lg p-3 text-sm space-y-2">
                        ${approverName ? `
                        <div class="flex justify-between items-center">
                            <span class="text-green-700 font-semibold">Approved By:</span>
                            <span class="text-green-900 font-bold">${approverName}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-green-700 font-semibold">Role:</span>
                            <span class="text-green-900 font-bold">${approverRole || 'Staff'}</span>
                        </div>
                        ` : `
                        <div class="text-yellow-800 font-medium text-sm">
                            <i class="fas fa-info-circle mr-1"></i>Approver information not available
                        </div>
                        `}
                    </div>
                </div>
                ` : ''}

                <!-- Timeline -->
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div class="flex items-center mb-2">
                        <div class="bg-gray-700 rounded-lg p-1.5 mr-2">
                            <i class="fas fa-clock text-white text-xs"></i>
                        </div>
                        <h4 class="text-sm font-bold text-gray-900">Timeline</h4>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500"></div>
                            <div class="ml-4 flex-1">
                                <div class="flex justify-between">
                                    <span class="text-sm font-medium text-gray-900">Request Created</span>
                                    <span class="text-sm text-gray-500">${new Date(request.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        ${request.started_at ? `
                        <div class="flex items-center">
                            <div class="flex-shrink-0 w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div class="ml-4 flex-1">
                                <div class="flex justify-between">
                                    <span class="text-sm font-medium text-gray-900">Service Started</span>
                                    <span class="text-sm text-gray-500">${new Date(request.started_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        ${request.completed_at ? `
                        <div class="flex items-center">
                            <div class="flex-shrink-0 w-3 h-3 rounded-full bg-green-500"></div>
                            <div class="ml-4 flex-1">
                                <div class="flex justify-between">
                                    <span class="text-sm font-medium text-gray-900">Service Completed</span>
                                    <span class="text-sm text-gray-500">${new Date(request.completed_at).toLocaleString()}</span>
                                </div>
                                ${approverName ? `
                                <p class="text-xs text-gray-600 mt-1">Approved by ${approverRole} - ${approverName}</p>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
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
        const pendingResponse = await fetch(`/api/institution_admin/service-approvals/pending`, {
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
        const detailsResponse = await fetch(`/api/institution_admin/service-approvals/${currentApprovalId}/details`, {
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
        let printerInfo = assignedPrinters.find(p => String(p.printer_id) === String(request.printer_id));
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
                    ${(approvalDetails.approver_first_name && approvalDetails.approver_last_name) || (approvalDetails.resolution_notes || approval.actions_performed) ? `
                    <div class="bg-white p-2 rounded border border-green-200 text-xs text-gray-700">
                        ${approvalDetails.approver_first_name && approvalDetails.approver_last_name ? `
                        <p class="font-semibold text-green-800 mb-1">
                            ✅ Approved by: <span class="capitalize">${approvalDetails.approver_role || 'Staff'}</span> - ${approvalDetails.approver_first_name} ${approvalDetails.approver_last_name}
                        </p>
                        ` : ''}
                        ${approvalDetails.resolution_notes || approval.actions_performed ? `
                        <p class="font-medium text-green-800 mb-1">Resolution:</p>
                        <p>${approvalDetails.resolution_notes || approval.actions_performed || 'No notes provided'}</p>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>

                <!-- Completion Photo -->
                ${approvalDetails.completion_photo_url || approval.completion_photo_url ? `
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                        <i class="fas fa-camera mr-2 text-blue-500"></i>Completion Photo
                    </h4>
                    <div class="bg-white rounded-lg border-2 border-blue-200 overflow-hidden shadow-sm">
                        <img src="${approvalDetails.completion_photo_url || approval.completion_photo_url}" 
                             alt="Service completion photo" 
                             class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                             onclick="window.open('${approvalDetails.completion_photo_url || approval.completion_photo_url}', '_blank')">
                        <div class="p-2 bg-blue-50 text-xs text-blue-700 text-center">
                            <i class="fas fa-expand-alt mr-1"></i>Click to view full size
                        </div>
                    </div>
                </div>
                ` : ''}

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
        const response = await fetch(`/api/institution_admin/service-approvals/${currentApprovalId}/${endpoint}`, {
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

/**
 * Show pagination controls
 */
function showPagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (paginationControls) {
        paginationControls.classList.remove('hidden');
    }
}

/**
 * Hide pagination controls
 */
function hidePagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (paginationControls) {
        paginationControls.classList.add('hidden');
    }
}

/**
 * Update pagination UI
 */
function updatePaginationUI() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Update button states
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Update page info
    if (pageInfo) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, filteredRequests.length);
        pageInfo.textContent = `Showing ${startItem}-${endItem} of ${filteredRequests.length}`;
    }
    
    // Generate page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        // Show max 5 page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Add first page and ellipsis if needed
        if (startPage > 1) {
            addPageButton(pageNumbers, 1);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 text-gray-400';
                ellipsis.textContent = '...';
                pageNumbers.appendChild(ellipsis);
            }
        }
        
        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            addPageButton(pageNumbers, i);
        }
        
        // Add ellipsis and last page if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 text-gray-400';
                ellipsis.textContent = '...';
                pageNumbers.appendChild(ellipsis);
            }
            addPageButton(pageNumbers, totalPages);
        }
    }
}

/**
 * Add page button to pagination
 */
function addPageButton(container, pageNum) {
    const button = document.createElement('button');
    button.className = `px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 ${
        pageNum === currentPage
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
    }`;
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    container.appendChild(button);
}

/**
 * Go to specific page
 */
function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPages || pageNum === currentPage) {
        return;
    }
    
    currentPage = pageNum;
    console.log(`[PAGINATION] Going to page ${currentPage}`);
    displayRequests(filteredRequests);
    updatePaginationUI();
    
    // Scroll to top of requests container
    const container = document.getElementById('requestsContainer');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Set up pagination event listeners
 */
function setupPaginationHandlers() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn && !prevBtn.dataset.listenerSet) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        });
        prevBtn.dataset.listenerSet = 'true';
    }
    
    if (nextBtn && !nextBtn.dataset.listenerSet) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        });
        nextBtn.dataset.listenerSet = 'true';
    }
}

// Make functions accessible to the HTML page
window.viewRequestDetails = viewRequestDetails;
window.viewApprovalDetails = viewApprovalDetails;
window.loadAssignedPrinters = loadAssignedPrinters;
window.loadServiceRequests = loadServiceRequests;




