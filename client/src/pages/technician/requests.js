/**
 * Technician Service Requests Page
 * Enhanced with Start Service, Complete Service, and Job Order functionality
 */

let currentServiceRequests = [];
let selectedRequest = null;

// Make selected request globally available for completion form
window.selectedRequest = null;

// Make refresh function globally available
window.refreshRequestsPage = function() {
    console.log('?? Refreshing requests page');
    loadServiceRequests();
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('G�� Technician Requests page loaded');
    
    // Check authentication first
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.log('G�� Authentication missing, redirecting to login...');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Verify user role
    try {
        const userData = JSON.parse(user);
        if (userData.role !== 'technician') {
            console.log('G�� User is not a technician, redirecting...');
            window.location.href = '/pages/login.html';
            return;
        }
    } catch (e) {
        console.log('G�� Invalid user data, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Set global flag that requests page is loaded
    window.requestsPageLoaded = true;
    
    // Load service requests immediately
    loadServiceRequests();
    
    // Set up search functionality (with retry if element not ready)
    const initSearch = () => {
        if (document.getElementById('search-input')) {
            setupSearchFunctionality();
            console.log('? Search functionality initialized');
        } else {
            console.log('? Search input not ready, retrying...');
            setTimeout(initSearch, 100);
        }
    };
    initSearch();
    
    // Set up service request modal
    setupServiceRequestModal();
    
    // Set up job completion modal
    setupJobCompletionModal();
    
    // Set up global modal event handlers
    setupModalEventHandlers();
    
    // Set up periodic refresh (every 30 seconds)
    setInterval(loadServiceRequests, 30000);
});

// Also listen for the custom event from technician.html when search elements are ready
document.addEventListener('searchElementsReady', function() {
    console.log('?? searchElementsReady event received, reinitializing search');
    setupSearchFunctionality();
});

// Global modal event handlers
function setupModalEventHandlers() {
    // Prevent multiple setup
    if (window._modalHandlersSetup) return;
    window._modalHandlersSetup = true;
    
    console.log('Setting up global modal event handlers');
    
    // Use a more robust approach - wait for elements and set up with retries
    function setupWithRetry(attempts = 0) {
        const maxAttempts = 10;
        
        // Check if all required elements exist
        const serviceCloseBtn = document.getElementById('closeServiceModal');
        const completionCloseBtn = document.getElementById('closeCompletionModal');
        const cancelBtn = document.getElementById('cancelCompletion');
        const jobForm = document.getElementById('jobCompletionForm');
        
        console.log('Setup attempt', attempts + 1, 'Elements found:', {
            serviceCloseBtn: !!serviceCloseBtn,
            completionCloseBtn: !!completionCloseBtn,
            cancelBtn: !!cancelBtn,
            jobForm: !!jobForm
        });
        
        if (completionCloseBtn && cancelBtn) {
            console.log('Found all required modal elements, setting up handlers');
            
            // Service modal close button
            if (serviceCloseBtn) {
                serviceCloseBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Service modal close clicked');
                    closeServiceRequestModal();
                };
                console.log('Service close button handler set');
            }
            
            // Completion modal close button (X)
            completionCloseBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Completion modal close clicked');
                closeJobCompletionModal();
            };
            console.log('Completion close button handler set');
            
            // Completion modal cancel button
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Completion modal cancel clicked');
                closeJobCompletionModal();
            };
            console.log('Cancel button handler set');
            
            // Form submission
            if (jobForm) {
                jobForm.onsubmit = function(e) {
                    e.preventDefault();
                    handleJobCompletion(e);
                };
                console.log('Form handler set');
            }
            
            // Success!
            return true;
        } else if (attempts < maxAttempts) {
            // Retry after a delay
            console.log('Modal elements not ready, retrying in 200ms...');
            setTimeout(() => setupWithRetry(attempts + 1), 200);
            return false;
        } else {
            console.error('Failed to find modal elements after', maxAttempts, 'attempts');
            return false;
        }
    }
    
    // Start setup with retries
    setupWithRetry();
    
    // Escape key handler (this can be immediate)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const jobModal = document.getElementById('jobCompletionModal');
            const serviceModal = document.getElementById('serviceRequestModal');
            
            if (jobModal && !jobModal.classList.contains('hidden')) {
                console.log('Escape key - closing completion modal');
                closeJobCompletionModal();
            } else if (serviceModal && !serviceModal.classList.contains('hidden')) {
                console.log('Escape key - closing service modal');
                closeServiceRequestModal();
            }
        }
    });
    
    // Modal overlay clicks with delegation
    document.addEventListener('click', function(e) {
        if (e.target.id === 'serviceRequestModal') {
            console.log('Service modal overlay clicked');
            closeServiceRequestModal();
        }
        
        if (e.target.id === 'jobCompletionModal') {
            console.log('Completion modal overlay clicked');
            closeJobCompletionModal();
        }
    });
}

// Make refresh function globally available
window.refreshRequestsPage = function() {
    console.log('=��� Refreshing requests page');
    loadServiceRequests();
};

/**
 * Load service requests from the server
 */
