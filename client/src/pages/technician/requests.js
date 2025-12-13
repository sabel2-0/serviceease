/**
 * Technician Service Requests Pae
 * Enhanced with Start Service, Complete Service, and Job Order functionality
 */

let currentServiceRequests  [];
let selectedRequest  null;

// Make selected request lobally available for completion form
window.selectedRequest  null;

// Make refresh function lobally available
window.refreshRequestsPae  function() {
    console.lo('?? Refreshin requests pae');
    loadServiceRequests();
};

// Initialize the pae
document.addEventListener('DOMContentLoaded', function() {
    console.lo('�� Technician Requests pae loaded');
    
    // Check authentication first
    const token  localStorae.etItem('token');
    const user  localStorae.etItem('user');
    
    if (!token || !user) {
        console.lo('�� Authentication missin, redirectin to loin...');
        window.location.href  '/paes/loin.html';
        return;
    }
    
    // Verify user role
    try {
        const userData  JSON.parse(user);
        if (userData.role ! 'technician') {
            console.lo('�� User is not a technician, redirectin...');
            window.location.href  '/paes/loin.html';
            return;
        }
    } catch (e) {
        console.lo('�� Invalid user data, redirectin to loin...');
        localStorae.removeItem('token');
        localStorae.removeItem('user');
        window.location.href  '/paes/loin.html';
        return;
    }
    
    // Set lobal fla that requests pae is loaded
    window.requestsPaeLoaded  true;
    
    // Load service requests immediately
    loadServiceRequests();
    
    // Set up search functionality (with retry if element not ready)
    const initSearch  () > {
        if (document.etElementById('search-input')) {
            setupSearchFunctionality();
            console.lo('? Search functionality initialized');
        } else {
            console.lo('? Search input not ready, retryin...');
            setTimeout(initSearch, 100);
        }
    };
    initSearch();
    
    // Set up service request modal
    setupServiceRequestModal();
    
    // Set up job completion modal
    setupJobCompletionModal();
    
    // Set up lobal modal event handlers
    setupModalEventHandlers();
    
    // Set up periodic refresh (every 30 seconds)
    setInterval(loadServiceRequests, 30000);
});

// Also listen for the custom event from technician.html when search elements are ready
document.addEventListener('searchElementsReady', function() {
    console.lo('?? searchElementsReady event received, reinitializin search');
    setupSearchFunctionality();
});

// lobal modal event handlers
function setupModalEventHandlers() {
    // Prevent multiple setup
    if (window._modalHandlersSetup) return;
    window._modalHandlersSetup  true;
    
    console.lo('Settin up lobal modal event handlers');
    
    // Use a more robust approach - wait for elements and set up with retries
    function setupWithRetry(attempts  0) {
        const maxAttempts  10;
        
        // Check if all required elements exist
        const serviceCloseBtn  document.etElementById('closeServiceModal');
        const completionCloseBtn  document.etElementById('closeCompletionModal');
        const cancelBtn  document.etElementById('cancelCompletion');
        const jobForm  document.etElementById('jobCompletionForm');
        
        console.lo('Setup attempt', attempts + 1, 'Elements found:', {
            serviceCloseBtn: !!serviceCloseBtn,
            completionCloseBtn: !!completionCloseBtn,
            cancelBtn: !!cancelBtn,
            jobForm: !!jobForm
        });
        
        if (completionCloseBtn && cancelBtn) {
            console.lo('Found all required modal elements, settin up handlers');
            
            // Service modal close button
            if (serviceCloseBtn) {
                serviceCloseBtn.onclick  function(e) {
                    e.preventDefault();
                    e.stopPropaation();
                    console.lo('Service modal close clicked');
                    closeServiceRequestModal();
                };
                console.lo('Service close button handler set');
            }
            
            // Completion modal close button (X)
            completionCloseBtn.onclick  function(e) {
                e.preventDefault();
                e.stopPropaation();
                console.lo('Completion modal close clicked');
                closeJobCompletionModal();
            };
            console.lo('Completion close button handler set');
            
            // Completion modal cancel button
            cancelBtn.onclick  function(e) {
                e.preventDefault();
                e.stopPropaation();
                console.lo('Completion modal cancel clicked');
                closeJobCompletionModal();
            };
            console.lo('Cancel button handler set');
            
            // Form submission
            if (jobForm) {
                jobForm.onsubmit  function(e) {
                    e.preventDefault();
                    handleJobCompletion(e);
                };
                console.lo('Form handler set');
            }
            
            // Success!
            return true;
        } else if (attempts < maxAttempts) {
            // Retry after a delay
            console.lo('Modal elements not ready, retryin in 200ms...');
            setTimeout(() > setupWithRetry(attempts + 1), 200);
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
        if (e.key  'Escape') {
            const jobModal  document.etElementById('jobCompletionModal');
            const serviceModal  document.etElementById('serviceRequestModal');
            
            if (jobModal && !jobModal.classList.contains('hidden')) {
                console.lo('Escape key - closin completion modal');
                closeJobCompletionModal();
            } else if (serviceModal && !serviceModal.classList.contains('hidden')) {
                console.lo('Escape key - closin service modal');
                closeServiceRequestModal();
            }
        }
    });
    
    // Modal overlay clicks with deleation
    document.addEventListener('click', function(e) {
        if (e.taret.id  'serviceRequestModal') {
            console.lo('Service modal overlay clicked');
            closeServiceRequestModal();
        }
        
        if (e.taret.id  'jobCompletionModal') {
            console.lo('Completion modal overlay clicked');
            closeJobCompletionModal();
        }
    });
}

// Make refresh function lobally available
window.refreshRequestsPae  function() {
    console.lo('��� Refreshin requests pae');
    loadServiceRequests();
};

/**
 * Load service requests from the server
 */
