/**
 * Technician Service Requests Page
 * Enhanced with Start Service, Complete Service, and Job Order functionality
 */

// Make these globally accessible for search functionality
window.currentServiceRequests = [];
let selectedRequest = null;

// Pagination variables
let currentPage = 1;
const itemsPerPage = 5; // Maximum 5 cards per page
let totalPages = 1;

// Make refresh function globally available
window.refreshRequestsPage = function() {
    console.log('🔄 Refreshing requests page');
    loadServiceRequests();
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ Technician Requests page loaded');
    
    // Check authentication first
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.log('❌ Authentication missing, redirecting to login...');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Verify user role
    try {
        const userData = JSON.parse(user);
        if (userData.role !== 'technician') {
            console.log('❌ User is not a technician, redirecting...');
            window.location.href = '/pages/login.html';
            return;
        }
    } catch (e) {
        console.log('❌ Invalid user data, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Set global flag that requests page is loaded
    window.requestsPageLoaded = true;
    
    // Load service requests immediately
    loadServiceRequests();
    
    // Set up search functionality with retry
    let searchSetupAttempts = 0;
    const maxAttempts = 10;
    
    function trySetupSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            console.log('✅ Search input found, setting up search functionality');
            setupSearchFunctionality();
        } else {
            searchSetupAttempts++;
            if (searchSetupAttempts < maxAttempts) {
                console.log(`⏳ Search input not found yet, retrying (${searchSetupAttempts}/${maxAttempts})...`);
                setTimeout(trySetupSearch, 200);
            } else {
                console.error('❌ Search input not found after', maxAttempts, 'attempts');
            }
        }
    }
    
    trySetupSearch();
    
    // Set up service request modal
    setupServiceRequestModal();
    
    // Set up job completion modal
    setupJobCompletionModal();
    
    // Set up global modal event handlers
    setupModalEventHandlers();
    
    // Set up pagination event handlers
    setupPaginationHandlers();
    
    // Set up periodic refresh (every 30 seconds)
    setInterval(loadServiceRequests, 30000);
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
    console.log('🔄 Refreshing requests page');
    loadServiceRequests();
};

/**
 * Load service requests from the server
 */
async function loadServiceRequests() {
    try {
        showLoadingState();
        
        const token = localStorage.getItem('token');
        console.log('🔑 Auth token:', token ? 'Present' : 'Missing');
        
        const response = await fetch('/api/technician/service-requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch service requests: ${response.statusText}`);
        }
        
        const requests = await response.json();
        console.log('📋 Received requests data:', requests);
        window.currentServiceRequests = requests;
        
        console.log(`✓ Loaded ${requests.length} service requests`);
        
        displayServiceRequests(requests);
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ Error loading service requests:', error);
        
        // If error is 401 (unauthorized), redirect to login
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('🔐 Authentication failed, redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/login.html';
            return;
        }
        
        // For other errors, show empty state with retry option
        window.currentServiceRequests = [];
        console.log('❌ No service requests available');
        
        displayServiceRequests([]);
        hideLoadingState();
        
        // Show error message to user
        showToast('Failed to load service requests. Please check your internet connection and try again.', 'error');
    }
}

/**
 * Display service requests in both desktop and mobile views
 * Made global for search functionality
 */