async function loadServiceRequests() {
    try {
        showLoadingState();
        
        const token = localStorage.getItem('token');
        console.log('=��� Auth token:', token ? 'Present' : 'Missing');
        
        const response = await fetch('/api/technician/service-requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('=��� API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch service requests: ${response.statusText}`);
        }
        
        const requests = await response.json();
        console.log('=��� Received requests data:', requests);
        currentServiceRequests = requests;
        
        console.log(`G�� Loaded ${requests.length} service requests`);
        
        displayServiceRequests(requests);
        hideLoadingState();
        
    } catch (error) {
        console.error('G�� Error loading service requests:', error);
        
        // If error is 401 (unauthorized), redirect to login
        // Don't auto-logout on errors - let the user stay logged in
        // Only the global fetch interceptor will handle TOKEN_INVALIDATED cases
        
        // For other errors, show empty state with retry option
        currentServiceRequests = [];
        console.log('G�� No service requests available');
        
        displayServiceRequests([]);
        hideLoadingState();
        
        // Show error message to user
        showToast('Failed to load service requests. Please check your internet connection and try again.', 'error');
    }
}

/**
 * Display service requests in both desktop and mobile views
 */
function displayServiceRequests(requests) {
    console.log('=�Ŀ displayServiceRequests called with:', requests);
    
    const mobileContainer = document.getElementById('serviceRequestsCardsMobile');
    const desktopContainer = document.getElementById('serviceRequestsTableDesktop');
    const mobileCount = document.getElementById('mobile-requests-count');
    const desktopCount = document.getElementById('desktop-requests-count');
    
    console.log('=��� Mobile container found:', !!mobileContainer);
    console.log('=��+ Desktop container found:', !!desktopContainer);
    console.log('=��� Mobile count element found:', !!mobileCount);
    console.log('=��� Desktop count element found:', !!desktopCount);
    
    // Update counts
    if (mobileCount) mobileCount.textContent = `${requests.length} requests`;
    if (desktopCount) desktopCount.textContent = `${requests.length} requests`;
    
    if (requests.length === 0) {
        console.log('No requests to display, clearing containers');
        
        // Clear both containers and show "no results" message
        const emptyMessage = `
            <div class="text-center py-12 px-4">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-slate-700 mb-2">No requests found</h3>
                <p class="text-sm text-slate-500">No service requests match your search criteria</p>
            </div>
        `;
        
        if (mobileContainer) {
            mobileContainer.innerHTML = emptyMessage;
        }
        if (desktopContainer) {
            desktopContainer.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">No requests found</td></tr>';
        }
        
        return;
    }
    
    console.log(`=��� Generating UI for ${requests.length} requests`);
    
    // Generate mobile cards
    if (mobileContainer) {
        const mobileHTML = requests.map(request => createMobileRequestCard(request)).join('');
        console.log('=��� Generated mobile HTML length:', mobileHTML.length);
        mobileContainer.innerHTML = mobileHTML;
        console.log('=��� Mobile container updated');
    }
    
    // Generate desktop table rows
    if (desktopContainer) {
        const desktopHTML = requests.map(request => createDesktopRequestRow(request)).join('');
        console.log('=��+ Generated desktop HTML length:', desktopHTML.length);
        desktopContainer.innerHTML = desktopHTML;
        console.log('=��+ Desktop container updated');
    }
    
    // Add click handlers for viewing details
    addRequestClickHandlers();
    console.log('G�� Request click handlers added');
}

/**
 * Create mobile card for service request
 */
function createMobileRequestCard(request) {
    const statusClass = getStatusClass(request.status);
    const priorityClass = getPriorityClass(request.priority);
    
    // Show priority for in_progress requests, otherwise show status
    const displayStatus = request.status === 'in_progress' ? request.priority?.toUpperCase() || 'MEDIUM' : formatStatus(request.status);
    const displayStatusClass = request.status === 'in_progress' ? priorityClass : statusClass;
    
    // Format as SR-YYYY-(NUMBER)
    function formatRequestNumber(fullNumber) {
        // Match SR-YYYY-XXXX (where XXXX is always the last 4 digits after the last dash)
        const match = fullNumber.match(/SR-(\d{4})-\d+/);
        if (match) {
            // Extract the last 4 digits after the last dash
            const lastDash = fullNumber.lastIndexOf('-');
            const reqNum = fullNumber.substring(lastDash + 1).padStart(4, '0');
            return `SR-${match[1]}-${reqNum}`;
        }
        return fullNumber;
    }
    const formattedRequestNumber = formatRequestNumber(request.request_number);
    
    return `
        <div class="modern-mobile-card group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 mb-4 border border-slate-100" style="--animation-delay: ${Math.random() * 200}ms">
            <!-- Priority/Status Indicator Strip -->
            <div class="absolute top-0 left-0 right-0 h-1 ${request.status === 'in_progress' ? getPriorityGradient(request.priority) : getStatusGradient(request.status)}"></div>
            
            <!-- Card Header -->
            <div class="flex items-center justify-between p-5 pb-3">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-2xl bg-blue-50">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-blue-600 tracking-wide">${formattedRequestNumber}</div>
                        <div class="text-xs text-slate-500">${formatDate(request.created_at)}</div>
                    </div>
                </div>
                <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${displayStatusClass} border shadow-sm">
                    <div class="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></div>
                    ${displayStatus}
                </span>
            </div>
            
            <!-- Institution & Client Info -->
            <div class="px-5 pb-2">
                ${request.is_walk_in ? `
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
                        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Walk-in Request
                    </span>
                </div>
                <h3 class="font-bold text-lg text-purple-900 leading-tight">${request.walk_in_customer_name || 'Walk-in Customer'}</h3>
                ` : `
                <h3 class="font-bold text-lg text-slate-900 leading-tight">${request.institution_name || 'Institution'}</h3>
                <div class="mt-1.5 text-sm text-slate-600">
                    <span class="font-medium">Requested by:</span> 
                    ${request.institution_user_first_name || ''} ${request.institution_user_last_name || 'N/A'}
                    ${request.institution_user_role ? `<span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : ''}
                </div>
                ${request.location || request.printer_department ? `
                <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    ${request.location ? `<span>📍 ${request.location}</span>` : ''}
                    ${request.printer_department ? `<span>🏢 ${request.printer_department}</span>` : ''}
                </div>
                ` : ''}
                `}
            </div>
            
            <!-- Description -->
            <div class="px-5 pb-4">
                <div class="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200/50">
                    <div class="text-sm text-slate-700 leading-relaxed line-clamp-2">
                        ${request.issue || 'Service Request'}
                    </div>
                </div>
            </div>
            
            <!-- Action Section -->
            <div class="px-5 pb-5">
                <div class="space-y-3">
                    <button class="view-details-btn w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" data-request-id="${request.id}">
                        ${request.status === 'in_progress' ? `
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Complete Service
                        ` : ['assigned','pending','new'].includes(request.status) ? `
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                            </svg>
                            Start Service
                        ` : `
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            View Details
                        `}
                    </button>
                    <!-- Start button removed from card - Start action is now available inside View Details modal -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Create desktop table row for service request
 */
function createDesktopRequestRow(request) {
    const statusClass = getStatusClass(request.status);
    const priorityClass = getPriorityClass(request.priority);
    
    // Show priority for in_progress requests, otherwise show status
    const displayStatus = request.status === 'in_progress' ? request.priority?.toUpperCase() || 'MEDIUM' : formatStatus(request.status);
    const displayStatusClass = request.status === 'in_progress' ? priorityClass : statusClass;
    
    return `
        <tr class="hover:bg-white/70 transition-colors duration-200 cursor-pointer" data-request-id="${request.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-bold text-slate-800">${request.request_number}</div>
            </td>
            <td class="px-6 py-4">
                <div class="font-medium text-slate-800">${request.issue || 'Service Request'}</div>
                <div class="text-sm text-slate-500">
                    ${request.is_walk_in ? `
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Walk-in: ${request.walk_in_customer_name || 'Customer'}
                    </span>
                    ` : request.institution_name}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${displayStatusClass}">
                    <div class="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                    ${displayStatus}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${formatDate(request.created_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                    <button class="view-details-btn px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                            data-request-id="${request.id}">
                        ${request.status === 'in_progress' ? `
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Complete Service
                        ` : ['assigned','pending','new'].includes(request.status) ? `
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                            </svg>
                            Start Service
                        ` : `
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            View Details
                        `}
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Add click handlers for request interactions
 */
function addRequestClickHandlers() {
    // View details buttons and card clicks
    document.querySelectorAll('.view-details-btn, .modern-card-container').forEach(element => {
        element.addEventListener('click', (e) => {
            const requestId = element.getAttribute('data-request-id') || 
                             element.closest('[data-request-id]')?.getAttribute('data-request-id');
            if (requestId) {
                showServiceRequestModal(requestId);
            }
        });
    });

    // Note: Start action is handled inside the View Details modal via startServiceFromModal()
}

/**
 * Start service for a request
 */
async function startService(requestId) {
    try {
        console.log(`Starting service for request ${requestId}`);
        
        const response = await fetch(`/api/technician/service-requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'in_progress' })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error response:', errorData);
            throw new Error(errorData.error || `Failed to start service (HTTP ${response.status})`);
        }
        
        const result = await response.json();
        console.log('Service start result:', result);
        
        // Show success message with start time
        let successMessage = 'Service started successfully!';
        if (result.started_at) {
            const startTime = new Date(result.started_at).toLocaleString();
            successMessage += ` Started at: ${startTime}`;
        }
        
        showToast(successMessage, 'success');
        
        // Reload requests to reflect changes
        await loadServiceRequests();
        
        console.log('Service started successfully:', result);
        
    } catch (error) {
        console.error('Error starting service:', error);
        showToast(`Failed to start service: ${error.message}`, 'error');
        throw error; // Re-throw for upstream handling
    }
}

/**
 * Show service request details modal
 */
function showServiceRequestModal(requestId) {
    const request = currentServiceRequests.find(r => r.id == requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    selectedRequest = request;
    
    const modal = document.getElementById('serviceRequestModal');
    if (!modal) {
        console.error('Service request modal not found in HTML');
        return;
    }
    
    populateServiceRequestModal(request);
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

/**
 * Show job completion modal
 */
function showJobCompletionModal(requestId) {
    const request = currentServiceRequests.find(r => r.id == requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    selectedRequest = request;
    window.selectedRequest = request; // Make globally available
    
    const modal = document.getElementById('jobCompletionModal');
    if (!modal) {
        console.error('Job completion modal not found in HTML');
        return;
    }
    
    populateJobCompletionModal(request);
    
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Load available parts from technician inventory and setup handlers
    loadAvailableParts().then(() => {
        // Setup complete part management system after parts are loaded
        setTimeout(() => {
            setupPartManagement();
        }, 100);
    });
    
    // Setup signature canvas after modal is shown
    setTimeout(() => {
        setupSignatureCanvas();
    }, 100);
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    const searchCount = document.getElementById('search-count');
    
    if (!searchInput) {
        console.log('?? Search input not found');
        return;
    }
    
    // Remove existing listener if any to prevent duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    const freshSearchInput = document.getElementById('search-input');
    
    console.log('?? Setting up search functionality');
    
    // Real-time inline search for the visible cards
    freshSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        console.log('?? Search query:', query);
        
        if (query === '') {
            // Show all requests when search is empty
            displayServiceRequests(currentServiceRequests);
            if (searchCount) {
                searchCount.textContent = 'Type to filter requests...';
            }
            return;
        }
        
        // Filter requests based on search query - searches all key fields
        const filteredRequests = currentServiceRequests.filter(request => {
            // Request number
            if (request.request_number?.toLowerCase().includes(query)) return true;
            
            // Issue/Description
            if (request.issue?.toLowerCase().includes(query)) return true;
            
            // Date search (format as displayed: Nov 26, 2025)
            if (request.created_at) {
                const dateStr = formatDate(request.created_at).toLowerCase();
                if (dateStr.includes(query)) return true;
            }
            
            // Priority/Urgency (low, medium, high, urgent)
            if (request.priority?.toLowerCase().includes(query)) return true;
            
            // Printer details
            if (request.brand?.toLowerCase().includes(query)) return true;
            if (request.model?.toLowerCase().includes(query)) return true;
            if (request.serial_number?.toLowerCase().includes(query)) return true;
            if (request.printer_full_details?.toLowerCase().includes(query)) return true;
            if (request.printer_name?.toLowerCase().includes(query)) return true;
            
            // Institution/Location
            if (request.institution_name?.toLowerCase().includes(query)) return true;
            if (request.location?.toLowerCase().includes(query)) return true;
            
            // institution_user information (for non-walk-in requests)
            if (!request.is_walk_in) {
                // institution_user name
                if (request.institution_user_first_name?.toLowerCase().includes(query)) return true;
                if (request.institution_user_last_name?.toLowerCase().includes(query)) return true;
                const fullName = `${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}`.toLowerCase();
                if (fullName.includes(query)) return true;
                
                // institution_user role
                if (request.institution_user_role?.toLowerCase().includes(query)) return true;
            }
            
            // Walk-in customer name
            if (request.is_walk_in && request.walk_in_customer_name?.toLowerCase().includes(query)) return true;
            
            // Status
            if (request.status?.toLowerCase().includes(query)) return true;
            
            return false;
        });
        
        console.log(`? Filtered ${filteredRequests.length} of ${currentServiceRequests.length} requests`);
        
        // Update count and display filtered results
        if (searchCount) {
            searchCount.textContent = `${filteredRequests.length} of ${currentServiceRequests.length} requests`;
        }
        
        displayServiceRequests(filteredRequests);
    });
    
    console.log('? Search functionality ready');
}

/**
 * Display search results
 */
function displaySearchResults(results, query) {
    const searchResults = document.getElementById('search-results');
    const searchCount = document.getElementById('search-count');
    
    if (!searchResults || !searchCount) return;
    
    searchCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="p-4 text-center text-slate-500">
                <p>No requests found for "${query}"</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = results.map(request => `
        <div class="search-result-item p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer" 
             data-request-id="${request.id}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="font-medium text-slate-800">${request.request_number}</div>
                    <div class="text-sm text-slate-600 line-clamp-1">${request.issue || 'Service Request'}</div>
                    <div class="text-xs text-slate-500">
                        ${request.institution_name}
                        ${request.is_walk_in ? `<span class="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">Walk-in: ${request.walk_in_customer_name || 'Customer'}</span>` : ''}
                    </div>
                </div>
                <div class="ml-2">
                    <span class="inline-flex px-2 py-1 text-xs rounded-full ${getStatusClass(request.status)}">
                        ${formatStatus(request.status)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers for search results
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const requestId = item.getAttribute('data-request-id');
            document.getElementById('search-overlay')?.classList.add('hidden');
            showServiceRequestModal(requestId);
        });
    });
}

/**
 * Show different states
 */
function showLoadingState() {
    const loadingState = document.getElementById('requests-loadingState');
    const emptyState = document.getElementById('requests-emptyState');
    const errorState = document.getElementById('requests-errorState');
    
    loadingState?.classList.remove('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.add('hidden');
}

function showEmptyState() {
    const loadingState = document.getElementById('requests-loadingState');
    const emptyState = document.getElementById('requests-emptyState');
    const errorState = document.getElementById('requests-errorState');
    
    loadingState?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    errorState?.classList.add('hidden');
}

function showErrorState() {
    const loadingState = document.getElementById('requests-loadingState');
    const emptyState = document.getElementById('requests-emptyState');
    const errorState = document.getElementById('requests-errorState');
    
    loadingState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.remove('hidden');
}

function hideLoadingState() {
    const loadingState = document.getElementById('requests-loadingState');
    const emptyState = document.getElementById('requests-emptyState');
    const errorState = document.getElementById('requests-errorState');
    
    loadingState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.add('hidden');
}

/**
 * Utility functions
 */
function getStatusClass(status) {
    const statusClasses = {
        'new': 'bg-blue-100 text-blue-800 border-blue-200',
        'assigned': 'bg-blue-100 text-blue-800 border-blue-200',
        'in_progress': 'bg-orange-100 text-orange-800 border-orange-200',
        'pending_approval': 'bg-purple-100 text-purple-800 border-purple-200',
        'completed': 'bg-green-100 text-green-800 border-green-200',
        'cancelled': 'bg-red-100 text-red-800 border-red-200',
        'on_hold': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return statusClasses[status] || statusClasses['new'];
}

function getStatusColor(status) {
    const statusColors = {
        'new': 'blue',
        'assigned': 'blue',
        'in_progress': 'orange',
        'pending_approval': 'purple',
        'completed': 'green',
        'cancelled': 'red',
        'on_hold': 'gray'
    };
    return statusColors[status] || 'blue';
}

function getPriorityClass(priority) {
    const priorityClasses = {
        'low': 'bg-green-100 text-green-800 border-green-200',
        'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'high': 'bg-orange-100 text-orange-800 border-orange-200',
        'urgent': 'bg-red-100 text-red-800 border-red-200'
    };
    return priorityClasses[priority] || priorityClasses['medium'];
}

function getPriorityGradient(priority) {
    const priorityGradients = {
        'low': 'bg-gradient-to-r from-green-400 to-green-500',
        'medium': 'bg-gradient-to-r from-yellow-400 to-yellow-500',
        'high': 'bg-gradient-to-r from-orange-400 to-orange-500',
        'urgent': 'bg-gradient-to-r from-red-400 to-red-500'
    };
    return priorityGradients[priority] || priorityGradients['medium'];
}

function getStatusGradient(status) {
    const statusGradients = {
        'new': 'bg-gradient-to-r from-blue-400 to-blue-500',
        'assigned': 'bg-gradient-to-r from-blue-400 to-blue-500',
        'in_progress': 'bg-gradient-to-r from-orange-400 to-orange-500',
        'completed': 'bg-gradient-to-r from-green-400 to-green-500',
        'cancelled': 'bg-gradient-to-r from-red-400 to-red-500',
        'on_hold': 'bg-gradient-to-r from-gray-400 to-gray-500'
    };
    return statusGradients[status] || statusGradients['new'];
}

function formatStatus(status) {
    const statusLabels = {
        'new': 'New',
        'assigned': 'Assigned',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'on_hold': 'On Hold'
    };
    return statusLabels[status] || status;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Missing utility functions for mobile card generation
function getWorkflowSteps(status) {
    const steps = [
        {
            label: 'Received',
            icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>',
            status: ['new', 'assigned', 'in_progress', 'completed'].includes(status) ? 'completed' : 'pending'
        },
        {
            label: 'Assigned',
            icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
            status: ['assigned', 'in_progress', 'completed'].includes(status) ? 'completed' : status === 'new' ? 'current' : 'pending'
        },
        {
            label: 'In Progress',
            icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-3-9a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
            status: ['in_progress', 'completed'].includes(status) ? 'completed' : status === 'assigned' ? 'current' : 'pending'
        },
        {
            label: 'Completed',
            icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            status: status === 'completed' ? 'completed' : status === 'in_progress' ? 'current' : 'pending'
        }
    ];
    return steps;
}

function getAnalyticsInsights(request) {
    // Mock analytics data - replace with actual analytics when available
    const insights = [];
    const recommendations = [];
    
    // Priority-based insights
    if (request.priority === 'urgent') {
        insights.push({
            type: 'priority',
            level: 'high',
            message: 'High priority request - respond within 2 hours',
            confidence: 95
        });
    }
    
    // Equipment-based insights
    if (request.printer_name) {
        insights.push({
            type: 'equipment',
            level: 'medium',
            message: `Common issue for ${request.printer_name} models`,
            confidence: 78
        });
        recommendations.push('Check toner levels first');
        recommendations.push('Verify paper feed mechanism');
    }
    
    // Default insight if none
    if (insights.length === 0) {
        insights.push({
            type: 'general',
            level: 'low',
            message: 'Standard service request',
            confidence: 60
        });
    }
    
    return { insights, recommendations };
}

function getPriorityUrgency(priority) {
    const urgencyMap = {
        'low': 'urgency-low',
        'medium': 'urgency-medium', 
        'high': 'urgency-high',
        'urgent': 'urgency-critical'
    };
    return urgencyMap[priority] || 'urgency-medium';
}

function getUrgencyIcon(priority) {
    const iconMap = {
        'low': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        'medium': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        'high': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        'urgent': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
    };
    return iconMap[priority] || iconMap['medium'];
}

function getWorkflowStatusClass(status) {
    const classMap = {
        'new': 'workflow-new',
        'assigned': 'workflow-assigned',
        'in_progress': 'workflow-progress',
        'completed': 'workflow-completed',
        'cancelled': 'workflow-cancelled',
        'on_hold': 'workflow-hold'
    };
    return classMap[status] || 'workflow-new';
}

function formatTechnicianStatus(status) {
    const statusMap = {
        'new': 'New Request',
        'assigned': 'Assigned to You',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'on_hold': 'On Hold'
    };
    return statusMap[status] || status;
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-full`;
    
    // Set toast style based on type
    if (type === 'success') {
        toast.classList.add('bg-green-600');
    } else if (type === 'error') {
        toast.classList.add('bg-red-600');
    } else {
        toast.classList.add('bg-blue-600');
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add these functions after the utility functions section

function setupServiceRequestModal() {
    // Use event delegation to ensure buttons work
    document.addEventListener('click', function(e) {
        if (e.target.id === 'closeServiceModal' || e.target.closest('#closeServiceModal')) {
            e.preventDefault();
            e.stopPropagation();
            closeServiceRequestModal();
        }
    });
    
    // Close on overlay click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('serviceRequestModal');
        if (e.target === modal) {
            closeServiceRequestModal();
        }
    });
}

// Separate handler for service modal overlay
function serviceModalOverlayClick(e) {
    const modal = document.getElementById('serviceRequestModal');
    if (e.target === modal) {
        closeServiceRequestModal();
    }
}

function setupJobCompletionModal() {
    // Load available parts
    loadAvailableParts();
    
    // Set up part management
    setupPartManagement();
    
    // Use event delegation for modal buttons
    document.addEventListener('click', function(e) {
        // Close button
        if (e.target.id === 'closeCompletionModal' || e.target.closest('#closeCompletionModal')) {
            e.preventDefault();
            e.stopPropagation();
            closeJobCompletionModal();
        }
        
        // Cancel button  
        if (e.target.id === 'cancelCompletion' || e.target.closest('#cancelCompletion')) {
            e.preventDefault();
            e.stopPropagation();
            closeJobCompletionModal();
        }
        
        // Overlay click
        const modal = document.getElementById('jobCompletionModal');
        if (e.target === modal) {
            closeJobCompletionModal();
        }
    });
    
    // Form submission
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'jobCompletionForm') {
            handleJobCompletion(e);
        }
    });
    
    // Escape key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const jobModal = document.getElementById('jobCompletionModal');
            const serviceModal = document.getElementById('serviceRequestModal');
            
            if (jobModal && !jobModal.classList.contains('hidden')) {
                closeJobCompletionModal();
            } else if (serviceModal && !serviceModal.classList.contains('hidden')) {
                closeServiceRequestModal();
            }
        }
    });
}

function closeServiceRequestModal() {
    console.log('Closing service request modal');
    const modal = document.getElementById('serviceRequestModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

function closeJobCompletionModal() {
    console.log('Closing job completion modal');
    const modal = document.getElementById('jobCompletionModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        
        // Reset form
        const form = document.getElementById('jobCompletionForm');
        if (form) {
            form.reset();
        }
        
        // Reset carousel state
        currentPartSlide = 0;
        totalPartSlides = 1;
        
        // Reset parts container - will be reinitialized when modal opens next time
        const container = document.getElementById('partsContainer');
        if (container) {
            // Reset transform
            container.style.transform = 'translateX(0)';
        }
        
        // Reset parts summary
        const summaryContainer = document.getElementById('partsSummary');
        if (summaryContainer) {
            summaryContainer.classList.add('hidden');
        }
        
        // Clear search input
        const searchInput = document.getElementById('partSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }
}

// Make functions globally available for inline onclick handlers
window.closeServiceRequestModal = closeServiceRequestModal;
window.closeJobCompletionModal = closeJobCompletionModal;

function populateServiceRequestModal(request) {
    const requestNumber = document.getElementById('modal-request-number');
    const content = document.getElementById('serviceRequestContent');
    
    if (requestNumber) requestNumber.textContent = request.request_number;

    if (content) {
        // Priority badge left of request number
        const priorityClass = getPriorityClass(request.priority);
        const institution = request.institution_name || '';
        const address = request.location || '';
        const description = request.issue || 'Service Request';
        const isLong = description.length > 120;
        const shortDesc = isLong ? description.slice(0, 120) + 'GǪ' : description;
        function formatRequestNumber(fullNumber) {
            const match = fullNumber.match(/SR-(\d{4})-(\d+)/);
            if (match) {
                return `SR-${match[1]}-${match[2]}`;
            }
            return fullNumber;
        }
        const formattedRequestNumber = formatRequestNumber(request.request_number);

        content.innerHTML = `
        <div class="modern-modal-container shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-0 overflow-hidden">
            <div class="flex items-center justify-between px-6 pt-6 pb-2">
                <span class="rounded-lg px-3 py-1 bg-blue-100 text-blue-700 font-bold text-base tracking-wider">${formattedRequestNumber}</span>
                <span class="rounded px-2 py-1 font-bold text-xs ${priorityClass}">${request.priority?.toUpperCase() || ''}</span>
            </div>
            <div class="px-0 pb-2">
                <div class="font-bold text-lg text-slate-800 mb-1 px-6">${institution}</div>
                <div class="text-sm text-slate-600 mb-3 px-6">${address}</div>
                
                <!-- Printer Information Section (only show if printer data exists) -->
                <div class="px-6">
                ${request.is_walk_in ? `
                <div class="mb-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-purple-800 mb-1 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Walk-in Service
                    </div>
                    <div class="text-sm text-purple-900 font-semibold">Customer: ${request.walk_in_customer_name || 'N/A'}</div>
                </div>
                ${request.printer_brand ? `
                <div class="mb-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-slate-700 mb-1">Printer Brand:</div>
                    <div class="text-sm text-slate-900 font-semibold">${request.printer_brand}</div>
                </div>
                ` : ''}
                ` : (request.printer_name || request.brand || request.model || request.serial_number) ? `
                <div class="mb-3">
                    <div class="text-sm font-medium text-slate-700 mb-2">Printer Information:</div>
                    <div class="space-y-1">
                        ${request.printer_name ? `<div class="text-sm text-slate-600"><span class="font-medium">Name:</span> ${request.printer_name}</div>` : ''}
                        ${request.brand ? `<div class="text-sm text-slate-600"><span class="font-medium">Brand:</span> ${request.brand}</div>` : ''}
                        ${request.model ? `<div class="text-sm text-slate-600"><span class="font-medium">Model:</span> ${request.model}</div>` : ''}
                        ${request.serial_number ? `<div class="text-sm text-slate-600"><span class="font-medium">Serial Number:</span> ${request.serial_number}</div>` : ''}
                        ${request.location ? `<div class="text-sm text-slate-600"><span class="font-medium">Location:</span> ${request.location}</div>` : ''}
                        ${request.printer_department ? `<div class="text-sm text-slate-600"><span class="font-medium">Department:</span> ${request.printer_department}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <!-- institution_user Information Section -->
                ${request.is_walk_in ? `
                <div class="mb-3 bg-purple-50 border-purple-100 border rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-purple-800 mb-1 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Walk-in Customer:
                        <span class="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-bold">Walk-in</span>
                    </div>
                    <div class="text-sm text-purple-900 font-semibold">
                        ${request.walk_in_customer_name || 'Walk-in Customer'}
                    </div>
                </div>
                ${(request.institution_user_first_name || request.institution_user_last_name) ? `
                <div class="mb-3 bg-blue-50 border-blue-100 border rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Created By:
                        ${request.institution_user_role ? `<span class="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-bold uppercase">${request.institution_user_role}</span>` : ''}
                    </div>
                    <div class="text-sm text-blue-900 font-semibold">
                        ${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}
                    </div>
                </div>
                ` : ''}
                ` : `
                <div class="mb-3 bg-blue-50 border-blue-100 border rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Requested By:
                        ${request.institution_user_role ? `<span class="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-bold uppercase">${request.institution_user_role}</span>` : ''}
                    </div>
                    <div class="text-sm text-blue-900 font-semibold">
                        ${request.institution_user_first_name || ''} ${request.institution_user_last_name || 'N/A'}
                    </div>
                </div>
                `}
                
                </div>
                
                <!-- Description with gray background -->
                <div class="px-6">
                <div class="bg-gray-100 rounded-lg px-3 py-2 mb-3">
                    <span id="modal-description" class="block text-gray-700 text-sm leading-relaxed ${isLong ? 'line-clamp-3' : ''}">${shortDesc}</span>
                    ${isLong ? `<button id="expand-description" class="text-blue-600 text-xs font-medium mt-1 underline">Show more</button>` : ''}
                </div>
                
                <div class="border-t border-slate-100 my-3"></div>
                <details class="mb-3">
                    <summary class="text-xs text-slate-500 cursor-pointer select-none py-1">Show additional details</summary>
                    <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mt-2">
                        <div><span class="font-medium text-slate-600">Priority:</span> <span class="${priorityClass} font-bold">${request.priority?.toUpperCase()}</span></div>
                        <div><span class="font-medium text-slate-600">Created:</span> <span>${formatDate(request.created_at)} ${formatTime(request.created_at)}</span></div>
                    </div>
                </details>
                </div>
                
                ${!request.is_walk_in ? `
                <!-- Collapsible Analytics Section -->
                <div id="analytics-section-${request.id}" class="modern-analytics-section bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-3 py-2 mb-3 cursor-pointer flex items-start gap-2 group hover:shadow-lg transition-all" onclick="toggleAnalytics(${request.id}, \`${request.brand || ''}\`, \`${request.model || ''}\`)">
                    <div class="analytics-icon bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full p-1.5 shadow-md">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-semibold text-blue-800 text-xs">Smart Part Recommendations</span>
                            <span class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">AI</span>
                            <span id="analytics-badge-${request.id}" class="hidden bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold"></span>
                        </div>
                        <p class="text-[10px] text-blue-600 mt-0.5">See which parts other technicians used for similar repairs</p>
                        <div id="analytics-content-${request.id}" class="modern-analytics-content text-xs mt-2 hidden">
                            <div class="flex items-center justify-center py-4">
                                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
                    </div>
                    <svg class="w-4 h-4 text-blue-400 transition-transform flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                ` : ''}
            </div>
            <div class="px-6 pb-6">
                <div class="flex gap-2 mb-2">
                    ${(['assigned','pending','new'].includes(request.status)) ? `
                        <button class="modern-action-btn start-service-btn flex-1 bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-2 rounded-xl shadow hover:from-green-500 hover:to-green-700 transition-colors flex items-center justify-center gap-2" onclick="startServiceFromModal(${request.id})">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                            </svg>
                            Start
                        </button>
                    ` : ''}
                    ${request.status === 'in_progress' ? `
                        <button class="modern-action-btn complete-service-btn flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold py-2 rounded-xl shadow hover:from-yellow-500 hover:to-orange-600 transition-colors flex items-center justify-center gap-2" onclick="openCompletionFromModal(${request.id})">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Complete
                        </button>
                    ` : ''}
                    <button class="modern-action-btn flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl shadow hover:bg-slate-300 transition-colors flex items-center justify-center gap-2" onclick="closeServiceRequestModal()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        Close
                    </button>
                </div>
            </div>
        </div>
        `;

        // Add expand/collapse logic for long descriptions
        if (isLong) {
            setTimeout(() => {
                const expandBtn = document.getElementById('expand-description');
                const descSpan = document.getElementById('modal-description');
                let expanded = false;
                if (expandBtn && descSpan) {
                    expandBtn.onclick = function() {
                        expanded = !expanded;
                        if (expanded) {
                            descSpan.textContent = description;
                            descSpan.classList.remove('line-clamp-3');
                            expandBtn.textContent = 'Show less';
                        } else {
                            descSpan.textContent = shortDesc;
                            descSpan.classList.add('line-clamp-3');
                            expandBtn.textContent = 'Show more';
                        }
                    };
                }
            }, 0);
        }
    }
}

function populateJobCompletionModal(request) {
    const requestNumber = document.getElementById('completion-modal-request-number');
    const summary = document.getElementById('completionRequestSummary');
    
    if (requestNumber) requestNumber.textContent = request.request_number;
    
    if (summary) {
        // Determine institution_user display
        let institution_userDisplay = '';
        if (request.is_walk_in) {
            // For walk-in: show customer first, then creator
            institution_userDisplay = `
                <div class="flex justify-between items-center">
                    <span class="font-medium text-slate-600">Customer:</span>
                    <span class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                            Walk-in
                        </span>
                        <span class="text-slate-800 font-semibold">${request.walk_in_customer_name || 'Walk-in Customer'}</span>
                    </span>
                </div>
            `;
            // Add creator info if available
            if (request.institution_user_first_name || request.institution_user_last_name) {
                const roleBadge = request.institution_user_role ? `<span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : '';
                institution_userDisplay += `
                    <div class="flex justify-between mt-2">
                        <span class="font-medium text-slate-600">Created By:</span>
                        <span class="text-slate-800">${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}${roleBadge}</span>
                    </div>
                `;
            }
        } else if (request.institution_user_first_name || request.institution_user_last_name) {
            const roleBadge = request.institution_user_role ? `<span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : '';
            institution_userDisplay = `
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Requested By:</span>
                    <span class="text-slate-800">${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}${roleBadge}</span>
                </div>
            `;
        }
        
        // Location display (from printer location, not service_requests table)
        let locationDisplay = '';
        if (request.is_walk_in) {
            locationDisplay = 'Walk-in';
        } else {
            // location comes from printers table via JOIN
            locationDisplay = request.institution_name ? `${request.institution_name}${request.location ? ' - ' + request.location : ''}` : (request.location || 'Not specified');
        }
        
        // Equipment display
        let equipmentDisplay = '';
        if (request.printer_name) {
            equipmentDisplay = request.printer_name;
        } else if (request.printer_brand) {
            equipmentDisplay = request.printer_brand;
        } else if (request.brand) {
            equipmentDisplay = request.brand;
        } else {
            equipmentDisplay = 'Not specified';
        }
        
        summary.innerHTML = `
            <div class="space-y-3">
                ${institution_userDisplay}
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Issue:</span>
                    <span class="text-slate-800">${request.issue || 'Service Request'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Location:</span>
                    <span class="text-slate-800">${locationDisplay}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Equipment:</span>
                    <span class="text-slate-800">${equipmentDisplay}</span>
                </div>
                ${request.serial_number ? `
                    <div class="flex justify-between">
                        <span class="font-medium text-slate-600">Serial Number:</span>
                        <span class="text-slate-800 font-mono text-sm">${request.serial_number}</span>
                    </div>
                ` : ''}
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Priority:</span>
                    <span class="text-slate-800 font-semibold ${getPriorityColorClass(request.priority)}">${request.priority?.toUpperCase()}</span>
                </div>
            </div>
        `;
    }
}

function getPriorityColorClass(priority) {
    const priorityColors = {
        'low': 'text-green-600',
        'medium': 'text-yellow-600',
        'high': 'text-orange-600',
        'urgent': 'text-red-600'
    };
    return priorityColors[priority] || 'text-slate-600';
}

// Global functions for modal actions
window.startServiceFromModal = async function(requestId) {
    try {
        console.log(`Starting service from modal for request ${requestId}`);
        closeServiceRequestModal();
        await startService(requestId);
    } catch (error) {
        console.error('Error in startServiceFromModal:', error);
        // Error is already handled in startService, just log here
    }
};

window.openCompletionFromModal = function(requestId) {
    closeServiceRequestModal();
    showJobCompletionModal(requestId);
};

// Parts and signature management
let availableParts = [];
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;

// Carousel management
let currentPartSlide = 0;
let totalPartSlides = 1;

async function loadAvailableParts() {
    console.log('=��� Loading available parts from technician inventory...');
    try {
        const response = await fetch('/api/technician/parts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('Parts API response status:', response.status);
        
        if (response.ok) {
            let parts = await response.json();
            console.log('G�� Loaded parts (raw):', parts);

            // If API returns merged central+tech inventory, prefer technician_stock where available
            parts = parts.map(p => {
                // normalize fields: some responses use `stock`, others `quantity`
                const centralStock = p.stock !== undefined ? Number(p.stock) : (p.quantity !== undefined ? Number(p.quantity) : 0);
                const techStock = p.technician_stock !== undefined ? Number(p.technician_stock) : 0;
                const displayStock = techStock > 0 ? techStock : centralStock;
                return Object.assign({}, p, {
                    stock: displayStock,
                    original_central_stock: centralStock,
                    technician_stock: techStock,
                    from_technician_inventory: techStock > 0
                });
            });

            availableParts = parts;
            console.log('G�� Loaded parts (normalized):', availableParts);
            updatePartSelectors();
            updatePartSearchFunctionality();
            return availableParts; // Return the parts for promise chaining
        } else {
            const errorData = await response.json();
            console.error('G�� Parts API error:', errorData);
            showToast('Failed to load parts inventory. Please try again.', 'error');
            return [];
        }
    } catch (error) {
        console.error('G�� Error loading parts:', error);
        showToast('Failed to load parts inventory. Please check your connection.', 'error');
        return [];
    }
}

function updatePartSearchFunctionality() {
    const searchInput = document.getElementById('partSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        filterPartSelectors(query);
    });
}

function filterPartSelectors(query) {
    const selectors = document.querySelectorAll('.part-name-select');
    
    selectors.forEach(selector => {
        const options = selector.querySelectorAll('option[value!=""]');
        options.forEach(option => {
            const partName = option.textContent.toLowerCase();
            const brand = option.dataset.brand ? option.dataset.brand.toLowerCase() : '';
            
            // Match either part name or brand
            if (partName.includes(query) || brand.includes(query)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    });
}

function updatePartSelectors() {
    console.log('=��� Updating part selectors with', availableParts.length, 'parts');
    
    // Update type selectors
    updateTypeSelectors();
    
    // Update parts summary
    updatePartsSummary();
    
    console.log('G�� Part selectors updated');
}

function updateTypeSelectors() {
    const typeSelectors = document.querySelectorAll('.part-type-select');
    console.log('Found', typeSelectors.length, 'type selectors');
    
    // The types are already in the HTML (consumable, printer_part), so we just need to ensure they're enabled
    typeSelectors.forEach((selector, index) => {
        console.log(`Type selector ${index + 1} ready`);
        selector.disabled = false;
    });
}

function updatePartsForType(typeSelector, selectedType) {
    const partEntry = typeSelector.closest('.part-entry');
    if (!partEntry) return;
    
    const partSelect = partEntry.querySelector('.part-name-select');
    if (!partSelect) return;
    
    console.log('?? Updating parts for type:', selectedType);
    console.log('?? Available parts:', availableParts);
    
    // Get printer brand from selected request
    const printerBrand = selectedRequest?.brand || selectedRequest?.printer_brand || selectedRequest?.printer?.brand;
    console.log('??? Printer brand for filtering:', printerBrand || 'NO BRAND - showing all parts');
    
    // Reset part selector
    partSelect.innerHTML = '<option value="">Select part/consumable...</option>';
    partSelect.disabled = !selectedType;
    
    if (!selectedType) {
        return;
    }
    
    // Define category groups for filtering
    const consumableCategories = [
        'toner', 'ink', 'ink-bottle', 'drum', 'drum-cartridge', 
        'other-consumable', 'paper', 'cleaning-supplies'
    ];
    
    const printerPartCategories = [
        'fuser', 'roller', 'printhead', 'transfer-belt', 'maintenance-unit', 
        'power-board', 'mainboard', 'maintenance-box', 'tools', 'cables', 
        'batteries', 'lubricants', 'replacement-parts', 'software', 'labels', 'other'
    ];
    
    // Filter parts by selected type using category AND brand
    let partsForType;
    if (selectedType === 'consumable') {
        partsForType = availableParts.filter(part => {
            const categoryMatch = consumableCategories.includes(part.category);
            if (!categoryMatch) return false;
            
            // If no printer brand, show all parts (for walk-in without brand info)
            if (!printerBrand) return true;
            
            // Brand filtering: universal parts OR parts matching printer brand
            const isUniversal = part.is_universal == 1;
            const brandMatch = part.brand && 
                part.brand.toLowerCase() === printerBrand.toLowerCase();
            
            const included = isUniversal || brandMatch;
            if (!included) {
                console.log(`? Filtered out: ${part.name} (brand: ${part.brand}, universal: ${part.is_universal})`);
            }
            return included;
        });
    } else if (selectedType === 'printer_part') {
        partsForType = availableParts.filter(part => {
            const categoryMatch = printerPartCategories.includes(part.category);
            if (!categoryMatch) return false;
            
            // If no printer brand, show all parts (for walk-in without brand info)
            if (!printerBrand) return true;
            
            // Brand filtering: universal parts OR parts matching printer brand
            const isUniversal = part.is_universal == 1;
            const brandMatch = part.brand && 
                part.brand.toLowerCase() === printerBrand.toLowerCase();
            
            const included = isUniversal || brandMatch;
            if (!included) {
                console.log(`? Filtered out: ${part.name} (brand: ${part.brand}, universal: ${part.is_universal})`);
            }
            return included;
        });
    } else {
        partsForType = [];
    }
    
    console.log(`? Filtered to ${partsForType.length} parts for type: ${selectedType}`);
    if (printerBrand) {
        console.log(`?? Brand filter active: Only showing ${printerBrand} parts + Universal parts`);
    }
    
    // Get the part entry container
    const partsGridContainer = partEntry.querySelector('.parts-grid-container');
    const partsGrid = partEntry.querySelector('.parts-grid');
    const noPartsMessage = partEntry.querySelector('.no-parts-message');
    const searchInput = partEntry.querySelector('.part-search-input');
    const selectedPartDisplay = partEntry.querySelector('.selected-part-display');
    
    // Clear grid
    partsGrid.innerHTML = '';
    
    if (partsForType.length === 0) {
        searchInput.disabled = true;
        searchInput.placeholder = 'No parts available';
        partsGridContainer.classList.add('hidden');
        return;
    }
    
    // Enable search but keep grid hidden initially
    searchInput.disabled = false;
    searchInput.placeholder = `Search ${partsForType.length} available parts...`;
    partsGridContainer.classList.add('hidden');
    
    // Render part cards
    partsForType.forEach(part => {
        const card = document.createElement('div');
        card.className = 'part-card p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all cursor-pointer';
        card.dataset.id = part.id;
        card.dataset.name = part.name;
        card.dataset.stock = part.stock;
        card.dataset.unit = part.unit || 'pieces';
        card.dataset.category = part.category;
        card.dataset.brand = part.brand || '';
        card.dataset.isUniversal = part.is_universal || 0;
        
        const stockColor = part.stock > 10 ? 'text-green-600' : part.stock > 0 ? 'text-orange-600' : 'text-red-600';
        const universalBadge = part.is_universal == 1 ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">?? Universal</span>' : '';
        const brandBadge = part.brand ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">${part.brand}</span>` : '';
        
        card.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800 text-sm mb-1 truncate">${part.name}</div>
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${brandBadge}
                        ${universalBadge}
                    </div>
                    <div class="text-xs ${stockColor} font-medium">
                        <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                        ${part.stock} ${part.unit || 'pieces'} available
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;
        
        // Click handler to select part
        card.addEventListener('click', function() {
            selectPartFromCard(partEntry, this);
        });
        
        partsGrid.appendChild(card);
    });
    
    // Setup search functionality
    setupPartSearch(partEntry, partsForType);
    
    console.log('G�� Added', partsForType.length, 'parts for type', selectedType);
}

function selectPartFromCard(partEntry, card) {
    const partSelect = partEntry.querySelector('.part-name-select');
    const selectedPartDisplay = partEntry.querySelector('.selected-part-display');
    const partsGridContainer = partEntry.querySelector('.parts-grid-container');
    const searchInput = partEntry.querySelector('.part-search-input');
    const unitSelect = partEntry.querySelector('.part-unit');
    
    // Clear existing options and add the selected one
    partSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = card.dataset.name;
    option.dataset.id = card.dataset.id;
    option.dataset.stock = card.dataset.stock;
    option.dataset.unit = card.dataset.unit;
    option.dataset.category = card.dataset.category;
    option.dataset.brand = card.dataset.brand;
    option.selected = true;
    partSelect.appendChild(option);
    
    // Automatically set unit from part's specification
    if (unitSelect && card.dataset.unit) {
        unitSelect.value = card.dataset.unit.toLowerCase();
        unitSelect.disabled = true; // Make it read-only since unit is defined by the part
        unitSelect.style.backgroundColor = '#f1f5f9'; // Visual indication it's locked
        unitSelect.style.cursor = 'not-allowed';
    }
    
    // Show selected part display
    const selectedPartName = selectedPartDisplay.querySelector('.selected-part-name');
    const selectedPartInfo = selectedPartDisplay.querySelector('.selected-part-info');
    selectedPartName.textContent = card.dataset.name;
    selectedPartInfo.textContent = `${card.dataset.brand || 'Universal'} � ${card.dataset.stock} ${card.dataset.unit} available`;
    selectedPartDisplay.classList.remove('hidden');
    
    // Hide grid and search
    partsGridContainer.classList.add('hidden');
    searchInput.value = '';
    
    // Trigger change event for existing handlers
    partSelect.dispatchEvent(new Event('change'));
    
    // Setup clear button
    const clearBtn = selectedPartDisplay.querySelector('.clear-part-btn');
    clearBtn.onclick = function() {
        selectedPartDisplay.classList.add('hidden');
        partsGridContainer.classList.remove('hidden');
        partSelect.value = '';
        // Re-enable unit selector when part is cleared
        if (unitSelect) {
            unitSelect.disabled = false;
            unitSelect.style.backgroundColor = '';
            unitSelect.style.cursor = '';
            unitSelect.value = 'pieces'; // Reset to default
        }
        partSelect.dispatchEvent(new Event('change'));
    };
}

function setupPartSearch(partEntry, partsData) {
    const searchInput = partEntry.querySelector('.part-search-input');
    const partsGrid = partEntry.querySelector('.parts-grid');
    const partsGridContainer = partEntry.querySelector('.parts-grid-container');
    const noPartsMessage = partEntry.querySelector('.no-parts-message');
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const cards = partsGrid.querySelectorAll('.part-card');
        
        // If search is empty, hide the grid
        if (!query) {
            partsGridContainer.classList.add('hidden');
            return;
        }
        
        // Show grid when user starts typing
        partsGridContainer.classList.remove('hidden');
        
        let visibleCount = 0;
        cards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const brand = card.dataset.brand.toLowerCase();
            const category = card.dataset.category.toLowerCase();
            
            if (name.includes(query) || brand.includes(query) || category.includes(query)) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide no results message
        if (visibleCount === 0) {
            noPartsMessage.classList.remove('hidden');
            partsGrid.classList.add('hidden');
        } else {
            noPartsMessage.classList.add('hidden');
            partsGrid.classList.remove('hidden');
        }
    });
}

function setupPartManagement() {
    const addPartBtn = document.getElementById('addPartBtn');
    addPartBtn?.addEventListener('click', addPartEntry);
    
    // Setup handlers for existing part entries
    const existingEntries = document.querySelectorAll('.part-entry');
    existingEntries.forEach(entry => {
        setupPartEntryHandlers(entry);
    });
    
    // Add remove handlers to existing part entries
    updatePartRemoveHandlers();
    
    // Initialize search functionality
    updatePartSearchFunctionality();
    
    // Setup carousel navigation
    setupCarouselNavigation();
}

function addPartEntry() {
    const container = document.getElementById('partsContainer');
    const partNumber = container.querySelectorAll('.part-entry').length + 1;
    const entry = document.createElement('div');
    entry.className = 'part-entry min-w-full bg-white rounded-xl p-4 border-2 border-purple-100 hover:border-purple-200 shadow-sm transition-all duration-200';
    entry.innerHTML = `
        <!-- Part entry header -->
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-purple-100">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                </div>
                <span class="text-xs font-semibold text-slate-700">Part #<span class="part-number">${partNumber}</span></span>
            </div>
            <button type="button" class="remove-part-btn text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>

        <!-- Form fields - mobile optimized stack layout -->
        <div class="space-y-3">
            <!-- Part Type Selection (First Step) -->
            <div>
                <label class="block text-xs md:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </svg>
                    Part Type
                </label>
                <div class="relative">
                    <select class="part-type-select w-full p-2.5 md:p-3 pl-3 pr-10 border-2 border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white text-sm md:text-base font-medium text-slate-700 appearance-none cursor-pointer hover:border-indigo-300 transition-all touch-manipulation">
                        <option value="">Select type...</option>
                        <option value="consumable">Consumable</option>
                        <option value="printer_part">Printer Part</option>
                    </select>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Part Selection (Second Step) -->
            <div>
                <label class="block text-xs md:text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a2 2 0 012-2z"></path>
                    </svg>
                    Select Part/Consumable
                </label>
                
                <!-- Search Box -->
                <div class="relative mb-3">
                    <input type="text" class="part-search-input w-full p-2.5 md:p-3 pl-10 pr-3 border-2 border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white text-sm md:text-base text-slate-700 placeholder-slate-400" 
                           placeholder="Search parts..." disabled>
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
                
                <!-- Selected Part Display -->
                <div class="selected-part-display hidden p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg mb-2">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="font-semibold text-slate-700 text-sm selected-part-name"></div>
                            <div class="text-xs text-slate-500 selected-part-info"></div>
                        </div>
                        <button type="button" class="clear-part-btn text-red-500 hover:text-red-600 p-1">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Parts Grid -->
                <div class="parts-grid-container max-h-64 overflow-y-auto border-2 border-slate-200 rounded-lg p-2 bg-slate-50 hidden">
                    <div class="parts-grid grid grid-cols-1 gap-2"></div>
                    <div class="no-parts-message hidden text-center py-8 text-slate-400 text-sm">
                        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </svg>
                        No parts available
                    </div>
                </div>
                
                <!-- Hidden select for compatibility -->
                <select class="part-name-select hidden" disabled>
                    <option value="">Select type first...</option>
                </select>
                
                <!-- Stock info -->
                <div class="part-stock-info mt-1.5 text-xs md:text-sm font-medium"></div>
            </div>
            
            <!-- Quantity and Unit - side by side on mobile -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Quantity -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                        </svg>
                        Quantity
                    </label>
                    <div class="relative">
                        <input type="number" class="part-quantity w-full p-3 pl-3.5 pr-3.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm font-semibold text-slate-700 hover:border-blue-300 transition-all" 
                               min="1" placeholder="1" value="1" max="999">
                    </div>
                    <div class="availability-text text-xs mt-1.5 font-medium"></div>
                </div>
                
                <!-- Unit -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        Unit
                    </label>
                    <div class="relative">
                        <select class="part-unit w-full p-3 pl-3.5 pr-9 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:border-green-300 transition-all">
                            <option value="pieces">Pieces</option>
                            <option value="ml">ML</option>
                            <option value="liters">Liters</option>
                            <option value="grams">Grams</option>
                            <option value="kg">KG</option>
                            <option value="bottles">Bottles</option>
                            <option value="cartridges">Cartridges</option>
                            <option value="rolls">Rolls</option>
                            <option value="sheets">Sheets</option>
                            <option value="sets">Sets</option>
                        </select>
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(entry);
    
    // Update part numbers for all entries
    updatePartNumbers();
    
    // Update selectors for the new entry
    updatePartSelectors();
    
    // Add enhanced event listeners for the new entry
    setupPartEntryHandlers(entry);
    
    // Update remove handlers
    updatePartRemoveHandlers();
    
    // Update parts summary
    updatePartsSummary();
    
    // Slide to the new part
    totalPartSlides = container.querySelectorAll('.part-entry').length;
    currentPartSlide = totalPartSlides - 1;
    updateCarousel();
}

// Helper function to update part numbers
function updatePartNumbers() {
    const entries = document.querySelectorAll('.part-entry');
    entries.forEach((entry, index) => {
        const numberSpan = entry.querySelector('.part-number');
        if (numberSpan) {
            numberSpan.textContent = index + 1;
        }
    });
    
    // Update total parts selected count
    updateCarouselInfo();
}

// Carousel navigation functions
function updateCarousel() {
    const container = document.getElementById('partsContainer');
    const entries = container.querySelectorAll('.part-entry');
    totalPartSlides = entries.length;
    
    // Calculate transform
    const translateX = -(currentPartSlide * 100);
    container.style.transform = `translateX(${translateX}%)`;
    
    // Update navigation info
    updateCarouselInfo();
    
    // Update button states
    updateCarouselButtons();
    
    console.log(`Carousel: Slide ${currentPartSlide + 1} of ${totalPartSlides}`);
}

function updateCarouselInfo() {
    const currentIndexEl = document.getElementById('currentPartIndex');
    const totalPartsEl = document.getElementById('totalParts');
    const totalSelectedEl = document.getElementById('totalPartsSelected');
    
    if (currentIndexEl) currentIndexEl.textContent = currentPartSlide + 1;
    if (totalPartsEl) totalPartsEl.textContent = totalPartSlides;
    
    // Count selected parts (parts with values)
    const entries = document.querySelectorAll('.part-entry');
    let selectedCount = 0;
    entries.forEach(entry => {
        const partSelect = entry.querySelector('.part-name-select');
        if (partSelect && partSelect.value) {
            selectedCount++;
        }
    });
    if (totalSelectedEl) totalSelectedEl.textContent = `${selectedCount} selected`;
}

function updateCarouselButtons() {
    const prevBtn = document.getElementById('prevPartBtn');
    const nextBtn = document.getElementById('nextPartBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPartSlide === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPartSlide === totalPartSlides - 1;
    }
}

function navigateToPreviousPart() {
    if (currentPartSlide > 0) {
        currentPartSlide--;
        updateCarousel();
    }
}

function navigateToNextPart() {
    if (currentPartSlide < totalPartSlides - 1) {
        currentPartSlide++;
        updateCarousel();
    }
}

function setupCarouselNavigation() {
    const prevBtn = document.getElementById('prevPartBtn');
    const nextBtn = document.getElementById('nextPartBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', navigateToPreviousPart);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', navigateToNextPart);
    }
    
    // Initialize carousel state
    updateCarousel();
}

function setupPartEntryHandlers(entry) {
    const typeSelect = entry.querySelector('.part-type-select');
    const partSelect = entry.querySelector('.part-name-select');
    const quantityInput = entry.querySelector('.part-quantity');
    const unitSelect = entry.querySelector('.part-unit');
    const availabilityText = entry.querySelector('.availability-text');
    const stockInfo = entry.querySelector('.part-stock-info');
    
    // Type selection handler - handles when type is changed
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            console.log('Type selected:', selectedType);
            
            // Reset part selection when type changes
            if (partSelect) {
                partSelect.value = '';
                stockInfo.innerHTML = '';
                availabilityText.textContent = '';
                quantityInput.disabled = true;
            }
            
            // Update parts based on selected type
            updatePartsForType(this, selectedType);
            
            updatePartsSummary();
        });
    }
    
    // Enhanced part selection handler
    if (partSelect) {
        partSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const stock = parseInt(selectedOption.dataset.stock);
                const unit = selectedOption.dataset.unit || 'pieces';
                const category = selectedOption.dataset.category;
                const brand = selectedOption.dataset.brand;
                
                // Update unit selector
                unitSelect.value = unit;
                
                // Update quantity max and stock info
                quantityInput.max = stock;
                
                // Show detailed stock information with color-coded badges
                let stockBadgeColor = 'green';
                let stockIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
                
                if (stock === 0) {
                    stockBadgeColor = 'red';
                    stockIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
                } else if (stock < 10) {
                    stockBadgeColor = 'orange';
                    stockIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
                }
                
                stockInfo.innerHTML = `
                    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${stockBadgeColor}-50 border border-${stockBadgeColor}-200">
                        <svg class="w-4 h-4 text-${stockBadgeColor}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${stockIcon}
                        </svg>
                        <span class="text-${stockBadgeColor}-700 font-semibold text-xs">
                            ${stock > 0 ? `Available: ${stock} ${unit}` : 'Out of Stock'}
                        </span>
                        ${brand ? `<span class="text-slate-500 text-xs">� ${brand}</span>` : ''}
                        ${category ? `<span class="text-slate-500 text-xs">� ${category}</span>` : ''}
                    </div>
                `;
                
                // Validate current quantity
                validateQuantity(quantityInput, stock, availabilityText);
                
                // Enable quantity input
                quantityInput.disabled = false;
                quantityInput.focus();
            } else {
                // Reset when no part selected
                stockInfo.innerHTML = '';
                availabilityText.textContent = '';
                quantityInput.max = 999;
                quantityInput.disabled = true;
            }
            
            updatePartsSummary();
        });
    }
    
    // Enhanced quantity validation
    quantityInput.addEventListener('input', function() {
        const selectedOption = partSelect.options[partSelect.selectedIndex];
        if (selectedOption.value) {
            const stock = parseInt(selectedOption.dataset.stock);
            validateQuantity(this, stock, availabilityText);
        }
        updatePartsSummary();
    });
    
    // Unit change handler
    unitSelect.addEventListener('change', function() {
        updatePartsSummary();
    });
    
    // Initially disable quantity input
    quantityInput.disabled = true;
}

function validateQuantity(quantityInput, maxStock, availabilityText) {
    const value = parseInt(quantityInput.value);
    
    if (value > maxStock) {
        quantityInput.value = maxStock;
        availabilityText.innerHTML = `
            <div class="flex items-center gap-1 text-red-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span class="font-medium">Maximum: ${maxStock}</span>
            </div>
        `;
    } else if (value <= maxStock && value > 0) {
        const remaining = maxStock - value;
        availabilityText.innerHTML = `
            <div class="flex items-center gap-1 text-blue-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="font-medium">Remaining: ${remaining}</span>
            </div>
        `;
    } else {
        availabilityText.textContent = '';
    }
}

function updatePartsSummary() {
    const summaryContainer = document.getElementById('partsSummary');
    const summaryList = document.getElementById('partsSummaryList');
    
    if (!summaryContainer || !summaryList) return;
    
    const partEntries = document.querySelectorAll('.part-entry');
    const selectedParts = [];
    
    partEntries.forEach(entry => {
        const brandSelect = entry.querySelector('.part-brand-select');
        const partSelect = entry.querySelector('.part-name-select');
        const quantityInput = entry.querySelector('.part-quantity');
        const unitSelect = entry.querySelector('.part-unit');
        
        if (partSelect.value && quantityInput.value && parseInt(quantityInput.value) > 0) {
            const selectedOption = partSelect.options[partSelect.selectedIndex];
            const brand = brandSelect ? brandSelect.value : (selectedOption.dataset.brand || '');
            
            selectedParts.push({
                name: partSelect.value,
                brand: brand,
                quantity: parseInt(quantityInput.value),
                unit: unitSelect.value
            });
        }
    });
    
    if (selectedParts.length > 1) {
        summaryList.innerHTML = selectedParts.map(part => 
            `<div class="flex justify-between items-center">
                <div class="flex flex-col">
                    <span>${part.name}</span>
                    ${part.brand ? `<span class="text-xs text-slate-500">Brand: ${part.brand}</span>` : ''}
                </div>
                <span class="font-medium">${part.quantity} ${part.unit}</span>
            </div>`
        ).join('');
        summaryContainer.classList.remove('hidden');
    } else {
        summaryContainer.classList.add('hidden');
    }
}

function updatePartRemoveHandlers() {
    const removeButtons = document.querySelectorAll('.remove-part-btn');
    removeButtons.forEach(btn => {
        btn.onclick = () => {
            const entry = btn.closest('.part-entry');
            const container = document.getElementById('partsContainer');
            
            // Keep at least one entry
            if (container?.children.length > 1) {
                const currentIndex = Array.from(container.children).indexOf(entry);
                entry?.remove();
                
                // Update carousel state
                totalPartSlides = container.children.length;
                if (currentPartSlide >= totalPartSlides) {
                    currentPartSlide = totalPartSlides - 1;
                }
                if (currentPartSlide === currentIndex && currentPartSlide > 0) {
                    currentPartSlide--;
                }
                
                // Update part numbers after removal
                updatePartNumbers();
                // Update carousel
                updateCarousel();
                // Update parts summary
                updatePartsSummary();
            } else {
                // Show a friendly message if trying to remove the last entry
                const stockInfo = entry.querySelector('.part-stock-info');
                if (stockInfo) {
                    stockInfo.innerHTML = `
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-blue-700 font-semibold text-xs">At least one part entry is required</span>
                        </div>
                    `;
                    setTimeout(() => {
                        stockInfo.innerHTML = '';
                    }, 3000);
                }
            }
        };
    });
}

function setupSignatureCanvas() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;
    
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.strokeStyle = '#1e293b';
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    
    // Mouse events
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        startDrawing({offsetX: x, offsetY: y});
    });
    
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        draw({offsetX: x, offsetY: y});
    });
    
    signatureCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    // Clear signature button
    const clearBtn = document.getElementById('clearSignature');
    clearBtn?.addEventListener('click', clearSignature);
}

function startDrawing(e) {
    isDrawing = true;
    signatureCtx.beginPath();
    signatureCtx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawing) return;
    signatureCtx.lineTo(e.offsetX, e.offsetY);
    signatureCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearSignature() {
    if (signatureCtx && signatureCanvas) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

function isSignatureEmpty() {
    if (!signatureCanvas) return true;
    
    const imageData = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
    return imageData.data.every(pixel => pixel === 0);
}

async function handleJobCompletion(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitCompletion');
    const originalText = submitBtn?.innerHTML;
    
    try {
        // Validate form
        const serviceActions = document.getElementById('serviceActions').value.trim();
        
        if (!serviceActions) {
            showToast('Please describe the actions performed', 'error');
            return;
        }
        
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Submitting for Approval...
            `;
        }
        
        // Collect and validate parts data
        const parts = [];
        const partEntries = document.querySelectorAll('.part-entry');
        let hasValidationErrors = false;
        
        for (const entry of partEntries) {
            const brandSelect = entry.querySelector('.part-brand-select');
            const nameSelect = entry.querySelector('.part-name-select');
            const qtyInput = entry.querySelector('.part-quantity');
            const unitSelect = entry.querySelector('.part-unit');
            
            if (nameSelect.value && qtyInput.value && parseInt(qtyInput.value) > 0) {
                const selectedOption = nameSelect.options[nameSelect.selectedIndex];
                const availableStock = parseInt(selectedOption.dataset.stock || 0);
                const requestedQty = parseInt(qtyInput.value);
                const brand = brandSelect ? brandSelect.value : (selectedOption.dataset.brand || '');
                
                // Real-time validation check
                if (requestedQty > availableStock) {
                    showToast(`Insufficient inventory for ${nameSelect.value}. Available: ${availableStock}, Requested: ${requestedQty}`, 'error');
                    
                    // Highlight the problematic entry
                    entry.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
                    setTimeout(() => {
                        entry.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
                    }, 3000);
                    
                    hasValidationErrors = true;
                    break;
                }
                
                parts.push({
                    name: nameSelect.value,
                    brand: brand,
                    qty: requestedQty,
                    unit: unitSelect.value || 'pieces'
                });
            }
        }
        
        if (hasValidationErrors) {
            return;
        }
        
        // Show confirmation if no parts were selected
        if (parts.length === 0) {
            const confirmNoparts = confirm(
                'No parts were selected for this service. This usually means the issue was resolved without replacing any components. Do you want to continue?'
            );
            if (!confirmNoparts) {
                return;
            }
        }
        
        // Prepare request data
        const completionData = {
            actions: serviceActions,
            notes: document.getElementById('additionalNotes').value.trim(),
            parts: parts
        };
        
        console.log('Submitting completion data:', completionData);
        
        // Submit completion
        const response = await fetch(`/api/technician/service-requests/${selectedRequest.id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(completionData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Failed to submit service completion (Status: ${response.status})`);
        }
        
        // Success handling
        console.log('Service completion submitted successfully:', result);
        
        // Show detailed success message
        let successMessage = 'G�� Service completion submitted successfully!';
        if (parts.length > 0) {
            successMessage += ` ${parts.length} part${parts.length > 1 ? 's' : ''} recorded.`;
        }
        showToast(successMessage, 'success');
        
        // Show approval workflow info
        setTimeout(() => {
            showToast('=��� Your Institution Admin will review and approve this service completion.', 'info');
        }, 2000);
        
        closeJobCompletionModal();
        
        // Refresh data to get latest status from server
        await loadServiceRequests();
        
    } catch (error) {
        console.error('Error completing service:', error);
        
        // Show specific error message based on error type
        let errorMessage = 'Failed to submit service completion.';
        
        // Don't auto-logout - global interceptor handles this
        if (error.message.includes('403')) {
            errorMessage = 'You do not have permission to complete this service request.';
        } else if (error.message.includes('400')) {
            errorMessage = error.message.replace('Error: ', '');
        } else if (error.message.includes('500')) {
            errorMessage = 'Server error occurred. Please try again or contact support.';
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        // Restore button state
        if (submitBtn && originalText) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Debug functions for console testing
window.testCloseCompletion = function() {
    console.log('Testing close completion modal');
    closeJobCompletionModal();
};

window.debugModalElements = function() {
    console.log('=== Modal Debug Info ===');
    console.log('Service modal:', document.getElementById('serviceRequestModal'));
    console.log('Completion modal:', document.getElementById('jobCompletionModal'));
    console.log('Service close button:', document.getElementById('closeServiceModal'));
    console.log('Completion close button:', document.getElementById('closeCompletionModal'));
    console.log('Cancel button:', document.getElementById('cancelCompletion'));
    console.log('Modal handlers setup:', window._modalHandlersSetup);
    
    // Test if buttons have onclick handlers
    const closeBtn = document.getElementById('closeCompletionModal');
    const cancelBtn = document.getElementById('cancelCompletion');
    console.log('Close button onclick:', closeBtn ? closeBtn.onclick : 'Button not found');
};

// ===== Association Rule Mining Functions =====

// Cache for ARM results
const armCache = new Map();

/**
 * Toggle analytics section and load ARM data if needed
 */
async function toggleAnalytics(requestId, printerBrand, printerModel) {
    const section = document.getElementById(`analytics-section-${requestId}`);
    const content = document.getElementById(`analytics-content-${requestId}`);
    const badge = document.getElementById(`analytics-badge-${requestId}`);
    const arrow = section.querySelector('svg:last-child');
    
    if (!content || !section) return;
    
    // Toggle expanded state
    const isExpanded = section.classList.contains('expanded');
    
    if (isExpanded) {
        // Collapse
        content.classList.add('hidden');
        arrow.classList.remove('rotate-180');
        section.classList.remove('expanded');
    } else {
        // Expand
        content.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        section.classList.add('expanded');
        
        // Load ARM data if not already loaded
        if (!armCache.has(`${printerBrand}-${printerModel}`)) {
            await loadARMRecommendations(requestId, printerBrand, printerModel);
        } else {
            // Display cached data
            const cachedData = armCache.get(`${printerBrand}-${printerModel}`);
            displayARMResults(requestId, cachedData);
        }
    }
}

/**
 * Load ARM recommendations from API
 */
async function loadARMRecommendations(requestId, printerBrand, printerModel) {
    const content = document.getElementById(`analytics-content-${requestId}`);
    const badge = document.getElementById(`analytics-badge-${requestId}`);
    
    if (!content) return;
    
    try {
        // Show loading state
        content.innerHTML = `
            <div class="flex items-center justify-center py-6">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p class="text-blue-600 text-xs">Analyzing service patterns...</p>
                </div>
            </div>
        `;
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/arm/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                printer_brand: printerBrand,
                printer_model: printerModel,
                min_support: 0.2,
                min_confidence: 0.5
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the results
        armCache.set(`${printerBrand}-${printerModel}`, data);
        
        // Display results
        displayARMResults(requestId, data);
        
    } catch (error) {
        console.error('Error loading ARM recommendations:', error);
        content.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <svg class="w-5 h-5 text-yellow-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p class="text-yellow-700 text-xs font-medium">Unable to load recommendations</p>
                <p class="text-yellow-600 text-[10px] mt-1">Insufficient historical data or service unavailable</p>
            </div>
        `;
    }
}

/**
 * Display ARM results in the UI
 */
function displayARMResults(requestId, data) {
    const content = document.getElementById(`analytics-content-${requestId}`);
    const badge = document.getElementById(`analytics-badge-${requestId}`);
    
    if (!content) return;
    
    if (!data.success || !data.rules || data.rules.length === 0) {
        content.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <svg class="w-5 h-5 text-blue-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-blue-700 text-xs font-medium">${data.message || 'No recommendations available'}</p>
                <p class="text-blue-600 text-[10px] mt-1">Based on ${data.total_transactions || 0} historical service(s)</p>
            </div>
        `;
        return;
    }
    
    // Update badge
    if (badge) {
        badge.textContent = `${data.rules.length} tips`;
        badge.classList.remove('hidden');
    }
    
    // Collect all unique parts from rules
    const allParts = new Set();
    data.rules.forEach(rule => {
        rule.antecedents.forEach(part => allParts.add(part));
        rule.consequents.forEach(part => allParts.add(part));
    });
    
    // Count frequency of each part
    const partFrequency = {};
    allParts.forEach(part => {
        partFrequency[part] = data.rules.filter(rule => 
            rule.antecedents.includes(part) || rule.consequents.includes(part)
        ).length;
    });
    
    // Sort parts by frequency (most common first)
    const sortedParts = Array.from(allParts).sort((a, b) => partFrequency[b] - partFrequency[a]);
    
    // Get highest confidence for overall display
    const highestConfidence = Math.max(...data.rules.map(r => r.confidence));
    const confidencePct = (highestConfidence * 100).toFixed(0);
    
    let html = `
        <div class="space-y-2">
            <!-- Header -->
            <div class="bg-white border-2 border-blue-300 rounded-lg p-2">
                <div class="flex items-center justify-between mb-1">
                    <h4 class="font-bold text-blue-900 text-sm">Parts You'll Likely Need</h4>
                    <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        ${confidencePct}% Match
                    </span>
                </div>
                <p class="text-slate-600 text-xs leading-relaxed">
                    Based on <strong class="text-blue-700">${data.total_transactions} similar repairs</strong> of this printer model, 
                    technicians typically used these parts together:
                </p>
            </div>
            
            <!-- Parts List -->
            <div class="space-y-1.5">
    `;
    
    // Display parts in clean list format
    sortedParts.slice(0, 8).forEach((part, index) => {
        const frequency = partFrequency[part];
        const isHighPriority = frequency >= data.rules.length * 0.6;
        
        html += `
            <div class="bg-white border ${isHighPriority ? 'border-green-300' : 'border-slate-200'} rounded-lg p-2 flex items-center gap-2">
                <div class="flex-shrink-0 w-6 h-6 ${isHighPriority ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'} rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    ${index + 1}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800 text-sm mb-0.5">${part}</div>
                    <p class="text-slate-500 text-[10px]">
                        ${isHighPriority ? 
                            `<span class="text-green-700 font-semibold">High Priority</span> - Used in most similar repairs` : 
                            `Frequently paired with other parts`
                        }
                    </p>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <!-- Info Box -->
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-2 mt-2">
                <div class="flex-1">
                    <p class="text-amber-900 font-semibold text-xs mb-0.5">💡 Why These Parts?</p>
                    <p class="text-amber-800 text-[10px] leading-relaxed">
                        Our AI analyzed <strong>${data.total_transactions} past service jobs</strong> on <strong>${data.printer_brand} ${data.printer_model}</strong> 
                        and found these parts are commonly used together. Bringing them now can save you a second trip!
                    </p>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

// Make functions globally accessible
window.toggleAnalytics = toggleAnalytics;
window.loadARMRecommendations = loadARMRecommendations;
window.displayARMResults = displayARMResults;

window.forceSetupModalHandlers = function() {
    console.log('Forcing modal handler setup...');
    window._modalHandlersSetup = false; // Reset flag
    setupModalEventHandlers();
};