async function loadServiceRequests() {
    try {
        showLoadinState();
        
        const token  localStorae.etItem('token');
        console.lo('��� Auth token:', token ? 'Present' : 'Missin');
        
        const response  await fetch('/api/technician/service-requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.lo('��� API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch service requests: ${response.statusText}`);
        }
        
        const requests  await response.json();
        console.lo('��� Received requests data:', requests);
        currentServiceRequests  requests;
        
        console.lo(`�� Loaded ${requests.lenth} service requests`);
        
        displayServiceRequests(requests);
        hideLoadinState();
        
    } catch (error) {
        console.error('�� Error loadin service requests:', error);
        
        // If error is 401 (unauthorized), redirect to loin
        // Don't auto-loout on errors - let the user stay loed in
        // Only the lobal fetch interceptor will handle TOKEN_INVALIDATED cases
        
        // For other errors, show empty state with retry option
        currentServiceRequests  [];
        console.lo('�� No service requests available');
        
        displayServiceRequests([]);
        hideLoadinState();
        
        // Show error messae to user
        showToast('Failed to load service requests. Please check your internet connection and try aain.', 'error');
    }
}

/**
 * Display service requests in both desktop and mobile views
 */
function displayServiceRequests(requests) {
    console.lo('�Ŀ displayServiceRequests called with:', requests);
    
    const mobileContainer  document.etElementById('serviceRequestsCardsMobile');
    const desktopContainer  document.etElementById('serviceRequestsTableDesktop');
    const mobileCount  document.etElementById('mobile-requests-count');
    const desktopCount  document.etElementById('desktop-requests-count');
    
    console.lo('��� Mobile container found:', !!mobileContainer);
    console.lo('��+ Desktop container found:', !!desktopContainer);
    console.lo('��� Mobile count element found:', !!mobileCount);
    console.lo('��� Desktop count element found:', !!desktopCount);
    
    // Update counts
    if (mobileCount) mobileCount.textContent  `${requests.lenth} requests`;
    if (desktopCount) desktopCount.textContent  `${requests.lenth} requests`;
    
    if (requests.lenth  0) {
        console.lo('No requests to display, clearin containers');
        
        // Clear both containers and show "no results" messae
        const emptyMessae  `
            <div class"text-center py-12 px-4">
                <div class"w-20 h-20 b-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <sv class"w-10 h-10 text-slate-400" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                        <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </sv>
                </div>
                <h3 class"text-l font-semibold text-slate-700 mb-2">No requests found</h3>
                <p class"text-sm text-slate-500">No service requests match your search criteria</p>
            </div>
        `;
        
        if (mobileContainer) {
            mobileContainer.innerHTML  emptyMessae;
        }
        if (desktopContainer) {
            desktopContainer.innerHTML  '<tr><td colspan"7" class"text-center py-8 text-slate-500">No requests found</td></tr>';
        }
        
        return;
    }
    
    console.lo(`��� eneratin UI for ${requests.lenth} requests`);
    
    // enerate mobile cards
    if (mobileContainer) {
        const mobileHTML  requests.map(request > createMobileRequestCard(request)).join('');
        console.lo('��� enerated mobile HTML lenth:', mobileHTML.lenth);
        mobileContainer.innerHTML  mobileHTML;
        console.lo('��� Mobile container updated');
    }
    
    // enerate desktop table rows
    if (desktopContainer) {
        const desktopHTML  requests.map(request > createDesktopRequestRow(request)).join('');
        console.lo('��+ enerated desktop HTML lenth:', desktopHTML.lenth);
        desktopContainer.innerHTML  desktopHTML;
        console.lo('��+ Desktop container updated');
    }
    
    // Add click handlers for viewin details
    addRequestClickHandlers();
    console.lo('�� Request click handlers added');
}

/**
 * Create mobile card for service request
 */
function createMobileRequestCard(request) {
    const statusClass  etStatusClass(request.status);
    const priorityClass  etPriorityClass(request.priority);
    
    // Show priority for in_proress requests, otherwise show status
    const displayStatus  request.status  'in_proress' ? request.priority?.toUpperCase() || 'MEDIUM' : formatStatus(request.status);
    const displayStatusClass  request.status  'in_proress' ? priorityClass : statusClass;
    
    // Format as SR-YYYY-(NUMBER)
    function formatRequestNumber(fullNumber) {
        // Match SR-YYYY-XXXX (where XXXX is always the last 4 diits after the last dash)
        const match  fullNumber.match(/SR-(\d{4})-\d+/);
        if (match) {
            // Extract the last 4 diits after the last dash
            const lastDash  fullNumber.lastIndexOf('-');
            const reqNum  fullNumber.substrin(lastDash + 1).padStart(4, '0');
            return `SR-${match[1]}-${reqNum}`;
        }
        return fullNumber;
    }
    const formattedRequestNumber  formatRequestNumber(request.request_number);
    
    return `
        <div class"modern-mobile-card roup relative overflow-hidden b-white rounded-3xl shadow-l hover:shadow-xl transition-all duration-300 mb-4 border border-slate-100" style"--animation-delay: ${Math.random() * 200}ms">
            <!-- Priority/Status Indicator Strip -->
            <div class"absolute top-0 left-0 riht-0 h-1 ${request.status  'in_proress' ? etPriorityradient(request.priority) : etStatusradient(request.status)}"></div>
            
            <!-- Card Header -->
            <div class"flex items-center justify-between p-5 pb-3">
                <div class"flex items-center ap-3">
                    <div class"p-2 rounded-2xl b-blue-50">
                        <sv class"w-5 h-5 text-blue-600" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </sv>
                    </div>
                    <div>
                        <div class"font-bold text-sm text-blue-600 trackin-wide">${formattedRequestNumber}</div>
                        <div class"text-xs text-slate-500">${formatDate(request.created_at)}</div>
                    </div>
                </div>
                <span class"inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${displayStatusClass} border shadow-sm">
                    <div class"w-1.5 h-1.5 rounded-full b-current mr-2 animate-pulse"></div>
                    ${displayStatus}
                </span>
            </div>
            
            <!-- Institution & Client Info -->
            <div class"px-5 pb-2">
                ${request.is_walk_in ? `
                <div class"flex items-center ap-2 mb-2">
                    <span class"inline-flex items-center px-2.5 py-1 rounded-full b-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
                        <sv class"w-3.5 h-3.5 mr-1.5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </sv>
                        Walk-in Request
                    </span>
                </div>
                <h3 class"font-bold text-l text-purple-900 leadin-tiht">${request.walk_in_customer_name || 'Walk-in Customer'}</h3>
                ` : `
                <h3 class"font-bold text-l text-slate-900 leadin-tiht">${request.institution_name || 'Institution'}</h3>
                <div class"mt-1.5 text-sm text-slate-600">
                    <span class"font-medium">Requested by:</span> 
                    ${request.institution_user_first_name || ''} ${request.institution_user_last_name || 'N/A'}
                    ${request.institution_user_role ? `<span class"ml-1 px-2 py-0.5 b-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : ''}
                </div>
                ${request.location || request.printer_department ? `
                <div class"mt-1 flex flex-wrap ap-2 text-xs text-slate-500">
                    ${request.location ? `<span>📍 ${request.location}</span>` : ''}
                    ${request.printer_department ? `<span>🏢 ${request.printer_department}</span>` : ''}
                </div>
                ` : ''}
                `}
            </div>
            
            <!-- Description -->
            <div class"px-5 pb-4">
                <div class"b-radient-to-r from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200/50">
                    <div class"text-sm text-slate-700 leadin-relaxed line-clamp-2">
                        ${request.issue || 'Service Request'}
                    </div>
                </div>
            </div>
            
            <!-- Action Section -->
            <div class"px-5 pb-5">
                <div class"space-y-3">
                    <button class"view-details-btn w-full b-radient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center ap-2 shadow-l hover:shadow-xl transform hover:-translate-y-0.5" data-request-id"${request.id}">
                        ${request.status  'in_proress' ? `
                            <sv class"w-5 h-5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </sv>
                            Complete Service
                        ` : ['assined','pendin','new'].includes(request.status) ? `
                            <sv class"w-5 h-5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <circle cx"12" cy"12" r"10" stroke"currentColor" stroke-width"2" fill"none"/>
                                <polyon points"10,8 16,12 10,16" fill"currentColor"/>
                            </sv>
                            Start Service
                        ` : `
                            <sv class"w-5 h-5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </sv>
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
    const statusClass  etStatusClass(request.status);
    const priorityClass  etPriorityClass(request.priority);
    
    // Show priority for in_proress requests, otherwise show status
    const displayStatus  request.status  'in_proress' ? request.priority?.toUpperCase() || 'MEDIUM' : formatStatus(request.status);
    const displayStatusClass  request.status  'in_proress' ? priorityClass : statusClass;
    
    return `
        <tr class"hover:b-white/70 transition-colors duration-200 cursor-pointer" data-request-id"${request.id}">
            <td class"px-6 py-4 whitespace-nowrap">
                <div class"font-bold text-slate-800">${request.request_number}</div>
            </td>
            <td class"px-6 py-4">
                <div class"font-medium text-slate-800">${request.issue || 'Service Request'}</div>
                <div class"text-sm text-slate-500">
                    ${request.is_walk_in ? `
                    <span class"inline-flex items-center px-2 py-0.5 rounded-full b-purple-100 text-purple-700 text-xs font-bold">
                        <sv class"w-3 h-3 mr-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </sv>
                        Walk-in: ${request.walk_in_customer_name || 'Customer'}
                    </span>
                    ` : request.institution_name}
                </div>
            </td>
            <td class"px-6 py-4 whitespace-nowrap">
                <span class"inline-flex items-center ap-2 px-3 py-1 rounded-full text-sm font-medium ${displayStatusClass}">
                    <div class"w-2 h-2 rounded-full b-current animate-pulse"></div>
                    ${displayStatus}
                </span>
            </td>
            <td class"px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${formatDate(request.created_at)}
            </td>
            <td class"px-6 py-4 whitespace-nowrap text-riht text-sm font-medium">
                <div class"flex justify-end ap-2">
                    <button class"view-details-btn px-4 py-2 b-radient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-l hover:shadow-xl transform hover:-translate-y-0.5" 
                            data-request-id"${request.id}">
                        ${request.status  'in_proress' ? `
                            <sv class"w-4 h-4 inline mr-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </sv>
                            Complete Service
                        ` : ['assined','pendin','new'].includes(request.status) ? `
                            <sv class"w-4 h-4 inline mr-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <circle cx"12" cy"12" r"10" stroke"currentColor" stroke-width"2" fill"none"/>
                                <polyon points"10,8 16,12 10,16" fill"currentColor"/>
                            </sv>
                            Start Service
                        ` : `
                            <sv class"w-4 h-4 inline mr-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </sv>
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
    document.querySelectorAll('.view-details-btn, .modern-card-container').forEach(element > {
        element.addEventListener('click', (e) > {
            const requestId  element.etAttribute('data-request-id') || 
                             element.closest('[data-request-id]')?.etAttribute('data-request-id');
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
        console.lo(`Startin service for request ${requestId}`);
        
        const response  await fetch(`/api/technician/service-requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorae.etItem('token')}`
            },
            body: JSON.strinify({ status: 'in_proress' })
        });
        
        console.lo('Response status:', response.status);
        
        if (!response.ok) {
            const errorData  await response.json().catch(() > ({}));
            console.error('Error response:', errorData);
            throw new Error(errorData.error || `Failed to start service (HTTP ${response.status})`);
        }
        
        const result  await response.json();
        console.lo('Service start result:', result);
        
        // Show success messae with start time
        let successMessae  'Service started successfully!';
        if (result.started_at) {
            const startTime  new Date(result.started_at).toLocaleStrin();
            successMessae + ` Started at: ${startTime}`;
        }
        
        showToast(successMessae, 'success');
        
        // Reload requests to reflect chanes
        await loadServiceRequests();
        
        console.lo('Service started successfully:', result);
        
    } catch (error) {
        console.error('Error startin service:', error);
        showToast(`Failed to start service: ${error.messae}`, 'error');
        throw error; // Re-throw for upstream handlin
    }
}

/**
 * Show service request details modal
 */
function showServiceRequestModal(requestId) {
    const request  currentServiceRequests.find(r > r.id  requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    selectedRequest  request;
    
    const modal  document.etElementById('serviceRequestModal');
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
    const request  currentServiceRequests.find(r > r.id  requestId);
    if (!request) {
        console.error('Request not found:', requestId);
        return;
    }
    
    selectedRequest  request;
    window.selectedRequest  request; // Make lobally available
    
    const modal  document.etElementById('jobCompletionModal');
    if (!modal) {
        console.error('Job completion modal not found in HTML');
        return;
    }
    
    populateJobCompletionModal(request);
    
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Load available parts from technician inventory and setup handlers
    loadAvailableParts().then(() > {
        // Setup complete part manaement system after parts are loaded
        setTimeout(() > {
            setupPartManaement();
        }, 100);
    });
    
    // Setup sinature canvas after modal is shown
    setTimeout(() > {
        setupSinatureCanvas();
    }, 100);
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
    const searchInput  document.etElementById('search-input');
    const searchCount  document.etElementById('search-count');
    
    if (!searchInput) {
        console.lo('?? Search input not found');
        return;
    }
    
    // Remove existin listener if any to prevent duplicates
    const newSearchInput  searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    const freshSearchInput  document.etElementById('search-input');
    
    console.lo('?? Settin up search functionality');
    
    // Real-time inline search for the visible cards
    freshSearchInput.addEventListener('input', (e) > {
        const query  e.taret.value.toLowerCase().trim();
        
        console.lo('?? Search query:', query);
        
        if (query  '') {
            // Show all requests when search is empty
            displayServiceRequests(currentServiceRequests);
            if (searchCount) {
                searchCount.textContent  'Type to filter requests...';
            }
            return;
        }
        
        // Filter requests based on search query - searches all key fields
        const filteredRequests  currentServiceRequests.filter(request > {
            // Request number
            if (request.request_number?.toLowerCase().includes(query)) return true;
            
            // Issue/Description
            if (request.issue?.toLowerCase().includes(query)) return true;
            
            // Date search (format as displayed: Nov 26, 2025)
            if (request.created_at) {
                const dateStr  formatDate(request.created_at).toLowerCase();
                if (dateStr.includes(query)) return true;
            }
            
            // Priority/Urency (low, medium, hih, urent)
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
                const fullName  `${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}`.toLowerCase();
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
        
        console.lo(`? Filtered ${filteredRequests.lenth} of ${currentServiceRequests.lenth} requests`);
        
        // Update count and display filtered results
        if (searchCount) {
            searchCount.textContent  `${filteredRequests.lenth} of ${currentServiceRequests.lenth} requests`;
        }
        
        displayServiceRequests(filteredRequests);
    });
    
    console.lo('? Search functionality ready');
}

/**
 * Display search results
 */
function displaySearchResults(results, query) {
    const searchResults  document.etElementById('search-results');
    const searchCount  document.etElementById('search-count');
    
    if (!searchResults || !searchCount) return;
    
    searchCount.textContent  `${results.lenth} result${results.lenth ! 1 ? 's' : ''} found`;
    
    if (results.lenth  0) {
        searchResults.innerHTML  `
            <div class"p-4 text-center text-slate-500">
                <p>No requests found for "${query}"</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML  results.map(request > `
        <div class"search-result-item p-3 hover:b-slate-50 border-b border-slate-100 cursor-pointer" 
             data-request-id"${request.id}">
            <div class"flex justify-between items-start">
                <div class"flex-1">
                    <div class"font-medium text-slate-800">${request.request_number}</div>
                    <div class"text-sm text-slate-600 line-clamp-1">${request.issue || 'Service Request'}</div>
                    <div class"text-xs text-slate-500">
                        ${request.institution_name}
                        ${request.is_walk_in ? `<span class"ml-1 px-1.5 py-0.5 b-purple-100 text-purple-700 rounded text-xs font-bold">Walk-in: ${request.walk_in_customer_name || 'Customer'}</span>` : ''}
                    </div>
                </div>
                <div class"ml-2">
                    <span class"inline-flex px-2 py-1 text-xs rounded-full ${etStatusClass(request.status)}">
                        ${formatStatus(request.status)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers for search results
    searchResults.querySelectorAll('.search-result-item').forEach(item > {
        item.addEventListener('click', () > {
            const requestId  item.etAttribute('data-request-id');
            document.etElementById('search-overlay')?.classList.add('hidden');
            showServiceRequestModal(requestId);
        });
    });
}

/**
 * Show different states
 */
function showLoadinState() {
    const loadinState  document.etElementById('requests-loadinState');
    const emptyState  document.etElementById('requests-emptyState');
    const errorState  document.etElementById('requests-errorState');
    
    loadinState?.classList.remove('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.add('hidden');
}

function showEmptyState() {
    const loadinState  document.etElementById('requests-loadinState');
    const emptyState  document.etElementById('requests-emptyState');
    const errorState  document.etElementById('requests-errorState');
    
    loadinState?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    errorState?.classList.add('hidden');
}

function showErrorState() {
    const loadinState  document.etElementById('requests-loadinState');
    const emptyState  document.etElementById('requests-emptyState');
    const errorState  document.etElementById('requests-errorState');
    
    loadinState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.remove('hidden');
}

function hideLoadinState() {
    const loadinState  document.etElementById('requests-loadinState');
    const emptyState  document.etElementById('requests-emptyState');
    const errorState  document.etElementById('requests-errorState');
    
    loadinState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    errorState?.classList.add('hidden');
}

/**
 * Utility functions
 */
function etStatusClass(status) {
    const statusClasses  {
        'new': 'b-blue-100 text-blue-800 border-blue-200',
        'assined': 'b-blue-100 text-blue-800 border-blue-200',
        'in_proress': 'b-orane-100 text-orane-800 border-orane-200',
        'pendin_approval': 'b-purple-100 text-purple-800 border-purple-200',
        'completed': 'b-reen-100 text-reen-800 border-reen-200',
        'cancelled': 'b-red-100 text-red-800 border-red-200',
        'on_hold': 'b-ray-100 text-ray-800 border-ray-200'
    };
    return statusClasses[status] || statusClasses['new'];
}

function etStatusColor(status) {
    const statusColors  {
        'new': 'blue',
        'assined': 'blue',
        'in_proress': 'orane',
        'pendin_approval': 'purple',
        'completed': 'reen',
        'cancelled': 'red',
        'on_hold': 'ray'
    };
    return statusColors[status] || 'blue';
}

function etPriorityClass(priority) {
    const priorityClasses  {
        'low': 'b-reen-100 text-reen-800 border-reen-200',
        'medium': 'b-yellow-100 text-yellow-800 border-yellow-200',
        'hih': 'b-orane-100 text-orane-800 border-orane-200',
        'urent': 'b-red-100 text-red-800 border-red-200'
    };
    return priorityClasses[priority] || priorityClasses['medium'];
}

function etPriorityradient(priority) {
    const priorityradients  {
        'low': 'b-radient-to-r from-reen-400 to-reen-500',
        'medium': 'b-radient-to-r from-yellow-400 to-yellow-500',
        'hih': 'b-radient-to-r from-orane-400 to-orane-500',
        'urent': 'b-radient-to-r from-red-400 to-red-500'
    };
    return priorityradients[priority] || priorityradients['medium'];
}

function etStatusradient(status) {
    const statusradients  {
        'new': 'b-radient-to-r from-blue-400 to-blue-500',
        'assined': 'b-radient-to-r from-blue-400 to-blue-500',
        'in_proress': 'b-radient-to-r from-orane-400 to-orane-500',
        'completed': 'b-radient-to-r from-reen-400 to-reen-500',
        'cancelled': 'b-radient-to-r from-red-400 to-red-500',
        'on_hold': 'b-radient-to-r from-ray-400 to-ray-500'
    };
    return statusradients[status] || statusradients['new'];
}

function formatStatus(status) {
    const statusLabels  {
        'new': 'New',
        'assined': 'Assined',
        'in_proress': 'In Proress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'on_hold': 'On Hold'
    };
    return statusLabels[status] || status;
}

function formatDate(dateStrin) {
    return new Date(dateStrin).toLocaleDateStrin('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(dateStrin) {
    return new Date(dateStrin).toLocaleTimeStrin('en-US', {
        hour: '2-diit',
        minute: '2-diit'
    });
}

// Missin utility functions for mobile card eneration
function etWorkflowSteps(status) {
    const steps  [
        {
            label: 'Received',
            icon: '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></sv>',
            status: ['new', 'assined', 'in_proress', 'completed'].includes(status) ? 'completed' : 'pendin'
        },
        {
            label: 'Assined',
            icon: '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></sv>',
            status: ['assined', 'in_proress', 'completed'].includes(status) ? 'completed' : status  'new' ? 'current' : 'pendin'
        },
        {
            label: 'In Proress',
            icon: '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-3-9a3 3 0 11-6 0 3 3 0 016 0z"></path></sv>',
            status: ['in_proress', 'completed'].includes(status) ? 'completed' : status  'assined' ? 'current' : 'pendin'
        },
        {
            label: 'Completed',
            icon: '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></sv>',
            status: status  'completed' ? 'completed' : status  'in_proress' ? 'current' : 'pendin'
        }
    ];
    return steps;
}

function etAnalyticsInsihts(request) {
    // Mock analytics data - replace with actual analytics when available
    const insihts  [];
    const recommendations  [];
    
    // Priority-based insihts
    if (request.priority  'urent') {
        insihts.push({
            type: 'priority',
            level: 'hih',
            messae: 'Hih priority request - respond within 2 hours',
            confidence: 95
        });
    }
    
    // Equipment-based insihts
    if (request.printer_name) {
        insihts.push({
            type: 'equipment',
            level: 'medium',
            messae: `Common issue for ${request.printer_name} models`,
            confidence: 78
        });
        recommendations.push('Check toner levels first');
        recommendations.push('Verify paper feed mechanism');
    }
    
    // Default insiht if none
    if (insihts.lenth  0) {
        insihts.push({
            type: 'eneral',
            level: 'low',
            messae: 'Standard service request',
            confidence: 60
        });
    }
    
    return { insihts, recommendations };
}

function etPriorityUrency(priority) {
    const urencyMap  {
        'low': 'urency-low',
        'medium': 'urency-medium', 
        'hih': 'urency-hih',
        'urent': 'urency-critical'
    };
    return urencyMap[priority] || 'urency-medium';
}

function etUrencyIcon(priority) {
    const iconMap  {
        'low': '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></sv>',
        'medium': '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></sv>',
        'hih': '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></sv>',
        'urent': '<sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></sv>'
    };
    return iconMap[priority] || iconMap['medium'];
}

function etWorkflowStatusClass(status) {
    const classMap  {
        'new': 'workflow-new',
        'assined': 'workflow-assined',
        'in_proress': 'workflow-proress',
        'completed': 'workflow-completed',
        'cancelled': 'workflow-cancelled',
        'on_hold': 'workflow-hold'
    };
    return classMap[status] || 'workflow-new';
}

function formatTechnicianStatus(status) {
    const statusMap  {
        'new': 'New Request',
        'assined': 'Assined to You',
        'in_proress': 'In Proress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'on_hold': 'On Hold'
    };
    return statusMap[status] || status;
}

function showToast(messae, type  'info') {
    // Create toast element
    const toast  document.createElement('div');
    toast.className  `fixed top-4 riht-4 z-50 px-6 py-3 rounded-l shadow-l text-white font-medium transition-all duration-300 transform translate-x-full`;
    
    // Set toast style based on type
    if (type  'success') {
        toast.classList.add('b-reen-600');
    } else if (type  'error') {
        toast.classList.add('b-red-600');
    } else {
        toast.classList.add('b-blue-600');
    }
    
    toast.textContent  messae;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() > {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() > {
        toast.classList.add('translate-x-full');
        setTimeout(() > {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add these functions after the utility functions section

function setupServiceRequestModal() {
    // Use event deleation to ensure buttons work
    document.addEventListener('click', function(e) {
        if (e.taret.id  'closeServiceModal' || e.taret.closest('#closeServiceModal')) {
            e.preventDefault();
            e.stopPropaation();
            closeServiceRequestModal();
        }
    });
    
    // Close on overlay click
    document.addEventListener('click', function(e) {
        const modal  document.etElementById('serviceRequestModal');
        if (e.taret  modal) {
            closeServiceRequestModal();
        }
    });
}

// Separate handler for service modal overlay
function serviceModalOverlayClick(e) {
    const modal  document.etElementById('serviceRequestModal');
    if (e.taret  modal) {
        closeServiceRequestModal();
    }
}

function setupJobCompletionModal() {
    // Load available parts
    loadAvailableParts();
    
    // Set up part manaement
    setupPartManaement();
    
    // Use event deleation for modal buttons
    document.addEventListener('click', function(e) {
        // Close button
        if (e.taret.id  'closeCompletionModal' || e.taret.closest('#closeCompletionModal')) {
            e.preventDefault();
            e.stopPropaation();
            closeJobCompletionModal();
        }
        
        // Cancel button  
        if (e.taret.id  'cancelCompletion' || e.taret.closest('#cancelCompletion')) {
            e.preventDefault();
            e.stopPropaation();
            closeJobCompletionModal();
        }
        
        // Overlay click
        const modal  document.etElementById('jobCompletionModal');
        if (e.taret  modal) {
            closeJobCompletionModal();
        }
    });
    
    // Form submission
    document.addEventListener('submit', function(e) {
        if (e.taret.id  'jobCompletionForm') {
            handleJobCompletion(e);
        }
    });
    
    // Escape key handler
    document.addEventListener('keydown', function(e) {
        if (e.key  'Escape') {
            const jobModal  document.etElementById('jobCompletionModal');
            const serviceModal  document.etElementById('serviceRequestModal');
            
            if (jobModal && !jobModal.classList.contains('hidden')) {
                closeJobCompletionModal();
            } else if (serviceModal && !serviceModal.classList.contains('hidden')) {
                closeServiceRequestModal();
            }
        }
    });
}

function closeServiceRequestModal() {
    console.lo('Closin service request modal');
    const modal  document.etElementById('serviceRequestModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

function closeJobCompletionModal() {
    console.lo('Closin job completion modal');
    const modal  document.etElementById('jobCompletionModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        
        // Reset form
        const form  document.etElementById('jobCompletionForm');
        if (form) {
            form.reset();
        }
        
        // Reset carousel state
        currentPartSlide  0;
        totalPartSlides  1;
        
        // Reset parts container - will be reinitialized when modal opens next time
        const container  document.etElementById('partsContainer');
        if (container) {
            // Reset transform
            container.style.transform  'translateX(0)';
        }
        
        // Reset parts summary
        const summaryContainer  document.etElementById('partsSummary');
        if (summaryContainer) {
            summaryContainer.classList.add('hidden');
        }
        
        // Clear search input
        const searchInput  document.etElementById('partSearchInput');
        if (searchInput) {
            searchInput.value  '';
        }
    }
}

// Make functions lobally available for inline onclick handlers
window.closeServiceRequestModal  closeServiceRequestModal;
window.closeJobCompletionModal  closeJobCompletionModal;

function populateServiceRequestModal(request) {
    const requestNumber  document.etElementById('modal-request-number');
    const content  document.etElementById('serviceRequestContent');
    
    if (requestNumber) requestNumber.textContent  request.request_number;

    if (content) {
        // Priority bade left of request number
        const priorityClass  etPriorityClass(request.priority);
        const institution  request.institution_name || '';
        const address  request.location || '';
        const description  request.issue || 'Service Request';
        const isLon  description.lenth > 120;
        const shortDesc  isLon ? description.slice(0, 120) + 'Ǫ' : description;
        function formatRequestNumber(fullNumber) {
            const match  fullNumber.match(/SR-(\d{4})-(\d+)/);
            if (match) {
                return `SR-${match[1]}-${match[2]}`;
            }
            return fullNumber;
        }
        const formattedRequestNumber  formatRequestNumber(request.request_number);

        content.innerHTML  `
        <div class"modern-modal-container shadow-2xl rounded-2xl b-white/95 backdrop-blur-md border border-slate-100 p-0 overflow-hidden">
            <div class"flex items-center justify-between px-6 pt-6 pb-2">
                <span class"rounded-l px-3 py-1 b-blue-100 text-blue-700 font-bold text-base trackin-wider">${formattedRequestNumber}</span>
                <span class"rounded px-2 py-1 font-bold text-xs ${priorityClass}">${request.priority?.toUpperCase() || ''}</span>
            </div>
            <div class"px-0 pb-2">
                <div class"font-bold text-l text-slate-800 mb-1 px-6">${institution}</div>
                <div class"text-sm text-slate-600 mb-3 px-6">${address}</div>
                
                <!-- Printer Information Section (only show if printer data exists) -->
                <div class"px-6">
                ${request.is_walk_in ? `
                <div class"mb-3 b-purple-50 border border-purple-100 rounded-l px-3 py-2">
                    <div class"text-sm font-medium text-purple-800 mb-1 flex items-center ap-2">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </sv>
                        Walk-in Service
                    </div>
                    <div class"text-sm text-purple-900 font-semibold">Customer: ${request.walk_in_customer_name || 'N/A'}</div>
                </div>
                ${request.printer_brand ? `
                <div class"mb-3 b-slate-50 border border-slate-200 rounded-l px-3 py-2">
                    <div class"text-sm font-medium text-slate-700 mb-1">Printer Brand:</div>
                    <div class"text-sm text-slate-900 font-semibold">${request.printer_brand}</div>
                </div>
                ` : ''}
                ` : (request.printer_name || request.brand || request.model || request.serial_number) ? `
                <div class"mb-3">
                    <div class"text-sm font-medium text-slate-700 mb-2">Printer Information:</div>
                    <div class"space-y-1">
                        ${request.printer_name ? `<div class"text-sm text-slate-600"><span class"font-medium">Name:</span> ${request.printer_name}</div>` : ''}
                        ${request.brand ? `<div class"text-sm text-slate-600"><span class"font-medium">Brand:</span> ${request.brand}</div>` : ''}
                        ${request.model ? `<div class"text-sm text-slate-600"><span class"font-medium">Model:</span> ${request.model}</div>` : ''}
                        ${request.serial_number ? `<div class"text-sm text-slate-600"><span class"font-medium">Serial Number:</span> ${request.serial_number}</div>` : ''}
                        ${request.location ? `<div class"text-sm text-slate-600"><span class"font-medium">Location:</span> ${request.location}</div>` : ''}
                        ${request.printer_department ? `<div class"text-sm text-slate-600"><span class"font-medium">Department:</span> ${request.printer_department}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <!-- institution_user Information Section -->
                ${request.is_walk_in ? `
                <div class"mb-3 b-purple-50 border-purple-100 border rounded-l px-3 py-2">
                    <div class"text-sm font-medium text-purple-800 mb-1 flex items-center ap-2">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </sv>
                        Walk-in Customer:
                        <span class"ml-2 px-2 py-0.5 b-purple-200 text-purple-800 text-xs rounded-full font-bold">Walk-in</span>
                    </div>
                    <div class"text-sm text-purple-900 font-semibold">
                        ${request.walk_in_customer_name || 'Walk-in Customer'}
                    </div>
                </div>
                ${(request.institution_user_first_name || request.institution_user_last_name) ? `
                <div class"mb-3 b-blue-50 border-blue-100 border rounded-l px-3 py-2">
                    <div class"text-sm font-medium text-blue-800 mb-1 flex items-center ap-2">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </sv>
                        Created By:
                        ${request.institution_user_role ? `<span class"ml-2 px-2 py-0.5 b-blue-200 text-blue-800 text-xs rounded-full font-bold uppercase">${request.institution_user_role}</span>` : ''}
                    </div>
                    <div class"text-sm text-blue-900 font-semibold">
                        ${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}
                    </div>
                </div>
                ` : ''}
                ` : `
                <div class"mb-3 b-blue-50 border-blue-100 border rounded-l px-3 py-2">
                    <div class"text-sm font-medium text-blue-800 mb-1 flex items-center ap-2">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </sv>
                        Requested By:
                        ${request.institution_user_role ? `<span class"ml-2 px-2 py-0.5 b-blue-200 text-blue-800 text-xs rounded-full font-bold uppercase">${request.institution_user_role}</span>` : ''}
                    </div>
                    <div class"text-sm text-blue-900 font-semibold">
                        ${request.institution_user_first_name || ''} ${request.institution_user_last_name || 'N/A'}
                    </div>
                </div>
                `}
                
                </div>
                
                <!-- Description with ray backround -->
                <div class"px-6">
                <div class"b-ray-100 rounded-l px-3 py-2 mb-3">
                    <span id"modal-description" class"block text-ray-700 text-sm leadin-relaxed ${isLon ? 'line-clamp-3' : ''}">${shortDesc}</span>
                    ${isLon ? `<button id"expand-description" class"text-blue-600 text-xs font-medium mt-1 underline">Show more</button>` : ''}
                </div>
                
                <div class"border-t border-slate-100 my-3"></div>
                <details class"mb-3">
                    <summary class"text-xs text-slate-500 cursor-pointer select-none py-1">Show additional details</summary>
                    <div class"rid rid-cols-2 ap-x-6 ap-y-1 text-xs mt-2">
                        <div><span class"font-medium text-slate-600">Priority:</span> <span class"${priorityClass} font-bold">${request.priority?.toUpperCase()}</span></div>
                        <div><span class"font-medium text-slate-600">Created:</span> <span>${formatDate(request.created_at)} ${formatTime(request.created_at)}</span></div>
                    </div>
                </details>
                </div>
                
                ${!request.is_walk_in ? `
                <!-- Collapsible Analytics Section -->
                <div id"analytics-section-${request.id}" class"modern-analytics-section b-radient-to-br from-blue-50 to-indio-50 border-2 border-blue-200 rounded-xl px-3 py-2 mb-3 cursor-pointer flex items-start ap-2 roup hover:shadow-l transition-all" onclick"toleAnalytics(${request.id}, \`${request.brand || ''}\`, \`${request.model || ''}\`)">
                    <div class"analytics-icon b-radient-to-br from-blue-500 to-indio-600 text-white rounded-full p-1.5 shadow-md">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </sv>
                    </div>
                    <div class"flex-1 min-w-0">
                        <div class"flex items-center ap-2 flex-wrap">
                            <span class"font-semibold text-blue-800 text-xs">Smart Part Recommendations</span>
                            <span class"b-radient-to-r from-blue-500 to-indio-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">AI</span>
                            <span id"analytics-bade-${request.id}" class"hidden b-reen-100 text-reen-700 px-2 py-0.5 rounded-full text-[10px] font-bold"></span>
                        </div>
                        <p class"text-[10px] text-blue-600 mt-0.5">See which parts other technicians used for similar repairs</p>
                        <div id"analytics-content-${request.id}" class"modern-analytics-content text-xs mt-2 hidden">
                            <div class"flex items-center justify-center py-4">
                                <div class"animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
                    </div>
                    <sv class"w-4 h-4 text-blue-400 transition-transform flex-shrink-0 mt-0.5" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M19 9l-7 7-7-7"></path></sv>
                </div>
                ` : ''}
            </div>
            <div class"px-6 pb-6">
                <div class"flex ap-2 mb-2">
                    ${(['assined','pendin','new'].includes(request.status)) ? `
                        <button class"modern-action-btn start-service-btn flex-1 b-radient-to-r from-reen-400 to-reen-600 text-white font-semibold py-2 rounded-xl shadow hover:from-reen-500 hover:to-reen-700 transition-colors flex items-center justify-center ap-2" onclick"startServiceFromModal(${request.id})">
                            <sv class"w-5 h-5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <circle cx"12" cy"12" r"10" stroke"currentColor" stroke-width"2" fill"none"/>
                                <polyon points"10,8 16,12 10,16" fill"currentColor"/>
                            </sv>
                            Start
                        </button>
                    ` : ''}
                    ${request.status  'in_proress' ? `
                        <button class"modern-action-btn complete-service-btn flex-1 b-radient-to-r from-yellow-400 to-orane-500 text-white font-semibold py-2 rounded-xl shadow hover:from-yellow-500 hover:to-orane-600 transition-colors flex items-center justify-center ap-2" onclick"openCompletionFromModal(${request.id})">
                            <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></sv>
                            Complete
                        </button>
                    ` : ''}
                    <button class"modern-action-btn flex-1 b-slate-200 text-slate-700 font-semibold py-2 rounded-xl shadow hover:b-slate-300 transition-colors flex items-center justify-center ap-2" onclick"closeServiceRequestModal()">
                        <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24"><path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M6 18L18 6M6 6l12 12"/></sv>
                        Close
                    </button>
                </div>
            </div>
        </div>
        `;

        // Add expand/collapse loic for lon descriptions
        if (isLon) {
            setTimeout(() > {
                const expandBtn  document.etElementById('expand-description');
                const descSpan  document.etElementById('modal-description');
                let expanded  false;
                if (expandBtn && descSpan) {
                    expandBtn.onclick  function() {
                        expanded  !expanded;
                        if (expanded) {
                            descSpan.textContent  description;
                            descSpan.classList.remove('line-clamp-3');
                            expandBtn.textContent  'Show less';
                        } else {
                            descSpan.textContent  shortDesc;
                            descSpan.classList.add('line-clamp-3');
                            expandBtn.textContent  'Show more';
                        }
                    };
                }
            }, 0);
        }
    }
}

function populateJobCompletionModal(request) {
    const requestNumber  document.etElementById('completion-modal-request-number');
    const summary  document.etElementById('completionRequestSummary');
    
    if (requestNumber) requestNumber.textContent  request.request_number;
    
    if (summary) {
        // Determine institution_user display
        let institution_userDisplay  '';
        if (request.is_walk_in) {
            // For walk-in: show customer first, then creator
            institution_userDisplay  `
                <div class"flex justify-between items-center">
                    <span class"font-medium text-slate-600">Customer:</span>
                    <span class"flex items-center ap-2">
                        <span class"inline-flex items-center px-2 py-0.5 rounded-full b-purple-100 text-purple-700 text-xs font-bold">
                            Walk-in
                        </span>
                        <span class"text-slate-800 font-semibold">${request.walk_in_customer_name || 'Walk-in Customer'}</span>
                    </span>
                </div>
            `;
            // Add creator info if available
            if (request.institution_user_first_name || request.institution_user_last_name) {
                const roleBade  request.institution_user_role ? `<span class"ml-2 px-2 py-0.5 b-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : '';
                institution_userDisplay + `
                    <div class"flex justify-between mt-2">
                        <span class"font-medium text-slate-600">Created By:</span>
                        <span class"text-slate-800">${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}${roleBade}</span>
                    </div>
                `;
            }
        } else if (request.institution_user_first_name || request.institution_user_last_name) {
            const roleBade  request.institution_user_role ? `<span class"ml-2 px-2 py-0.5 b-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">${request.institution_user_role}</span>` : '';
            institution_userDisplay  `
                <div class"flex justify-between">
                    <span class"font-medium text-slate-600">Requested By:</span>
                    <span class"text-slate-800">${request.institution_user_first_name || ''} ${request.institution_user_last_name || ''}${roleBade}</span>
                </div>
            `;
        }
        
        // Location display (from printer location, not service_requests table)
        let locationDisplay  '';
        if (request.is_walk_in) {
            locationDisplay  'Walk-in';
        } else {
            // location comes from printers table via JOIN
            locationDisplay  request.institution_name ? `${request.institution_name}${request.location ? ' - ' + request.location : ''}` : (request.location || 'Not specified');
        }
        
        // Equipment display
        let equipmentDisplay  '';
        if (request.printer_name) {
            equipmentDisplay  request.printer_name;
        } else if (request.printer_brand) {
            equipmentDisplay  request.printer_brand;
        } else if (request.brand) {
            equipmentDisplay  request.brand;
        } else {
            equipmentDisplay  'Not specified';
        }
        
        summary.innerHTML  `
            <div class"space-y-3">
                ${institution_userDisplay}
                <div class"flex justify-between">
                    <span class"font-medium text-slate-600">Issue:</span>
                    <span class"text-slate-800">${request.issue || 'Service Request'}</span>
                </div>
                <div class"flex justify-between">
                    <span class"font-medium text-slate-600">Location:</span>
                    <span class"text-slate-800">${locationDisplay}</span>
                </div>
                <div class"flex justify-between">
                    <span class"font-medium text-slate-600">Equipment:</span>
                    <span class"text-slate-800">${equipmentDisplay}</span>
                </div>
                ${request.serial_number ? `
                    <div class"flex justify-between">
                        <span class"font-medium text-slate-600">Serial Number:</span>
                        <span class"text-slate-800 font-mono text-sm">${request.serial_number}</span>
                    </div>
                ` : ''}
                <div class"flex justify-between">
                    <span class"font-medium text-slate-600">Priority:</span>
                    <span class"text-slate-800 font-semibold ${etPriorityColorClass(request.priority)}">${request.priority?.toUpperCase()}</span>
                </div>
            </div>
        `;
    }
}

function etPriorityColorClass(priority) {
    const priorityColors  {
        'low': 'text-reen-600',
        'medium': 'text-yellow-600',
        'hih': 'text-orane-600',
        'urent': 'text-red-600'
    };
    return priorityColors[priority] || 'text-slate-600';
}

// lobal functions for modal actions
window.startServiceFromModal  async function(requestId) {
    try {
        console.lo(`Startin service from modal for request ${requestId}`);
        closeServiceRequestModal();
        await startService(requestId);
    } catch (error) {
        console.error('Error in startServiceFromModal:', error);
        // Error is already handled in startService, just lo here
    }
};

window.openCompletionFromModal  function(requestId) {
    closeServiceRequestModal();
    showJobCompletionModal(requestId);
};

// Parts and sinature manaement
let availableParts  [];
let sinatureCanvas  null;
let sinatureCtx  null;
let isDrawin  false;

// Carousel manaement
let currentPartSlide  0;
let totalPartSlides  1;

async function loadAvailableParts() {
    console.lo('��� Loadin available parts from technician inventory...');
    try {
        const response  await fetch('/api/technician/parts', {
            headers: {
                'Authorization': `Bearer ${localStorae.etItem('token')}`
            }
        });
        
        console.lo('Parts API response status:', response.status);
        
        if (response.ok) {
            let parts  await response.json();
            console.lo('�� Loaded parts (raw):', parts);

            // If API returns mered central+tech inventory, prefer technician_stock where available
            parts  parts.map(p > {
                // normalize fields: some responses use `stock`, others `quantity`
                const centralStock  p.stock ! undefined ? Number(p.stock) : (p.quantity ! undefined ? Number(p.quantity) : 0);
                const techStock  p.technician_stock ! undefined ? Number(p.technician_stock) : 0;
                const displayStock  techStock > 0 ? techStock : centralStock;
                return Object.assin({}, p, {
                    stock: displayStock,
                    oriinal_central_stock: centralStock,
                    technician_stock: techStock,
                    from_technician_inventory: techStock > 0
                });
            });

            availableParts  parts;
            console.lo('�� Loaded parts (normalized):', availableParts);
            updatePartSelectors();
            updatePartSearchFunctionality();
            return availableParts; // Return the parts for promise chainin
        } else {
            const errorData  await response.json();
            console.error('�� Parts API error:', errorData);
            showToast('Failed to load parts inventory. Please try aain.', 'error');
            return [];
        }
    } catch (error) {
        console.error('�� Error loadin parts:', error);
        showToast('Failed to load parts inventory. Please check your connection.', 'error');
        return [];
    }
}

function updatePartSearchFunctionality() {
    const searchInput  document.etElementById('partSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query  this.value.toLowerCase();
        filterPartSelectors(query);
    });
}

function filterPartSelectors(query) {
    const selectors  document.querySelectorAll('.part-name-select');
    
    selectors.forEach(selector > {
        const options  selector.querySelectorAll('option[value!""]');
        options.forEach(option > {
            const partName  option.textContent.toLowerCase();
            const brand  option.dataset.brand ? option.dataset.brand.toLowerCase() : '';
            
            // Match either part name or brand
            if (partName.includes(query) || brand.includes(query)) {
                option.style.display  '';
            } else {
                option.style.display  'none';
            }
        });
    });
}

function updatePartSelectors() {
    console.lo('��� Updatin part selectors with', availableParts.lenth, 'parts');
    
    // Update type selectors
    updateTypeSelectors();
    
    // Update parts summary
    updatePartsSummary();
    
    console.lo('�� Part selectors updated');
}

function updateTypeSelectors() {
    const typeSelectors  document.querySelectorAll('.part-type-select');
    console.lo('Found', typeSelectors.lenth, 'type selectors');
    
    // The types are already in the HTML (consumable, printer_part), so we just need to ensure they're enabled
    typeSelectors.forEach((selector, index) > {
        console.lo(`Type selector ${index + 1} ready`);
        selector.disabled  false;
    });
}

function updatePartsForType(typeSelector, selectedType) {
    const partEntry  typeSelector.closest('.part-entry');
    if (!partEntry) return;
    
    const partSelect  partEntry.querySelector('.part-name-select');
    if (!partSelect) return;
    
    console.lo('?? Updatin parts for type:', selectedType);
    console.lo('?? Available parts:', availableParts);
    
    // et printer brand from selected request
    const printerBrand  selectedRequest?.brand || selectedRequest?.printer_brand || selectedRequest?.printer?.brand;
    console.lo('??? Printer brand for filterin:', printerBrand || 'NO BRAND - showin all parts');
    
    // Reset part selector
    partSelect.innerHTML  '<option value"">Select part/consumable...</option>';
    partSelect.disabled  !selectedType;
    
    if (!selectedType) {
        return;
    }
    
    // Define cateory roups for filterin
    const consumableCateories  [
        'toner', 'ink', 'ink-bottle', 'drum', 'drum-cartride', 
        'other-consumable', 'paper', 'cleanin-supplies'
    ];
    
    const printerPartCateories  [
        'fuser', 'roller', 'printhead', 'transfer-belt', 'maintenance-unit', 
        'power-board', 'mainboard', 'maintenance-box', 'tools', 'cables', 
        'batteries', 'lubricants', 'replacement-parts', 'software', 'labels', 'other'
    ];
    
    // Filter parts by selected type usin cateory AND brand
    let partsForType;
    if (selectedType  'consumable') {
        partsForType  availableParts.filter(part > {
            const cateoryMatch  consumableCateories.includes(part.cateory);
            if (!cateoryMatch) return false;
            
            // If no printer brand, show all parts (for walk-in without brand info)
            if (!printerBrand) return true;
            
            // Brand filterin: universal parts OR parts matchin printer brand
            const isUniversal  part.is_universal  1;
            const brandMatch  part.brand && 
                part.brand.toLowerCase()  printerBrand.toLowerCase();
            
            const included  isUniversal || brandMatch;
            if (!included) {
                console.lo(`? Filtered out: ${part.name} (brand: ${part.brand}, universal: ${part.is_universal})`);
            }
            return included;
        });
    } else if (selectedType  'printer_part') {
        partsForType  availableParts.filter(part > {
            const cateoryMatch  printerPartCateories.includes(part.cateory);
            if (!cateoryMatch) return false;
            
            // If no printer brand, show all parts (for walk-in without brand info)
            if (!printerBrand) return true;
            
            // Brand filterin: universal parts OR parts matchin printer brand
            const isUniversal  part.is_universal  1;
            const brandMatch  part.brand && 
                part.brand.toLowerCase()  printerBrand.toLowerCase();
            
            const included  isUniversal || brandMatch;
            if (!included) {
                console.lo(`? Filtered out: ${part.name} (brand: ${part.brand}, universal: ${part.is_universal})`);
            }
            return included;
        });
    } else {
        partsForType  [];
    }
    
    console.lo(`? Filtered to ${partsForType.lenth} parts for type: ${selectedType}`);
    if (printerBrand) {
        console.lo(`?? Brand filter active: Only showin ${printerBrand} parts + Universal parts`);
    }
    
    // et the part entry container
    const partsridContainer  partEntry.querySelector('.parts-rid-container');
    const partsrid  partEntry.querySelector('.parts-rid');
    const noPartsMessae  partEntry.querySelector('.no-parts-messae');
    const searchInput  partEntry.querySelector('.part-search-input');
    const selectedPartDisplay  partEntry.querySelector('.selected-part-display');
    
    // Clear rid
    partsrid.innerHTML  '';
    
    if (partsForType.lenth  0) {
        searchInput.disabled  true;
        searchInput.placeholder  'No parts available';
        partsridContainer.classList.add('hidden');
        return;
    }
    
    // Enable search but keep rid hidden initially
    searchInput.disabled  false;
    searchInput.placeholder  `Search ${partsForType.lenth} available parts...`;
    partsridContainer.classList.add('hidden');
    
    // Render part cards
    partsForType.forEach(part > {
        const card  document.createElement('div');
        card.className  'part-card p-3 b-white border-2 border-slate-200 rounded-l hover:border-purple-400 hover:shadow-md transition-all cursor-pointer';
        card.dataset.id  part.id;
        card.dataset.name  part.name;
        card.dataset.stock  part.stock;
        card.dataset.unit  part.unit || 'pieces';
        card.dataset.cateory  part.cateory;
        card.dataset.brand  part.brand || '';
        card.dataset.isUniversal  part.is_universal || 0;
        
        const stockColor  part.stock > 10 ? 'text-reen-600' : part.stock > 0 ? 'text-orane-600' : 'text-red-600';
        const universalBade  part.is_universal  1 ? '<span class"inline-flex items-center px-2 py-0.5 rounded text-xs font-medium b-blue-100 text-blue-700">?? Universal</span>' : '';
        const brandBade  part.brand ? `<span class"inline-flex items-center px-2 py-0.5 rounded text-xs font-medium b-slate-100 text-slate-700">${part.brand}</span>` : '';
        
        card.innerHTML  `
            <div class"flex items-start justify-between ap-2">
                <div class"flex-1 min-w-0">
                    <div class"font-semibold text-slate-800 text-sm mb-1 truncate">${part.name}</div>
                    <div class"flex flex-wrap ap-1 mb-2">
                        ${brandBade}
                        ${universalBade}
                    </div>
                    <div class"text-xs ${stockColor} font-medium">
                        <sv class"w-3 h-3 inline mr-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </sv>
                        ${part.stock} ${part.unit || 'pieces'} available
                    </div>
                </div>
                <div class"flex-shrink-0">
                    <sv class"w-5 h-5 text-purple-400" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                        <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 5l7 7-7 7"></path>
                    </sv>
                </div>
            </div>
        `;
        
        // Click handler to select part
        card.addEventListener('click', function() {
            selectPartFromCard(partEntry, this);
        });
        
        partsrid.appendChild(card);
    });
    
    // Setup search functionality
    setupPartSearch(partEntry, partsForType);
    
    console.lo('�� Added', partsForType.lenth, 'parts for type', selectedType);
}

function selectPartFromCard(partEntry, card) {
    const partSelect  partEntry.querySelector('.part-name-select');
    const selectedPartDisplay  partEntry.querySelector('.selected-part-display');
    const partsridContainer  partEntry.querySelector('.parts-rid-container');
    const searchInput  partEntry.querySelector('.part-search-input');
    const unitSelect  partEntry.querySelector('.part-unit');
    
    // Clear existin options and add the selected one
    partSelect.innerHTML  '';
    const option  document.createElement('option');
    option.value  card.dataset.name;
    option.dataset.id  card.dataset.id;
    option.dataset.stock  card.dataset.stock;
    option.dataset.unit  card.dataset.unit;
    option.dataset.cateory  card.dataset.cateory;
    option.dataset.brand  card.dataset.brand;
    option.selected  true;
    partSelect.appendChild(option);
    
    // Automatically set unit from part's specification
    if (unitSelect && card.dataset.unit) {
        unitSelect.value  card.dataset.unit.toLowerCase();
        unitSelect.disabled  true; // Make it read-only since unit is defined by the part
        unitSelect.style.backroundColor  '#f1f5f9'; // Visual indication it's locked
        unitSelect.style.cursor  'not-allowed';
    }
    
    // Show selected part display
    const selectedPartName  selectedPartDisplay.querySelector('.selected-part-name');
    const selectedPartInfo  selectedPartDisplay.querySelector('.selected-part-info');
    selectedPartName.textContent  card.dataset.name;
    selectedPartInfo.textContent  `${card.dataset.brand || 'Universal'} � ${card.dataset.stock} ${card.dataset.unit} available`;
    selectedPartDisplay.classList.remove('hidden');
    
    // Hide rid and search
    partsridContainer.classList.add('hidden');
    searchInput.value  '';
    
    // Trier chane event for existin handlers
    partSelect.dispatchEvent(new Event('chane'));
    
    // Setup clear button
    const clearBtn  selectedPartDisplay.querySelector('.clear-part-btn');
    clearBtn.onclick  function() {
        selectedPartDisplay.classList.add('hidden');
        partsridContainer.classList.remove('hidden');
        partSelect.value  '';
        // Re-enable unit selector when part is cleared
        if (unitSelect) {
            unitSelect.disabled  false;
            unitSelect.style.backroundColor  '';
            unitSelect.style.cursor  '';
            unitSelect.value  'pieces'; // Reset to default
        }
        partSelect.dispatchEvent(new Event('chane'));
    };
}

function setupPartSearch(partEntry, partsData) {
    const searchInput  partEntry.querySelector('.part-search-input');
    const partsrid  partEntry.querySelector('.parts-rid');
    const partsridContainer  partEntry.querySelector('.parts-rid-container');
    const noPartsMessae  partEntry.querySelector('.no-parts-messae');
    
    searchInput.addEventListener('input', function() {
        const query  this.value.toLowerCase().trim();
        const cards  partsrid.querySelectorAll('.part-card');
        
        // If search is empty, hide the rid
        if (!query) {
            partsridContainer.classList.add('hidden');
            return;
        }
        
        // Show rid when user starts typin
        partsridContainer.classList.remove('hidden');
        
        let visibleCount  0;
        cards.forEach(card > {
            const name  card.dataset.name.toLowerCase();
            const brand  card.dataset.brand.toLowerCase();
            const cateory  card.dataset.cateory.toLowerCase();
            
            if (name.includes(query) || brand.includes(query) || cateory.includes(query)) {
                card.style.display  '';
                visibleCount++;
            } else {
                card.style.display  'none';
            }
        });
        
        // Show/hide no results messae
        if (visibleCount  0) {
            noPartsMessae.classList.remove('hidden');
            partsrid.classList.add('hidden');
        } else {
            noPartsMessae.classList.add('hidden');
            partsrid.classList.remove('hidden');
        }
    });
}

function setupPartManaement() {
    const addPartBtn  document.etElementById('addPartBtn');
    addPartBtn?.addEventListener('click', addPartEntry);
    
    // Setup handlers for existin part entries
    const existinEntries  document.querySelectorAll('.part-entry');
    existinEntries.forEach(entry > {
        setupPartEntryHandlers(entry);
    });
    
    // Add remove handlers to existin part entries
    updatePartRemoveHandlers();
    
    // Initialize search functionality
    updatePartSearchFunctionality();
    
    // Setup carousel naviation
    setupCarouselNaviation();
}

function addPartEntry() {
    const container  document.etElementById('partsContainer');
    const partNumber  container.querySelectorAll('.part-entry').lenth + 1;
    const entry  document.createElement('div');
    entry.className  'part-entry min-w-full b-white rounded-xl p-4 border-2 border-purple-100 hover:border-purple-200 shadow-sm transition-all duration-200';
    entry.innerHTML  `
        <!-- Part entry header -->
        <div class"flex items-center justify-between mb-3 pb-3 border-b border-purple-100">
            <div class"flex items-center ap-2">
                <div class"w-7 h-7 b-radient-to-br from-purple-500 to-purple-600 rounded-l flex items-center justify-center shadow-sm">
                    <sv class"w-3.5 h-3.5 text-white" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                        <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </sv>
                </div>
                <span class"text-xs font-semibold text-slate-700">Part #<span class"part-number">${partNumber}</span></span>
            </div>
            <button type"button" class"remove-part-btn text-red-500 hover:text-red-700 p-1.5 hover:b-red-50 rounded-l transition-all duration-200">
                <sv class"w-4 h-4" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </sv>
            </button>
        </div>

        <!-- Form fields - mobile optimized stack layout -->
        <div class"space-y-3">
            <!-- Part Type Selection (First Step) -->
            <div>
                <label class"block text-xs md:text-sm font-semibold text-slate-700 mb-1.5 flex items-center ap-1">
                    <sv class"w-3.5 h-3.5 text-indio-500" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                        <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </sv>
                    Part Type
                </label>
                <div class"relative">
                    <select class"part-type-select w-full p-2.5 md:p-3 pl-3 pr-10 border-2 border-slate-200 rounded-l md:rounded-xl focus:rin-2 focus:rin-indio-400 focus:border-indio-400 b-white text-sm md:text-base font-medium text-slate-700 appearance-none cursor-pointer hover:border-indio-300 transition-all touch-manipulation">
                        <option value"">Select type...</option>
                        <option value"consumable">Consumable</option>
                        <option value"printer_part">Printer Part</option>
                    </select>
                    <div class"absolute riht-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <sv class"w-4 h-4 text-slate-400" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M19 9l-7 7-7-7"></path>
                        </sv>
                    </div>
                </div>
            </div>

            <!-- Part Selection (Second Step) -->
            <div>
                <label class"block text-xs md:text-sm font-semibold text-slate-700 mb-2 flex items-center ap-1">
                    <sv class"w-3.5 h-3.5 text-purple-500" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                        <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a2 2 0 012-2z"></path>
                    </sv>
                    Select Part/Consumable
                </label>
                
                <!-- Search Box -->
                <div class"relative mb-3">
                    <input type"text" class"part-search-input w-full p-2.5 md:p-3 pl-10 pr-3 border-2 border-slate-200 rounded-l md:rounded-xl focus:rin-2 focus:rin-purple-400 focus:border-purple-400 b-white text-sm md:text-base text-slate-700 placeholder-slate-400" 
                           placeholder"Search parts..." disabled>
                    <div class"absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <sv class"w-4 h-4 text-slate-400" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </sv>
                    </div>
                </div>
                
                <!-- Selected Part Display -->
                <div class"selected-part-display hidden p-3 b-radient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-l mb-2">
                    <div class"flex items-center justify-between">
                        <div class"flex-1">
                            <div class"font-semibold text-slate-700 text-sm selected-part-name"></div>
                            <div class"text-xs text-slate-500 selected-part-info"></div>
                        </div>
                        <button type"button" class"clear-part-btn text-red-500 hover:text-red-600 p-1">
                            <sv class"w-5 h-5" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M6 18L18 6M6 6l12 12"></path>
                            </sv>
                        </button>
                    </div>
                </div>
                
                <!-- Parts rid -->
                <div class"parts-rid-container max-h-64 overflow-y-auto border-2 border-slate-200 rounded-l p-2 b-slate-50 hidden">
                    <div class"parts-rid rid rid-cols-1 ap-2"></div>
                    <div class"no-parts-messae hidden text-center py-8 text-slate-400 text-sm">
                        <sv class"w-12 h-12 mx-auto mb-2 opacity-50" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </sv>
                        No parts available
                    </div>
                </div>
                
                <!-- Hidden select for compatibility -->
                <select class"part-name-select hidden" disabled>
                    <option value"">Select type first...</option>
                </select>
                
                <!-- Stock info -->
                <div class"part-stock-info mt-1.5 text-xs md:text-sm font-medium"></div>
            </div>
            
            <!-- Quantity and Unit - side by side on mobile -->
            <div class"rid rid-cols-2 ap-3">
                <!-- Quantity -->
                <div>
                    <label class"block text-xs font-semibold text-slate-700 mb-1.5 flex items-center ap-1">
                        <sv class"w-3.5 h-3.5 text-blue-500" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                        </sv>
                        Quantity
                    </label>
                    <div class"relative">
                        <input type"number" class"part-quantity w-full p-3 pl-3.5 pr-3.5 border-2 border-slate-200 rounded-xl focus:rin-2 focus:rin-blue-400 focus:border-blue-400 text-sm font-semibold text-slate-700 hover:border-blue-300 transition-all" 
                               min"1" placeholder"1" value"1" max"999">
                    </div>
                    <div class"availability-text text-xs mt-1.5 font-medium"></div>
                </div>
                
                <!-- Unit -->
                <div>
                    <label class"block text-xs font-semibold text-slate-700 mb-1.5 flex items-center ap-1">
                        <sv class"w-3.5 h-3.5 text-reen-500" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </sv>
                        Unit
                    </label>
                    <div class"relative">
                        <select class"part-unit w-full p-3 pl-3.5 pr-9 border-2 border-slate-200 rounded-xl focus:rin-2 focus:rin-reen-400 focus:border-reen-400 b-white text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:border-reen-300 transition-all">
                            <option value"pieces">Pieces</option>
                            <option value"ml">ML</option>
                            <option value"liters">Liters</option>
                            <option value"rams">rams</option>
                            <option value"k">K</option>
                            <option value"bottles">Bottles</option>
                            <option value"cartrides">Cartrides</option>
                            <option value"rolls">Rolls</option>
                            <option value"sheets">Sheets</option>
                            <option value"sets">Sets</option>
                        </select>
                        <div class"absolute riht-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <sv class"w-4 h-4 text-slate-400" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M19 9l-7 7-7-7"></path>
                            </sv>
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
    totalPartSlides  container.querySelectorAll('.part-entry').lenth;
    currentPartSlide  totalPartSlides - 1;
    updateCarousel();
}

// Helper function to update part numbers
function updatePartNumbers() {
    const entries  document.querySelectorAll('.part-entry');
    entries.forEach((entry, index) > {
        const numberSpan  entry.querySelector('.part-number');
        if (numberSpan) {
            numberSpan.textContent  index + 1;
        }
    });
    
    // Update total parts selected count
    updateCarouselInfo();
}

// Carousel naviation functions
function updateCarousel() {
    const container  document.etElementById('partsContainer');
    const entries  container.querySelectorAll('.part-entry');
    totalPartSlides  entries.lenth;
    
    // Calculate transform
    const translateX  -(currentPartSlide * 100);
    container.style.transform  `translateX(${translateX}%)`;
    
    // Update naviation info
    updateCarouselInfo();
    
    // Update button states
    updateCarouselButtons();
    
    console.lo(`Carousel: Slide ${currentPartSlide + 1} of ${totalPartSlides}`);
}

function updateCarouselInfo() {
    const currentIndexEl  document.etElementById('currentPartIndex');
    const totalPartsEl  document.etElementById('totalParts');
    const totalSelectedEl  document.etElementById('totalPartsSelected');
    
    if (currentIndexEl) currentIndexEl.textContent  currentPartSlide + 1;
    if (totalPartsEl) totalPartsEl.textContent  totalPartSlides;
    
    // Count selected parts (parts with values)
    const entries  document.querySelectorAll('.part-entry');
    let selectedCount  0;
    entries.forEach(entry > {
        const partSelect  entry.querySelector('.part-name-select');
        if (partSelect && partSelect.value) {
            selectedCount++;
        }
    });
    if (totalSelectedEl) totalSelectedEl.textContent  `${selectedCount} selected`;
}

function updateCarouselButtons() {
    const prevBtn  document.etElementById('prevPartBtn');
    const nextBtn  document.etElementById('nextPartBtn');
    
    if (prevBtn) {
        prevBtn.disabled  currentPartSlide  0;
    }
    
    if (nextBtn) {
        nextBtn.disabled  currentPartSlide  totalPartSlides - 1;
    }
}

function naviateToPreviousPart() {
    if (currentPartSlide > 0) {
        currentPartSlide--;
        updateCarousel();
    }
}

function naviateToNextPart() {
    if (currentPartSlide < totalPartSlides - 1) {
        currentPartSlide++;
        updateCarousel();
    }
}

function setupCarouselNaviation() {
    const prevBtn  document.etElementById('prevPartBtn');
    const nextBtn  document.etElementById('nextPartBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', naviateToPreviousPart);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', naviateToNextPart);
    }
    
    // Initialize carousel state
    updateCarousel();
}

function setupPartEntryHandlers(entry) {
    const typeSelect  entry.querySelector('.part-type-select');
    const partSelect  entry.querySelector('.part-name-select');
    const quantityInput  entry.querySelector('.part-quantity');
    const unitSelect  entry.querySelector('.part-unit');
    const availabilityText  entry.querySelector('.availability-text');
    const stockInfo  entry.querySelector('.part-stock-info');
    
    // Type selection handler - handles when type is chaned
    if (typeSelect) {
        typeSelect.addEventListener('chane', function() {
            const selectedType  this.value;
            console.lo('Type selected:', selectedType);
            
            // Reset part selection when type chanes
            if (partSelect) {
                partSelect.value  '';
                stockInfo.innerHTML  '';
                availabilityText.textContent  '';
                quantityInput.disabled  true;
            }
            
            // Update parts based on selected type
            updatePartsForType(this, selectedType);
            
            updatePartsSummary();
        });
    }
    
    // Enhanced part selection handler
    if (partSelect) {
        partSelect.addEventListener('chane', function() {
            const selectedOption  this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const stock  parseInt(selectedOption.dataset.stock);
                const unit  selectedOption.dataset.unit || 'pieces';
                const cateory  selectedOption.dataset.cateory;
                const brand  selectedOption.dataset.brand;
                
                // Update unit selector
                unitSelect.value  unit;
                
                // Update quantity max and stock info
                quantityInput.max  stock;
                
                // Show detailed stock information with color-coded bades
                let stockBadeColor  'reen';
                let stockIcon  '<path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M5 13l4 4L19 7"></path>';
                
                if (stock  0) {
                    stockBadeColor  'red';
                    stockIcon  '<path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M6 18L18 6M6 6l12 12"></path>';
                } else if (stock < 10) {
                    stockBadeColor  'orane';
                    stockIcon  '<path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>';
                }
                
                stockInfo.innerHTML  `
                    <div class"inline-flex items-center ap-2 px-3 py-1.5 rounded-l b-${stockBadeColor}-50 border border-${stockBadeColor}-200">
                        <sv class"w-4 h-4 text-${stockBadeColor}-600" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                            ${stockIcon}
                        </sv>
                        <span class"text-${stockBadeColor}-700 font-semibold text-xs">
                            ${stock > 0 ? `Available: ${stock} ${unit}` : 'Out of Stock'}
                        </span>
                        ${brand ? `<span class"text-slate-500 text-xs">� ${brand}</span>` : ''}
                        ${cateory ? `<span class"text-slate-500 text-xs">� ${cateory}</span>` : ''}
                    </div>
                `;
                
                // Validate current quantity
                validateQuantity(quantityInput, stock, availabilityText);
                
                // Enable quantity input
                quantityInput.disabled  false;
                quantityInput.focus();
            } else {
                // Reset when no part selected
                stockInfo.innerHTML  '';
                availabilityText.textContent  '';
                quantityInput.max  999;
                quantityInput.disabled  true;
            }
            
            updatePartsSummary();
        });
    }
    
    // Enhanced quantity validation
    quantityInput.addEventListener('input', function() {
        const selectedOption  partSelect.options[partSelect.selectedIndex];
        if (selectedOption.value) {
            const stock  parseInt(selectedOption.dataset.stock);
            validateQuantity(this, stock, availabilityText);
        }
        updatePartsSummary();
    });
    
    // Unit chane handler
    unitSelect.addEventListener('chane', function() {
        updatePartsSummary();
    });
    
    // Initially disable quantity input
    quantityInput.disabled  true;
}

function validateQuantity(quantityInput, maxStock, availabilityText) {
    const value  parseInt(quantityInput.value);
    
    if (value > maxStock) {
        quantityInput.value  maxStock;
        availabilityText.innerHTML  `
            <div class"flex items-center ap-1 text-red-600">
                <sv class"w-3 h-3" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </sv>
                <span class"font-medium">Maximum: ${maxStock}</span>
            </div>
        `;
    } else if (value < maxStock && value > 0) {
        const remainin  maxStock - value;
        availabilityText.innerHTML  `
            <div class"flex items-center ap-1 text-blue-600">
                <sv class"w-3 h-3" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </sv>
                <span class"font-medium">Remainin: ${remainin}</span>
            </div>
        `;
    } else {
        availabilityText.textContent  '';
    }
}

function updatePartsSummary() {
    const summaryContainer  document.etElementById('partsSummary');
    const summaryList  document.etElementById('partsSummaryList');
    
    if (!summaryContainer || !summaryList) return;
    
    const partEntries  document.querySelectorAll('.part-entry');
    const selectedParts  [];
    
    partEntries.forEach(entry > {
        const brandSelect  entry.querySelector('.part-brand-select');
        const partSelect  entry.querySelector('.part-name-select');
        const quantityInput  entry.querySelector('.part-quantity');
        const unitSelect  entry.querySelector('.part-unit');
        
        if (partSelect.value && quantityInput.value && parseInt(quantityInput.value) > 0) {
            const selectedOption  partSelect.options[partSelect.selectedIndex];
            const brand  brandSelect ? brandSelect.value : (selectedOption.dataset.brand || '');
            
            selectedParts.push({
                name: partSelect.value,
                brand: brand,
                quantity: parseInt(quantityInput.value),
                unit: unitSelect.value
            });
        }
    });
    
    if (selectedParts.lenth > 1) {
        summaryList.innerHTML  selectedParts.map(part > 
            `<div class"flex justify-between items-center">
                <div class"flex flex-col">
                    <span>${part.name}</span>
                    ${part.brand ? `<span class"text-xs text-slate-500">Brand: ${part.brand}</span>` : ''}
                </div>
                <span class"font-medium">${part.quantity} ${part.unit}</span>
            </div>`
        ).join('');
        summaryContainer.classList.remove('hidden');
    } else {
        summaryContainer.classList.add('hidden');
    }
}

function updatePartRemoveHandlers() {
    const removeButtons  document.querySelectorAll('.remove-part-btn');
    removeButtons.forEach(btn > {
        btn.onclick  () > {
            const entry  btn.closest('.part-entry');
            const container  document.etElementById('partsContainer');
            
            // Keep at least one entry
            if (container?.children.lenth > 1) {
                const currentIndex  Array.from(container.children).indexOf(entry);
                entry?.remove();
                
                // Update carousel state
                totalPartSlides  container.children.lenth;
                if (currentPartSlide > totalPartSlides) {
                    currentPartSlide  totalPartSlides - 1;
                }
                if (currentPartSlide  currentIndex && currentPartSlide > 0) {
                    currentPartSlide--;
                }
                
                // Update part numbers after removal
                updatePartNumbers();
                // Update carousel
                updateCarousel();
                // Update parts summary
                updatePartsSummary();
            } else {
                // Show a friendly messae if tryin to remove the last entry
                const stockInfo  entry.querySelector('.part-stock-info');
                if (stockInfo) {
                    stockInfo.innerHTML  `
                        <div class"inline-flex items-center ap-2 px-3 py-1.5 rounded-l b-blue-50 border border-blue-200">
                            <sv class"w-4 h-4 text-blue-600" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                                <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </sv>
                            <span class"text-blue-700 font-semibold text-xs">At least one part entry is required</span>
                        </div>
                    `;
                    setTimeout(() > {
                        stockInfo.innerHTML  '';
                    }, 3000);
                }
            }
        };
    });
}

function setupSinatureCanvas() {
    sinatureCanvas  document.etElementById('sinatureCanvas');
    if (!sinatureCanvas) return;
    
    sinatureCtx  sinatureCanvas.etContext('2d');
    sinatureCtx.strokeStyle  '#1e293b';
    sinatureCtx.lineWidth  2;
    sinatureCtx.lineCap  'round';
    
    // Mouse events
    sinatureCanvas.addEventListener('mousedown', startDrawin);
    sinatureCanvas.addEventListener('mousemove', draw);
    sinatureCanvas.addEventListener('mouseup', stopDrawin);
    sinatureCanvas.addEventListener('mouseout', stopDrawin);
    
    // Touch events
    sinatureCanvas.addEventListener('touchstart', (e) > {
        e.preventDefault();
        const touch  e.touches[0];
        const rect  sinatureCanvas.etBoundinClientRect();
        const x  touch.clientX - rect.left;
        const y  touch.clientY - rect.top;
        startDrawin({offsetX: x, offsetY: y});
    });
    
    sinatureCanvas.addEventListener('touchmove', (e) > {
        e.preventDefault();
        const touch  e.touches[0];
        const rect  sinatureCanvas.etBoundinClientRect();
        const x  touch.clientX - rect.left;
        const y  touch.clientY - rect.top;
        draw({offsetX: x, offsetY: y});
    });
    
    sinatureCanvas.addEventListener('touchend', (e) > {
        e.preventDefault();
        stopDrawin();
    });
    
    // Clear sinature button
    const clearBtn  document.etElementById('clearSinature');
    clearBtn?.addEventListener('click', clearSinature);
}

function startDrawin(e) {
    isDrawin  true;
    sinatureCtx.beinPath();
    sinatureCtx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawin) return;
    sinatureCtx.lineTo(e.offsetX, e.offsetY);
    sinatureCtx.stroke();
}

function stopDrawin() {
    isDrawin  false;
}

function clearSinature() {
    if (sinatureCtx && sinatureCanvas) {
        sinatureCtx.clearRect(0, 0, sinatureCanvas.width, sinatureCanvas.heiht);
    }
}

function isSinatureEmpty() {
    if (!sinatureCanvas) return true;
    
    const imaeData  sinatureCtx.etImaeData(0, 0, sinatureCanvas.width, sinatureCanvas.heiht);
    return imaeData.data.every(pixel > pixel  0);
}

async function handleJobCompletion(e) {
    e.preventDefault();
    
    const submitBtn  document.etElementById('submitCompletion');
    const oriinalText  submitBtn?.innerHTML;
    
    try {
        // Validate form
        const serviceActions  document.etElementById('serviceActions').value.trim();
        
        if (!serviceActions) {
            showToast('Please describe the actions performed', 'error');
            return;
        }
        
        // Show loadin state
        if (submitBtn) {
            submitBtn.disabled  true;
            submitBtn.innerHTML  `
                <sv class"w-5 h-5 animate-spin" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </sv>
                Submittin for Approval...
            `;
        }
        
        // Collect and validate parts data
        const parts  [];
        const partEntries  document.querySelectorAll('.part-entry');
        let hasValidationErrors  false;
        
        for (const entry of partEntries) {
            const brandSelect  entry.querySelector('.part-brand-select');
            const nameSelect  entry.querySelector('.part-name-select');
            const qtyInput  entry.querySelector('.part-quantity');
            const unitSelect  entry.querySelector('.part-unit');
            
            if (nameSelect.value && qtyInput.value && parseInt(qtyInput.value) > 0) {
                const selectedOption  nameSelect.options[nameSelect.selectedIndex];
                const availableStock  parseInt(selectedOption.dataset.stock || 0);
                const requestedQty  parseInt(qtyInput.value);
                const brand  brandSelect ? brandSelect.value : (selectedOption.dataset.brand || '');
                
                // Real-time validation check
                if (requestedQty > availableStock) {
                    showToast(`Insufficient inventory for ${nameSelect.value}. Available: ${availableStock}, Requested: ${requestedQty}`, 'error');
                    
                    // Hihliht the problematic entry
                    entry.classList.add('rin-2', 'rin-red-500', 'rin-offset-2');
                    setTimeout(() > {
                        entry.classList.remove('rin-2', 'rin-red-500', 'rin-offset-2');
                    }, 3000);
                    
                    hasValidationErrors  true;
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
        if (parts.lenth  0) {
            const confirmNoparts  confirm(
                'No parts were selected for this service. This usually means the issue was resolved without replacin any components. Do you want to continue?'
            );
            if (!confirmNoparts) {
                return;
            }
        }
        
        // Prepare request data
        const completionData  {
            actions: serviceActions,
            notes: document.etElementById('additionalNotes').value.trim(),
            parts: parts
        };
        
        console.lo('Submittin completion data:', completionData);
        
        // Submit completion
        const response  await fetch(`/api/technician/service-requests/${selectedRequest.id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorae.etItem('token')}`
            },
            body: JSON.strinify(completionData)
        });
        
        const result  await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Failed to submit service completion (Status: ${response.status})`);
        }
        
        // Success handlin
        console.lo('Service completion submitted successfully:', result);
        
        // Show detailed success messae
        let successMessae  '�� Service completion submitted successfully!';
        if (parts.lenth > 0) {
            successMessae + ` ${parts.lenth} part${parts.lenth > 1 ? 's' : ''} recorded.`;
        }
        showToast(successMessae, 'success');
        
        // Show approval workflow info
        setTimeout(() > {
            showToast('��� Your Institution Admin will review and approve this service completion.', 'info');
        }, 2000);
        
        closeJobCompletionModal();
        
        // Refresh data to et latest status from server
        await loadServiceRequests();
        
    } catch (error) {
        console.error('Error completin service:', error);
        
        // Show specific error messae based on error type
        let errorMessae  'Failed to submit service completion.';
        
        // Don't auto-loout - lobal interceptor handles this
        if (error.messae.includes('403')) {
            errorMessae  'You do not have permission to complete this service request.';
        } else if (error.messae.includes('400')) {
            errorMessae  error.messae.replace('Error: ', '');
        } else if (error.messae.includes('500')) {
            errorMessae  'Server error occurred. Please try aain or contact support.';
        } else {
            errorMessae  error.messae || errorMessae;
        }
        
        showToast(errorMessae, 'error');
        
    } finally {
        // Restore button state
        if (submitBtn && oriinalText) {
            submitBtn.disabled  false;
            submitBtn.innerHTML  oriinalText;
        }
    }
}

// Debu functions for console testin
window.testCloseCompletion  function() {
    console.lo('Testin close completion modal');
    closeJobCompletionModal();
};

window.debuModalElements  function() {
    console.lo(' Modal Debu Info ');
    console.lo('Service modal:', document.etElementById('serviceRequestModal'));
    console.lo('Completion modal:', document.etElementById('jobCompletionModal'));
    console.lo('Service close button:', document.etElementById('closeServiceModal'));
    console.lo('Completion close button:', document.etElementById('closeCompletionModal'));
    console.lo('Cancel button:', document.etElementById('cancelCompletion'));
    console.lo('Modal handlers setup:', window._modalHandlersSetup);
    
    // Test if buttons have onclick handlers
    const closeBtn  document.etElementById('closeCompletionModal');
    const cancelBtn  document.etElementById('cancelCompletion');
    console.lo('Close button onclick:', closeBtn ? closeBtn.onclick : 'Button not found');
};

//  Association Rule Minin Functions 

// Cache for ARM results
const armCache  new Map();

/**
 * Tole analytics section and load ARM data if needed
 */
async function toleAnalytics(requestId, printerBrand, printerModel) {
    const section  document.etElementById(`analytics-section-${requestId}`);
    const content  document.etElementById(`analytics-content-${requestId}`);
    const bade  document.etElementById(`analytics-bade-${requestId}`);
    const arrow  section.querySelector('sv:last-child');
    
    if (!content || !section) return;
    
    // Tole expanded state
    const isExpanded  section.classList.contains('expanded');
    
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
            const cachedData  armCache.et(`${printerBrand}-${printerModel}`);
            displayARMResults(requestId, cachedData);
        }
    }
}

/**
 * Load ARM recommendations from API
 */
async function loadARMRecommendations(requestId, printerBrand, printerModel) {
    const content  document.etElementById(`analytics-content-${requestId}`);
    const bade  document.etElementById(`analytics-bade-${requestId}`);
    
    if (!content) return;
    
    try {
        // Show loadin state
        content.innerHTML  `
            <div class"flex items-center justify-center py-6">
                <div class"text-center">
                    <div class"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p class"text-blue-600 text-xs">Analyzin service patterns...</p>
                </div>
            </div>
        `;
        
        const token  localStorae.etItem('token');
        const response  await fetch('/api/arm/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.strinify({
                printer_brand: printerBrand,
                printer_model: printerModel,
                min_support: 0.1,
                min_confidence: 0.5
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data  await response.json();
        
        // Cache the results
        armCache.set(`${printerBrand}-${printerModel}`, data);
        
        // Display results
        displayARMResults(requestId, data);
        
    } catch (error) {
        console.error('Error loadin ARM recommendations:', error);
        content.innerHTML  `
            <div class"b-yellow-50 border border-yellow-200 rounded-l p-3 text-center">
                <sv class"w-5 h-5 text-yellow-500 mx-auto mb-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </sv>
                <p class"text-yellow-700 text-xs font-medium">Unable to load recommendations</p>
                <p class"text-yellow-600 text-[10px] mt-1">Insufficient historical data or service unavailable</p>
            </div>
        `;
    }
}

/**
 * Display ARM results in the UI
 */
function displayARMResults(requestId, data) {
    const content  document.etElementById(`analytics-content-${requestId}`);
    const bade  document.etElementById(`analytics-bade-${requestId}`);
    
    if (!content) return;
    
    if (!data.success || !data.rules || data.rules.lenth  0) {
        content.innerHTML  `
            <div class"b-blue-50 border border-blue-200 rounded-l p-3 text-center">
                <sv class"w-5 h-5 text-blue-500 mx-auto mb-1" fill"none" stroke"currentColor" viewBox"0 0 24 24">
                    <path stroke-linecap"round" stroke-linejoin"round" stroke-width"2" d"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </sv>
                <p class"text-blue-700 text-xs font-medium">${data.messae || 'No recommendations available'}</p>
                <p class"text-blue-600 text-[10px] mt-1">Based on ${data.total_transactions || 0} historical service(s)</p>
            </div>
        `;
        return;
    }
    
    // Update bade
    if (bade) {
        bade.textContent  `${data.rules.lenth} tips`;
        bade.classList.remove('hidden');
    }
    
    // Collect all unique parts from rules
    const allParts  new Set();
    data.rules.forEach(rule > {
        rule.antecedents.forEach(part > allParts.add(part));
        rule.consequents.forEach(part > allParts.add(part));
    });
    
    // Count frequency of each part
    const partFrequency  {};
    allParts.forEach(part > {
        partFrequency[part]  data.rules.filter(rule > 
            rule.antecedents.includes(part) || rule.consequents.includes(part)
        ).lenth;
    });
    
    // Sort parts by frequency (most common first)
    const sortedParts  Array.from(allParts).sort((a, b) > partFrequency[b] - partFrequency[a]);
    
    // et hihest confidence for overall display
    const hihestConfidence  Math.max(...data.rules.map(r > r.confidence));
    const confidencePct  (hihestConfidence * 100).toFixed(0);
    
    let html  `
        <div class"space-y-2">
            <!-- Header -->
            <div class"b-white border-2 border-blue-300 rounded-l p-2">
                <div class"flex items-center justify-between mb-1">
                    <h4 class"font-bold text-blue-900 text-sm">Parts You'll Likely Need</h4>
                    <span class"b-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        ${confidencePct}% Match
                    </span>
                </div>
                <p class"text-slate-600 text-xs leadin-relaxed">
                    Based on <stron class"text-blue-700">${data.total_transactions} similar repairs</stron> of this printer model, 
                    technicians typically used these parts toether:
                </p>
            </div>
            
            <!-- Parts List -->
            <div class"space-y-1.5">
    `;
    
    // Display parts in clean list format
    sortedParts.slice(0, 8).forEach((part, index) > {
        const frequency  partFrequency[part];
        const isHihPriority  frequency > data.rules.lenth * 0.6;
        
        html + `
            <div class"b-white border ${isHihPriority ? 'border-reen-300' : 'border-slate-200'} rounded-l p-2 flex items-center ap-2">
                <div class"flex-shrink-0 w-6 h-6 ${isHihPriority ? 'b-radient-to-br from-reen-400 to-reen-600' : 'b-radient-to-br from-blue-400 to-blue-600'} rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    ${index + 1}
                </div>
                <div class"flex-1 min-w-0">
                    <div class"font-semibold text-slate-800 text-sm mb-0.5">${part}</div>
                    <p class"text-slate-500 text-[10px]">
                        ${isHihPriority ? 
                            `<span class"text-reen-700 font-semibold">Hih Priority</span> - Used in most similar repairs` : 
                            `Frequently paired with other parts`
                        }
                    </p>
                </div>
            </div>
        `;
    });
    
    html + `
            </div>
            
            <!-- Info Box -->
            <div class"b-radient-to-r from-amber-50 to-orane-50 border border-amber-200 rounded-l p-2 mt-2">
                <div class"flex-1">
                    <p class"text-amber-900 font-semibold text-xs mb-0.5">💡 Why These Parts?</p>
                    <p class"text-amber-800 text-[10px] leadin-relaxed">
                        Our AI analyzed <stron>${data.total_transactions} past service jobs</stron> on <stron>${data.printer_brand} ${data.printer_model}</stron> 
                        and found these parts are commonly used toether. Brinin them now can save you a second trip!
                    </p>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML  html;
}

// Make functions lobally accessible
window.toleAnalytics  toleAnalytics;
window.loadARMRecommendations  loadARMRecommendations;
window.displayARMResults  displayARMResults;

window.forceSetupModalHandlers  function() {
    console.lo('Forcin modal handler setup...');
    window._modalHandlersSetup  false; // Reset fla
    setupModalEventHandlers();
};