window.displayServiceRequests = function(requests) {
    console.log('🎨 displayServiceRequests called with:', requests);
    console.log('🎨 currentPage at START of displayServiceRequests:', currentPage);
    
    const mobileContainer = document.getElementById('serviceRequestsCardsMobile');
    const desktopContainer = document.getElementById('serviceRequestsTableDesktop');
    const mobileCount = document.getElementById('mobile-requests-count');
    const desktopCount = document.getElementById('desktop-requests-count');
    
    console.log('📱 Mobile container found:', !!mobileContainer);
    console.log('💻 Desktop container found:', !!desktopContainer);
    console.log('📊 Mobile count element found:', !!mobileCount);
    console.log('📊 Desktop count element found:', !!desktopCount);
    
    // Update counts
    if (mobileCount) mobileCount.textContent = `${requests.length} requests`;
    if (desktopCount) desktopCount.textContent = `${requests.length} requests`;
    
    if (requests.length === 0) {
        console.log('⚠️ No requests to display, showing empty state');
        showEmptyState();
        hidePagination();
        return;
    }
    
    // Hide empty state when showing requests
    const emptyState = document.getElementById('requests-emptyState');
    const errorState = document.getElementById('requests-errorState');
    if (emptyState) emptyState.classList.add('hidden');
    if (errorState) errorState.classList.add('hidden');
    
    console.log(`🔄 Generating UI for ${requests.length} requests`);
    
    // Calculate pagination
    totalPages = Math.ceil(requests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRequests = requests.slice(startIndex, endIndex);
    
    console.log(`📄 Page ${currentPage} of ${totalPages}, showing ${startIndex + 1}-${Math.min(endIndex, requests.length)} of ${requests.length}`);
    
    // Generate mobile cards (with pagination)
    if (mobileContainer) {
        const mobileHTML = paginatedRequests.map(request => createMobileRequestCard(request)).join('');
        console.log('📱 Generated mobile HTML length:', mobileHTML.length);
        mobileContainer.innerHTML = mobileHTML;
        console.log('📱 Mobile container updated');
    }
    
    // Generate desktop table rows (show all on desktop)
    if (desktopContainer) {
        const desktopHTML = requests.map(request => createDesktopRequestRow(request)).join('');
        console.log('💻 Generated desktop HTML length:', desktopHTML.length);
        desktopContainer.innerHTML = desktopHTML;
        console.log('💻 Desktop container updated');
    }
    
    // Update pagination UI
    updatePaginationUI(requests.length);
    
    // Add click handlers for viewing details
    addRequestClickHandlers();
    console.log('✓ Request click handlers added');
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
        <div class="modern-mobile-card group relative overflow-hidden bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 mb-4 border border-slate-200/60 hover:border-blue-300 cursor-pointer" 
             data-request-id="${request.id}"
             style="--animation-delay: ${Math.random() * 200}ms; transform: translateY(0); transition: transform 0.3s ease, box-shadow 0.3s ease;">
            
            <!-- Gradient Background Overlay -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <!-- Top Accent Bar with Animated Gradient -->
            <div class="absolute top-0 left-0 right-0 h-1.5 ${request.status === 'in_progress' ? getPriorityGradient(request.priority) : getStatusGradient(request.status)} shadow-sm"></div>
            
            <!-- Content Wrapper -->
            <div class="relative z-10">
                <!-- Header Section -->
                <div class="p-4 pb-3">
                    <div class="flex items-start justify-between gap-3">
                        <!-- Left: Icon + Request Info -->
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                            <!-- Animated Icon Container -->
                            <div class="relative flex-shrink-0">
                                <div class="absolute inset-0 bg-blue-500 rounded-xl opacity-20 blur-md group-hover:opacity-30 transition-opacity"></div>
                                <div class="relative p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                            </div>
                            
                            <!-- Request Number & Date -->
                            <div class="flex-1 min-w-0">
                                <div class="font-extrabold text-base text-slate-800 tracking-tight leading-tight mb-0.5">
                                    ${formattedRequestNumber}
                                </div>
                                <div class="flex items-center gap-1.5 text-xs text-slate-500">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <span class="font-medium">${formatDate(request.created_at)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right: Status Badge -->
                        <div class="flex-shrink-0">
                            <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-extrabold ${displayStatusClass} shadow-md border-2 backdrop-blur-sm">
                                <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
                                ${displayStatus}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Institution/Customer Section -->
                <div class="px-4 pb-3">
                    ${request.is_walk_in ? 
                        `<div class="flex items-center gap-2 mb-2">
                            <span class="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">
                                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                                </svg>
                                WALK-IN
                            </span>
                        </div>
                        <h3 class="font-bold text-lg text-slate-900 leading-snug mb-1">
                            ${request.walk_in_customer_name || 'Walk-In Customer'}
                        </h3>
                        <div class="flex items-center gap-1.5 text-sm text-slate-600">
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                            </svg>
                            <span class="font-medium">${request.printer_brand || 'N/A'}</span>
                        </div>` 
                        : 
                        `<div class="flex items-start gap-2">
                            <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            <h3 class="font-bold text-lg text-slate-900 leading-snug flex-1">
                                ${request.institution_name || 'Institution'}
                            </h3>
                        </div>`
                    }
                </div>
                
                <!-- Issue Description Card -->
                <div class="px-4 pb-4">
                    <div class="relative group/issue">
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl opacity-50 blur-sm group-hover/issue:opacity-70 transition-opacity"></div>
                        <div class="relative bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border border-slate-200/80 shadow-sm">
                            <div class="flex items-start gap-2.5">
                                <svg class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p class="text-sm text-slate-700 leading-relaxed font-medium line-clamp-2 break-words flex-1">
                                    ${request.issue || 'Service Request'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Action Button -->
                <div class="px-4 pb-4">
                    <button class="view-details-btn w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] group/btn" 
                            data-request-id="${request.id}">
                        <svg class="w-5 h-5 group-hover/btn:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        <span class="text-sm tracking-wide">View Full Details</span>
                        <svg class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Hover Effect Shine -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
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
                ${request.is_walk_in ? 
                    `<div class="text-sm text-slate-500">
                        <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold mr-1">WALK-IN</span>
                        ${request.walk_in_customer_name || 'Walk-In Customer'}
                    </div>` 
                    : 
                    `<div class="text-sm text-slate-500">${request.institution_name}</div>`
                }
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
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        View Request
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
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from firing
            const requestId = element.getAttribute('data-request-id');
            if (requestId) {
                showServiceRequestModal(requestId);
            }
        });
    });
    
    // Mobile cards (entire card clickable)
    document.querySelectorAll('.modern-mobile-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on button (button has its own handler)
            if (e.target.closest('.view-details-btn')) return;
            
            const requestId = card.getAttribute('data-request-id');
            if (requestId) {
                showServiceRequestModal(requestId);
            }
        });
    });

    // Desktop table rows
    document.querySelectorAll('tr[data-request-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't trigger if clicking on button
            if (e.target.closest('button')) return;
            
            const requestId = row.getAttribute('data-request-id');
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
    const request = window.currentServiceRequests.find(r => r.id == requestId);
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
    const request = window.currentServiceRequests.find(r => r.id == requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    selectedRequest = request;
    
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
    const searchButtons = document.querySelectorAll('#search-requests-btn, #search-requests-btn-desktop');
    const searchBarContainer = document.getElementById('search-bar-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    console.log('🔍 Setting up search functionality');
    console.log('Search buttons found:', searchButtons.length);
    console.log('Search bar container:', !!searchBarContainer);
    console.log('Search input:', !!searchInput);
    
    // Open search bar (show it)
    searchButtons.forEach(btn => {
        btn?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔍 Search button clicked!');
            console.log('Search bar container element:', searchBarContainer);
            console.log('Search bar container exists:', !!searchBarContainer);
            console.log('Current classes:', searchBarContainer?.className);
            
            if (searchBarContainer) {
                searchBarContainer.classList.remove('hidden');
                console.log('✅ Removed hidden class');
                console.log('New classes:', searchBarContainer.className);
            } else {
                console.error('❌ Search bar container not found!');
            }
            
            if (searchInput) {
                searchInput.focus();
                console.log('✅ Focused on search input');
            } else {
                console.error('❌ Search input not found!');
            }
        });
    });
    
    // Clear search and hide bar
    clearSearchBtn?.addEventListener('click', () => {
        console.log('❌ Clearing search');
        searchInput.value = '';
        searchBarContainer?.classList.add('hidden');
        // Reset to show all cards
        displayServiceRequests(window.currentServiceRequests);
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !searchBarContainer?.classList.contains('hidden')) {
            console.log('⌨️ ESC pressed, clearing search');
            searchInput.value = '';
            searchBarContainer.classList.add('hidden');
            // Reset to show all cards
            displayServiceRequests(window.currentServiceRequests);
        }
    });
    
    // Search functionality - filters cards in real-time
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const searchCount = document.getElementById('search-count');
            
            console.log('🔍 [requests.js] Search query:', query);
            console.log('📋 [requests.js] Total requests to search:', window.currentServiceRequests.length);
            console.log('📋 [requests.js] Sample request:', window.currentServiceRequests[0]);
            
            if (!query) {
                // Show all results if search is empty
                if (searchCount) {
                    searchCount.textContent = 'Type to filter requests...';
                }
                console.log('✅ [requests.js] Showing all requests');
                displayServiceRequests(window.currentServiceRequests);
                return;
            }
            
            const filteredRequests = window.currentServiceRequests.filter(request => {
                const matches = 
                    request.request_number?.toLowerCase().includes(query) ||
                    request.issue?.toLowerCase().includes(query) ||
                    (request.is_walk_in ? request.walk_in_customer_name?.toLowerCase().includes(query) : request.institution_name?.toLowerCase().includes(query)) ||
                    (request.is_walk_in && request.printer_brand?.toLowerCase().includes(query)) ||
                    request.location?.toLowerCase().includes(query);
                
                if (matches) {
                    console.log('✓ [requests.js] Match found:', request.request_number);
                }
                return matches;
            });
            
            console.log('🎯 [requests.js] Filtered results:', filteredRequests.length);
            
            // Update search count
            if (searchCount) {
                searchCount.textContent = `${filteredRequests.length} result${filteredRequests.length !== 1 ? 's' : ''} found`;
            }
            
            // Update the main card view with filtered results
            console.log('🎨 [requests.js] Calling displayServiceRequests with', filteredRequests.length, 'requests');
            displayServiceRequests(filteredRequests);
        });
        console.log('✅ [requests.js] Search input listener attached');
    } else {
        console.error('❌ [requests.js] Search input not found!');
    }
    
    console.log('✅ Search functionality initialized');
}

/**
 * Display search results
 */
function displaySearchResults(results, query) {
    console.log('🎨 displaySearchResults called with', results.length, 'results for query:', query);
    const searchResults = document.getElementById('search-results');
    const searchCount = document.getElementById('search-count');
    
    if (!searchResults || !searchCount) {
        console.error('❌ Search elements not found!');
        return;
    }
    
    // Update count
    if (query) {
        searchCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
    } else {
        searchCount.textContent = `${results.length} total request${results.length !== 1 ? 's' : ''}`;
    }
    
    console.log('✓ Updated search count to:', searchCount.textContent);
    
    if (results.length === 0 && query) {
        searchResults.innerHTML = `
            <div class="p-4 text-center text-slate-500">
                <p>No requests found for "${query}"</p>
            </div>
        `;
        console.log('📭 No results, showing empty state');
        return;
    }
    
    const html = results.map(request => `
        <div class="search-result-item p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer" 
             data-request-id="${request.id}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="font-medium text-slate-800">${request.request_number}</div>
                    <div class="text-sm text-slate-600 line-clamp-1">${request.issue || 'Service Request'}</div>
                    ${request.is_walk_in ? 
                        `<div class="text-xs text-slate-500">
                            <span class="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-xs font-bold mr-1">WALK-IN</span>
                            ${request.walk_in_customer_name || 'Walk-In Customer'}
                        </div>` 
                        : 
                        `<div class="text-xs text-slate-500">${request.institution_name || 'N/A'}</div>`
                    }
                </div>
                <div class="ml-2">
                    <span class="inline-flex px-2 py-1 text-xs rounded-full ${getStatusClass(request.status)}">
                        ${formatStatus(request.status)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    searchResults.innerHTML = html;
    console.log('✓ Rendered', results.length, 'search results');
    
    // Add click handlers for search results
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const requestId = item.getAttribute('data-request-id');
            console.log('🖱️ Clicked search result:', requestId);
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
    const mobileContainer = document.getElementById('serviceRequestsCardsMobile');
    const desktopContainer = document.getElementById('serviceRequestsTableDesktop');
    
    // Clear the containers to remove any existing cards
    if (mobileContainer) mobileContainer.innerHTML = '';
    if (desktopContainer) desktopContainer.innerHTML = '';
    
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
        const description = request.issue || 'Service Request';
        const isLong = description.length > 120;
        const shortDesc = isLong ? description.slice(0, 120) + '…' : description;
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
            <div class="px-6 pb-2">
                ${request.is_walk_in ? 
                    `<div class="flex items-center gap-2 mb-2">
                        <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">WALK-IN REQUEST</span>
                    </div>
                    <div class="font-bold text-lg text-slate-800 mb-1">${request.walk_in_customer_name || 'Walk-In Customer'}</div>
                    <div class="text-sm text-slate-600 mb-3">${request.location || ''}</div>
                    
                    <!-- Printer Information Section -->
                    <div class="mb-3">
                        <div class="text-sm font-medium text-slate-700 mb-2">Printer Information:</div>
                        <div class="space-y-1">
                            <div class="text-sm text-slate-600"><span class="font-medium">Brand:</span> ${request.printer_brand || 'N/A'}</div>
                        </div>
                    </div>` 
                    : 
                    `<div class="font-bold text-lg text-slate-800 mb-1">${request.institution_name || 'Institution'}</div>
                    <div class="text-sm text-slate-600 mb-3">${request.location || ''}</div>
                    
                    <!-- Printer Information Section -->
                    <div class="mb-3">
                        <div class="text-sm font-medium text-slate-700 mb-2">Printer Information:</div>
                        <div class="space-y-1">
                            <div class="text-sm text-slate-600"><span class="font-medium">Name:</span> ${request.printer_name || 'N/A'}</div>
                            <div class="text-sm text-slate-600"><span class="font-medium">Model:</span> ${request.model || 'N/A'}</div>
                            <div class="text-sm text-slate-600"><span class="font-medium">Brand:</span> ${request.brand || 'N/A'}</div>
                            <div class="text-sm text-slate-600"><span class="font-medium">Serial Number:</span> ${request.serial_number || 'N/A'}</div>
                        </div>
                    </div>`
                }
                
                <!-- Requester Information Section -->
                <div class="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <div class="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Requested By:
                    </div>
                    <div class="text-sm text-blue-900 font-semibold">${request.requester_first_name || ''} ${request.requester_last_name || 'N/A'}</div>
                </div>
                
                <!-- Description with gray background -->
                <div class="bg-gray-100 rounded-lg px-3 py-2 mb-3">
                    <span id="modal-description" class="block text-gray-700 text-sm leading-relaxed break-words ${isLong ? 'line-clamp-3' : ''}">${shortDesc}</span>
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
                <!-- Collapsible Analytics Section -->
                <div id="analytics-section-${request.id}" class="modern-analytics-section bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-3 py-2 mb-3 cursor-pointer flex items-start gap-2 group hover:shadow-lg transition-all" onclick="toggleAnalytics(${request.id}, \`${request.brand || ''}\`, \`${request.model || ''}\`)">
                    <div class="analytics-icon bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full p-1.5 shadow-md">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-semibold text-blue-800 text-xs">Service Insights</span>
                            <span class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">AI</span>
                            <span id="analytics-badge-${request.id}" class="hidden bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold"></span>
                        </div>
                        <p class="text-[10px] text-blue-600 mt-0.5">Click to view part recommendations</p>
                        <div id="analytics-content-${request.id}" class="modern-analytics-content text-xs mt-2 hidden">
                            <div class="flex items-center justify-center py-4">
                                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
                    </div>
                    <svg class="w-4 h-4 text-blue-400 transition-transform flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
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
        summary.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between">
                    <span class="font-medium text-slate-600">Issue:</span>
                    <span class="text-slate-800">${request.issue || 'Service Request'}</span>
                </div>
                ${request.is_walk_in ? 
                    `<div class="flex justify-between">
                        <span class="font-medium text-slate-600">Customer:</span>
                        <span class="text-slate-800">${request.walk_in_customer_name || 'Walk-In Customer'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-slate-600">Printer Brand:</span>
                        <span class="text-slate-800">${request.printer_brand || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-slate-600">Location:</span>
                        <span class="text-slate-800">${request.location || 'N/A'}</span>
                    </div>` 
                    : 
                    `<div class="flex justify-between">
                        <span class="font-medium text-slate-600">Location:</span>
                        <span class="text-slate-800">${request.institution_name} - ${request.location || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-slate-600">Equipment:</span>
                        <span class="text-slate-800">${request.printer_name || 'N/A'}</span>
                    </div>
                    ${request.serial_number ? `
                        <div class="flex justify-between">
                            <span class="font-medium text-slate-600">Serial Number:</span>
                            <span class="text-slate-800 font-mono text-sm">${request.serial_number}</span>
                        </div>
                    ` : ''}`
                }
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
    console.log('🔧 Loading available parts from technician inventory...');
    try {
        const response = await fetch('/api/technician/inventory', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('Parts API response status:', response.status);
        
        if (response.ok) {
            const inventoryData = await response.json();
            console.log('✅ Loaded inventory data:', inventoryData);
            
            // Map inventory data to parts format
            availableParts = inventoryData.map(item => ({
                id: item.part_id,
                name: item.name,
                brand: item.brand,
                category: item.category,
                part_type: item.part_type || 'printer_part',
                stock: item.assigned_quantity,
                unit: item.unit || 'pieces'
            }));
            
            console.log('✅ Mapped parts:', availableParts);
            updatePartSelectors();
            updatePartSearchFunctionality();
            return availableParts;
        } else {
            const errorData = await response.json();
            console.error('❌ Parts API error:', errorData);
            showToast('Failed to load parts inventory. Please try again.', 'error');
            return [];
        }
    } catch (error) {
        console.error('❌ Error loading parts:', error);
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
    console.log('🔧 Updating part selectors with', availableParts.length, 'parts');
    
    // Update brand selectors
    updateBrandSelectors();
    
    // Update parts summary
    updatePartsSummary();
    
    console.log('✅ Part selectors updated');
}

function updateBrandSelectors() {
    const brandSelectors = document.querySelectorAll('.part-brand-select');
    console.log('Found', brandSelectors.length, 'brand selectors');
    
    // Get printer brand from selected service request
    const printerBrand = selectedRequest?.is_walk_in 
        ? selectedRequest.printer_brand 
        : selectedRequest?.brand;
    
    console.log('🖨️ Service request printer brand:', printerBrand);
    
    // Filter parts by printer brand if available
    let filteredByBrand = availableParts;
    if (printerBrand) {
        filteredByBrand = availableParts.filter(part => 
            part.brand && part.brand.toLowerCase() === printerBrand.toLowerCase()
        );
        console.log(`✅ Filtered ${filteredByBrand.length} parts for brand: ${printerBrand}`);
    }
    
    // Get unique brands from filtered parts
    const brands = [...new Set(filteredByBrand.map(part => part.brand).filter(Boolean))].sort();
    
    brandSelectors.forEach((selector, index) => {
        console.log(`Updating brand selector ${index + 1}`);
        
        if (printerBrand && brands.length > 0) {
            // If we have a printer brand and matching parts, auto-select it
            selector.innerHTML = `<option value="${printerBrand}">${printerBrand}</option>`;
            selector.value = printerBrand;
            selector.disabled = true; // Lock to printer brand
            
            // Trigger change event to load parts
            const event = new Event('change', { bubbles: true });
            selector.dispatchEvent(event);
        } else if (brands.length === 0) {
            selector.innerHTML = '<option value="" disabled>No parts available for this printer brand</option>';
            selector.disabled = true;
        } else {
            selector.innerHTML = '<option value="">Choose brand first...</option>';
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                selector.appendChild(option);
            });
        }
    });
}

function updatePartsForBrand(brandSelector, selectedBrand) {
    const partEntry = brandSelector.closest('.part-entry');
    if (!partEntry) return;
    
    const partSelect = partEntry.querySelector('.part-name-select');
    const typeSelect = partEntry.querySelector('.part-type-select');
    if (!partSelect) return;
    
    console.log('🔧 Updating parts for brand:', selectedBrand);
    
    // Get selected part type (consumable or printer_part)
    const selectedType = typeSelect ? typeSelect.value : '';
    
    // Reset part selector
    partSelect.innerHTML = '<option value="">Select part/consumable...</option>';
    partSelect.disabled = !selectedBrand || !selectedType;
    
    if (!selectedBrand || !selectedType) {
        return;
    }
    
    // Get printer brand from selected service request
    const printerBrand = selectedRequest?.is_walk_in 
        ? selectedRequest.printer_brand 
        : selectedRequest?.brand;
    
    // Filter parts by brand and type
    let partsFiltered = availableParts.filter(part => {
        const brandMatch = part.brand === selectedBrand;
        const typeMatch = part.part_type === selectedType;
        return brandMatch && typeMatch;
    });
    
    // If we have a printer brand from the service request, further filter
    if (printerBrand) {
        partsFiltered = partsFiltered.filter(part => 
            part.brand.toLowerCase() === printerBrand.toLowerCase()
        );
    }
    
    console.log(`🔍 Filtered ${partsFiltered.length} parts (brand: ${selectedBrand}, type: ${selectedType})`);
    
    if (partsFiltered.length === 0) {
        partSelect.innerHTML += '<option value="" disabled>No parts available for this brand and type</option>';
        return;
    }
    
    // Group parts by category for better organization
    const partsByCategory = {};
    partsFiltered.forEach(part => {
        if (!partsByCategory[part.category]) {
            partsByCategory[part.category] = [];
        }
        partsByCategory[part.category].push(part);
    });
    
    // Add parts grouped by category
    Object.keys(partsByCategory).sort().forEach(category => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
        
        partsByCategory[category].forEach(part => {
            const option = document.createElement('option');
            option.value = part.name;
            option.dataset.id = part.id;
            option.dataset.stock = part.stock;
            option.dataset.unit = part.unit || 'pieces';
            option.dataset.category = part.category;
            option.dataset.brand = part.brand;
            option.textContent = `${part.name} - Available: ${part.stock} ${part.unit || 'pieces'}`;
            optgroup.appendChild(option);
        });
        
        partSelect.appendChild(optgroup);
    });
    
    console.log('✅ Added', partsFiltered.length, 'parts for brand', selectedBrand, 'and type', selectedType);
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
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    Part Type
                </label>
                <div class="relative">
                    <select class="part-type-select w-full p-3 pl-3.5 pr-9 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-white text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:border-emerald-300 transition-all">
                        <option value="">Choose type first...</option>
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
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a2 2 0 012-2z"></path>
                    </svg>
                    Select Part/Consumable
                </label>
                <div class="relative">
                    <select class="part-name-select w-full p-3 pl-3.5 pr-9 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:border-purple-300 transition-all" disabled>
                        <option value="">Select type first...</option>
                    </select>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
                <div class="part-stock-info mt-2 text-xs font-medium"></div>
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
    
    // Part type selection handler (consumable vs printer_part)
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            console.log('🎯 Part type selected:', selectedType);
            console.log('📋 Selected request:', selectedRequest);
            console.log('🔧 Available parts:', availableParts);
            
            if (selectedType) {
                // Get printer brand from service request
                const printerBrand = selectedRequest?.is_walk_in 
                    ? selectedRequest.printer_brand 
                    : selectedRequest?.brand;
                
                console.log('🖨️ Printer brand from request:', printerBrand);
                console.log('📦 Selected type:', selectedType);
                console.log('🔧 Total available parts:', availableParts.length);
                
                // Reset part selector
                partSelect.innerHTML = '<option value="">Select part/consumable...</option>';
                partSelect.disabled = true;
                
                // Map UI values to database values
                // consumable -> universal, printer_part -> brand_specific
                const dbPartType = selectedType === 'consumable' ? 'universal' : 'brand_specific';
                console.log('🗄️ Database part type to search:', dbPartType);
                
                // Filter parts by type and printer brand
                let partsFiltered = availableParts.filter(part => {
                    const typeMatch = part.part_type === dbPartType;
                    const hasBrand = part.brand != null && part.brand !== '';
                    
                    // If we have a printer brand, filter by it
                    if (printerBrand) {
                        // Trim spaces from brand comparison
                        const partBrand = part.brand ? part.brand.trim() : '';
                        const reqBrand = printerBrand.trim();
                        const brandMatch = partBrand.toLowerCase() === reqBrand.toLowerCase();
                        console.log(`✓ Part: "${part.name}", db_type: "${part.part_type}", brand: "${part.brand}", typeMatch: ${typeMatch}, brandMatch: ${brandMatch}`);
                        return typeMatch && hasBrand && brandMatch;
                    } else {
                        // No printer brand requirement, just match type
                        console.log(`✓ Part: "${part.name}", db_type: "${part.part_type}", typeMatch: ${typeMatch}`);
                        return typeMatch && hasBrand;
                    }
                });
                
                console.log('✅ Filtered parts:', partsFiltered);
                
                if (partsFiltered.length === 0) {
                    const message = printerBrand 
                        ? `No ${selectedType === 'consumable' ? 'consumables' : 'printer parts'} available for ${printerBrand}`
                        : `No ${selectedType === 'consumable' ? 'consumables' : 'printer parts'} available`;
                    partSelect.innerHTML = `<option value="" disabled>${message}</option>`;
                    console.log('⚠️', message);
                } else {
                    // Group parts by category
                    const partsByCategory = {};
                    partsFiltered.forEach(part => {
                        if (!partsByCategory[part.category]) {
                            partsByCategory[part.category] = [];
                        }
                        partsByCategory[part.category].push(part);
                    });
                    
                    // Add parts grouped by category
                    Object.keys(partsByCategory).sort().forEach(category => {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
                        
                        partsByCategory[category].forEach(part => {
                            const option = document.createElement('option');
                            option.value = part.name;
                            option.dataset.id = part.id;
                            option.dataset.stock = part.stock;
                            option.dataset.unit = part.unit || 'pieces';
                            option.dataset.category = part.category;
                            option.dataset.brand = part.brand;
                            option.textContent = `${part.name} - Available: ${part.stock} ${part.unit || 'pieces'}`;
                            optgroup.appendChild(option);
                        });
                        
                        partSelect.appendChild(optgroup);
                    });
                    
                    partSelect.disabled = false;
                    console.log(`✅ Added ${partsFiltered.length} parts to dropdown`);
                }
            } else {
                partSelect.innerHTML = '<option value="">Select type first...</option>';
                partSelect.disabled = true;
            }
            
            // Reset downstream selections
            if (stockInfo) {
                stockInfo.innerHTML = '';
            }
            if (availabilityText) {
                availabilityText.textContent = '';
            }
            if (quantityInput) {
                quantityInput.disabled = true;
            }
            
            updatePartsSummary();
        });
    }
    
    // Enhanced part selection handler
    if (partSelect) {
        partSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
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
                        ${brand ? `<span class="text-slate-500 text-xs">• ${brand}</span>` : ''}
                        ${category ? `<span class="text-slate-500 text-xs">• ${category}</span>` : ''}
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
        let successMessage = '✅ Service completion submitted successfully!';
        if (parts.length > 0) {
            successMessage += ` ${parts.length} part${parts.length > 1 ? 's' : ''} recorded.`;
        }
        showToast(successMessage, 'success');
        
        // Show approval workflow info
        setTimeout(() => {
            showToast('📋 Your coordinator will review and approve this service completion.', 'info');
        }, 2000);
        
        closeJobCompletionModal();
        
        // Refresh data to get latest status from server
        await loadServiceRequests();
        
    } catch (error) {
        console.error('Error completing service:', error);
        
        // Show specific error message based on error type
        let errorMessage = 'Failed to submit service completion.';
        
        if (error.message.includes('401') || error.message.includes('authentication')) {
            errorMessage = 'Authentication expired. Please log in again.';
            // Redirect to login after a delay
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
            }, 2000);
        } else if (error.message.includes('403')) {
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
                min_support: 0.1,
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
        badge.textContent = `${data.rules.length} tip${data.rules.length > 1 ? 's' : ''}`;
        badge.classList.remove('hidden');
    }
    
    // Display top recommendations
    const topRules = data.rules.slice(0, 5); // Show top 5 rules
    
    let html = `
        <div class="space-y-2">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-blue-900 text-xs">Recommended Parts</h4>
                <span class="text-[10px] text-blue-600">${data.total_transactions} similar services</span>
            </div>
    `;
    
    topRules.forEach((rule, index) => {
        const confidencePct = (rule.confidence * 100).toFixed(0);
        const confidenceColor = rule.confidence >= 0.8 ? 'green' : rule.confidence >= 0.6 ? 'yellow' : 'blue';
        
        html += `
            <div class="bg-white border border-${confidenceColor}-200 rounded-lg p-2.5 hover:shadow-sm transition-shadow">
                <div class="flex items-start gap-2">
                    <div class="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-${confidenceColor}-400 to-${confidenceColor}-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        ${index + 1}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-[10px] font-bold text-slate-600">IF</span>
                            <div class="flex flex-wrap gap-1">
                                ${rule.antecedents.map(part => `
                                    <span class="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                                        </svg>
                                        ${part}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="text-[10px] font-bold text-slate-600">THEN</span>
                            <div class="flex flex-wrap gap-1">
                                ${rule.consequents.map(part => `
                                    <span class="inline-flex items-center gap-1 bg-${confidenceColor}-100 text-${confidenceColor}-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                                        </svg>
                                        ${part}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex items-center gap-3 text-[9px]">
                            <span class="text-slate-600">
                                <strong class="text-${confidenceColor}-600">${confidencePct}%</strong> confidence
                            </span>
                            ${rule.lift > 1.2 ? `
                                <span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                                    ${rule.lift.toFixed(1)}× likely
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-2 mt-2">
                <div class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    <div class="flex-1">
                        <p class="text-indigo-900 text-[10px] font-bold mb-0.5">💡 Pro Tip</p>
                        <p class="text-indigo-700 text-[10px] leading-relaxed">
                            These recommendations are based on ${data.total_transactions} similar service requests for ${data.printer_brand} ${data.printer_model}. 
                            Bringing these parts can help avoid repeat trips!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

/**
 * Setup pagination event handlers
 */
function setupPaginationHandlers() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    // Clone and replace to remove all old event listeners
    if (prevBtn) {
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Prev clicked, currentPage:', currentPage);
            if (currentPage > 1) {
                currentPage--;
                console.log('Moving to page:', currentPage);
                displayServiceRequests(window.currentServiceRequests);
                scrollToTop();
            }
        });
    }
    
    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Next clicked, currentPage BEFORE:', currentPage, 'totalPages:', totalPages);
            if (currentPage < totalPages) {
                currentPage++;
                console.log('🔵 Moving to page:', currentPage);
                console.log('🔵 window.currentServiceRequests.length:', window.currentServiceRequests.length);
                displayServiceRequests(window.currentServiceRequests);
                console.log('🔵 currentPage AFTER displayServiceRequests:', currentPage);
                scrollToTop();
            } else {
                console.log('Already on last page');
            }
        });
    }
}

/**
 * Update pagination UI
 */
function updatePaginationUI(totalItems) {
    const paginationControls = document.getElementById('paginationControls');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const totalPagesDisplay = document.getElementById('totalPagesDisplay');
    const showingStart = document.getElementById('showingStart');
    const showingEnd = document.getElementById('showingEnd');
    const totalCount = document.getElementById('totalCount');
    
    // Show pagination only if more than itemsPerPage
    if (totalItems <= itemsPerPage) {
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }
    
    if (paginationControls) paginationControls.classList.remove('hidden');
    
    // Update page info
    if (currentPageDisplay) currentPageDisplay.textContent = currentPage;
    if (totalPagesDisplay) totalPagesDisplay.textContent = totalPages;
    
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
    
    if (showingStart) showingStart.textContent = startIndex;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (totalCount) totalCount.textContent = totalItems;
    
    // Enable/disable prev/next buttons
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Generate page numbers (max 5 visible at a time, like Pornhub pagination)
    if (pageNumbers) {
        let pagesHTML = '';
        let startPage = 1;
        let endPage = totalPages;
        
        // Show max 5 page numbers
        if (totalPages > 5) {
            if (currentPage <= 3) {
                // Show 1-5
                startPage = 1;
                endPage = 5;
            } else if (currentPage >= totalPages - 2) {
                // Show last 5
                startPage = totalPages - 4;
                endPage = totalPages;
            } else {
                // Show current page in middle with 2 on each side
                startPage = currentPage - 2;
                endPage = currentPage + 2;
            }
        }
        
        // Add first page and ellipsis if needed
        if (startPage > 1) {
            pagesHTML += `<button class="page-number-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                pagesHTML += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            pagesHTML += `<button class="page-number-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }
        
        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagesHTML += `<span class="page-ellipsis">...</span>`;
            }
            pagesHTML += `<button class="page-number-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        pageNumbers.innerHTML = pagesHTML;
        
        // Add click handlers to page number buttons
        pageNumbers.querySelectorAll('.page-number-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = parseInt(btn.dataset.page);
                console.log('Page number clicked:', page);
                if (page !== currentPage) {
                    currentPage = page;
                    displayServiceRequests(window.currentServiceRequests);
                    scrollToTop();
                }
            });
        });
    }
    
    // Re-setup pagination handlers to ensure they work after page number regeneration
    setupPaginationHandlers();
}

/**
 * Hide pagination
 */
function hidePagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (paginationControls) paginationControls.classList.add('hidden');
}

/**
 * Scroll to top of page smoothly
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
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
