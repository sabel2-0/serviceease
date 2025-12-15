    // Removed all fallback notification dropdown handlers
// Ensure auth.js is loaded before this script
document.addEventListener('DOMContentLoaded', function() {
    // Notification button logic (single modal, always loads from components/technician-notifications.html)
    const notificationBtn = document.querySelector('.notification-btn, #notificationBtn, .notification-button');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    console.log('Raw localStorage user:', localStorage.getItem('user'));

    // Attach click handlers to notification items loaded into the DOM
    function attachNotificationItemEvents() {
        const items = document.querySelectorAll('.notification-item');
        if (!items || items.length === 0) return;
        items.forEach(item => {
            // prevent double attaching
            if (item.dataset.listenerAttached === 'true') return;

            item.addEventListener('click', function(e) {
                e.stopPropagation();
                // Ripple effect: prefer global createRipple if available
                if (typeof window.createRipple === 'function') {
                    try { window.createRipple(e, item); } catch (err) { /* ignore */ }
                } else {
                    // fallback ripple
                    const rect = item.getBoundingClientRect();
                    const ripple = document.createElement('span');
                    ripple.className = 'ripple';
                    const size = Math.max(rect.width, rect.height);
                    ripple.style.width = ripple.style.height = size + 'px';
                    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
                    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
                    ripple.style.position = 'absolute';
                    ripple.style.borderRadius = '50%';
                    ripple.style.background = 'rgba(0,0,0,0.06)';
                    ripple.style.pointerEvents = 'none';
                    ripple.style.transform = 'scale(0)';
                    ripple.style.transition = 'transform 400ms ease, opacity 400ms ease';
                    item.style.position = item.style.position || 'relative';
                    item.appendChild(ripple);
                    requestAnimationFrame(() => { ripple.style.transform = 'scale(1)'; ripple.style.opacity = '0.01'; });
                    setTimeout(() => { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 600);
                }

                // Haptic
                if ('vibrate' in navigator) { try { navigator.vibrate(10); } catch (e) {} }

                // Log click for debugging and further handling
                console.log('[NOTIFICATIONS] item clicked:', item.dataset.id || null, item.textContent?.trim());

                // Custom global hook for click handling if exists
                if (typeof window.technicianNotificationClicked === 'function') {
                    try { window.technicianNotificationClicked(item.dataset.id || null); } catch (err) { console.error(err); }
                }
            });

            // mobile touch feedback
            item.addEventListener('touchstart', function() { item.style.transform = 'scale(0.98)'; });
            item.addEventListener('touchend', function() { item.style.transform = ''; });

            item.dataset.listenerAttached = 'true';
        });
    }

    // Expose globally so other components can call after dynamic load
    window.attachNotificationItemEvents = attachNotificationItemEvents;

    // If topnav is injected dynamically, observe for the notification button and attach modal behavior
    function attachTopnavNotificationHandler() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationModal = document.getElementById('notificationModal');
        const notificationModalContent = document.getElementById('notificationModalContent');
        const closeNotificationModal = document.getElementById('closeNotificationModal');
        if (!notificationBtn) return false;

        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.debug('technician.js: notificationBtn clicked (observer)');
            if (notificationModal) notificationModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            // Load content
            const url = '/components/technician-notifications.html';
            fetch(url).then(r => r.text()).then(html => {
                if (notificationModalContent) notificationModalContent.innerHTML = html;
                if (window.attachNotificationItemEvents) window.attachNotificationItemEvents();
            }).catch(err => {
                console.error('Failed to load notifications (observer):', err);
            });
        });

        if (closeNotificationModal) {
            closeNotificationModal.addEventListener('click', function() {
                if (notificationModal) notificationModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            });
        }

        return true;
    }

    // Try immediate attach; if not present, watch the document
    if (!attachTopnavNotificationHandler()) {
        const topnavObserver = new MutationObserver((mutations, obs) => {
            if (attachTopnavNotificationHandler()) {
                console.debug('technician.js: attached topnav notification handler via observer');
                obs.disconnect();
            }
        });
        topnavObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
    
    // Enhanced mobile interaction utilities
    function initializeMobileInteractions() {
        // Haptic feedback utility
        function triggerHapticFeedback(type = 'light') {
            if (navigator.vibrate) {
                const patterns = {
                    light: [10],
                    medium: [20],
                    heavy: [30],
                    success: [10, 50, 10],
                    error: [20, 100, 20]
                };
                navigator.vibrate(patterns[type] || patterns.light);
            }
        }
        
        // Enhanced touch interaction handlers
        function handleTouchStart(event) {
            const card = event.currentTarget;
            card.classList.add('touching');
            triggerHapticFeedback('light');
            
            // Add ripple effect
            const rect = card.getBoundingClientRect();
            const ripple = document.createElement('div');
            ripple.className = 'touch-ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (event.touches[0].clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (event.touches[0].clientY - rect.top - size / 2) + 'px';
            
            card.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        }
        
        function handleTouchEnd(event) {
            const card = event.currentTarget;
            setTimeout(() => {
                card.classList.remove('touching');
            }, 150);
        }
        
        function handleTouchCancel(event) {
            const card = event.currentTarget;
            card.classList.remove('touching');
        }
        
        // Apply to all service request cards
        function attachMobileInteractions() {
            const cards = document.querySelectorAll('.glass-card.mobile-optimized');
            cards.forEach(card => {
                // Remove existing listeners to prevent duplicates
                card.removeEventListener('touchstart', handleTouchStart);
                card.removeEventListener('touchend', handleTouchEnd);
                card.removeEventListener('touchcancel', handleTouchCancel);
                
                // Add enhanced touch listeners
                card.addEventListener('touchstart', handleTouchStart, { passive: true });
                card.addEventListener('touchend', handleTouchEnd, { passive: true });
                card.addEventListener('touchcancel', handleTouchCancel, { passive: true });
                
                // Add keyboard navigation support
                card.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerHapticFeedback('medium');
                        card.click();
                    }
                });
            });
        }
        
        // Make function globally available
        window.attachMobileInteractions = attachMobileInteractions;
        
        // Initial attachment
        attachMobileInteractions();
        
        // Reattach when new cards are added
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasNewCards = addedNodes.some(node => 
                        node.nodeType === 1 && 
                        (node.classList?.contains('glass-card-container') || 
                         node.querySelector?.('.glass-card.mobile-optimized'))
                    );
                    if (hasNewCards) {
                        setTimeout(attachMobileInteractions, 100);
                    }
                }
            });
        });
        
        // Observe the mobile cards container
        const mobileCardsContainer = document.getElementById('serviceRequestsCardsMobile');
        if (mobileCardsContainer) {
            observer.observe(mobileCardsContainer, { 
                childList: true, 
                subtree: true 
            });
        }
        
        // Global haptic feedback function
        window.triggerHapticFeedback = triggerHapticFeedback;
    }
    
    // Initialize mobile interactions
    initializeMobileInteractions();
    
    // Helper functions for UI formatting
    function formatDate(dateString) {
        if (!dateString) return { date: 'Unknown date', time: '' };
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { date: 'Invalid date', time: '' };
        
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', options);
        const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        return {
            date: formattedDate,
            time: formattedTime
        };
    }
    
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }
    
    function getStatusColor(status) {
        // Default colors
        let colors = {
            bg: 'gray-100',
            text: 'gray-800',
            border: 'gray-200',
            dot: 'gray-400',
            indicator: 'gray-400'
        };
        
        // Status-specific colors
        switch(status?.toLowerCase()) {
            case 'open':
                colors = {
                    bg: 'blue-50',
                    text: 'blue-700',
                    border: 'blue-100',
                    dot: 'blue-500',
                    indicator: 'blue-500'
                };
                break;
            case 'in progress':
                colors = {
                    bg: 'amber-50',
                    text: 'amber-700',
                    border: 'amber-100',
                    dot: 'amber-500',
                    indicator: 'amber-500'
                };
                break;
            case 'completed':
                colors = {
                    bg: 'green-50',
                    text: 'green-700',
                    border: 'green-100',
                    dot: 'green-500',
                    indicator: 'green-500'
                };
                break;
            case 'canceled':
                colors = {
                    bg: 'red-50',
                    text: 'red-700',
                    border: 'red-100',
                    dot: 'red-500',
                    indicator: 'red-500'
                };
                break;
            case 'pending':
                colors = {
                    bg: 'purple-50',
                    text: 'purple-700',
                    border: 'purple-100',
                    dot: 'purple-500',
                    indicator: 'purple-500'
                };
                break;
        }
        
        return colors;
    }
    
    function updateStatCounts(requests) {
        // Update stats counts based on service request status
        const totalCount = requests.length;
        const openCount = requests.filter(r => r.status?.toLowerCase() === 'open').length;
        const inProgressCount = requests.filter(r => r.status?.toLowerCase() === 'in progress').length;
        const completedCount = requests.filter(r => r.status?.toLowerCase() === 'completed').length;
        
        // Update the DOM elements
        document.querySelectorAll('.stat-total').forEach(el => el.textContent = totalCount);
        document.querySelectorAll('.stat-open').forEach(el => el.textContent = openCount);
        document.querySelectorAll('.stat-inprogress').forEach(el => el.textContent = inProgressCount);
        document.querySelectorAll('.stat-completed').forEach(el => el.textContent = completedCount);
    }
    
    // Show loading state initially
    document.getElementById('loadingState')?.classList.remove('hidden');
    document.getElementById('emptyState')?.classList.add('hidden');

    // Note: Service request display is now handled by requests.js
    console.log('? Technician page initialization complete. Service requests handled by requests.js');

    // Use verifyRole from auth.js to ensure only technicians can access
	if (typeof verifyRole === 'function') {
		verifyRole(['technician']); // Will redirect if not technician
	}
	
	// Note: Service requests are now handled by requests.js in the requests tab
	// This avoids duplication between technician.js and requests.js
	console.log('? Technician authentication verified. Service requests will be loaded by requests.js tab.');
    
    // Function to view service request with glassmorphism design
    window.viewServiceRequest = function(requestId) {
    console.log('View service request:', requestId);
        
        // Beautiful glassmorphism modal with Maya vibes - FULLSCREEN
        const modalHtml = `
        <div id="serviceRequestModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md w-screen h-screen">
            <div class="glass-modal w-full h-full rounded-none overflow-hidden flex flex-col">
                <!-- Glass Modal Header -->
                <div class="glass-modal-header">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="glass-modal-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <h3 class="glass-modal-title">Service Request</h3>
                        </div>
                        <button id="closeModal" class="glass-close-button">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Glass Modal Content -->
                <div id="modalContent" class="glass-modal-content">
                    <div class="glass-loading-container">
                        <div class="glass-spinner"></div>
                        <p class="glass-loading-text">Loading request...</p>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Add event listeners to close modal
        const modal = document.getElementById('serviceRequestModal');
        const closeButton = document.getElementById('closeModal');
        
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on backdrop click (but not on modal content click)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    // Fetch service request - try multiple endpoints
    const tryFetchRequest = async () => {
            // Try technician-specific endpoint first
            try {
                let response = await fetch(`/api/technician/service-requests/${requestId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    return await response.json();
                }
                console.warn('Technician endpoint failed, trying general endpoint');
            } catch (error) {
                console.warn('Technician endpoint error:', error);
            }
            
            // Fallback to general service requests endpoint
            try {
                let response = await fetch(`/api/service-requests/${requestId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    return await response.json();
                }
                console.warn('General endpoint failed, trying to get from list');
            } catch (error) {
                console.warn('General endpoint error:', error);
            }
            
            // Last resort: get from the list of all requests
            try {
                const response = await fetch('/api/service-requests');
                if (response.ok) {
                    const allRequests = await response.json();
                    const request = allRequests.find(req => req.id == requestId);
                    if (request) {
                        return request;
                    }
                }
            } catch (error) {
                console.error('All endpoints failed:', error);
            }
            
            throw new Error('Failed to fetch request from any endpoint');
        };
        
    tryFetchRequest()
            .then(request => {
                console.log('Service request:', request);
                console.log('institution_user data:', {
                    first_name: request.institution_user_first_name,
                    last_name: request.institution_user_last_name,
                    email: request.institution_user_email
                });
                
                // DEBUG: Alert to verify data
                if (!request.institution_user_first_name && !request.institution_user_last_name) {
                    alert('WARNING: No institution_user data found in API response!');
                } else {
                    alert(`institution_user found: ${request.institution_user_first_name} ${request.institution_user_last_name}`);
                }
                
                const formattedDate = formatDate(request.created_at);
                const statusColor = getStatusColor(request.status);
                // Printer request block
                let printerRequestHtml = '';
                if (request.printer_id || request.printer_name || request.brand || request.model) {
                    printerRequestHtml = `
                        <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 mb-2">
                            <div class="font-semibold text-slate-700 mb-2 flex items-center gap-2"><svg class='w-4 h-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'></path></svg>Printer/Equipment</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div><span class="text-slate-500">Name:</span> <span class="font-medium text-slate-800">${request.printer_name || 'N/A'}</span></div>
                                <div><span class="text-slate-500">Brand:</span> <span class="font-medium text-slate-800">${request.brand || 'N/A'}</span></div>
                                <div><span class="text-slate-500">Model:</span> <span class="font-medium text-slate-800">${request.model || 'N/A'}</span></div>
                                <div><span class="text-slate-500">Serial:</span> <span class="font-medium text-slate-800">${request.serial_number || 'N/A'}</span></div>
                            </div>
                        </div>
                    `;
                }
                // Beautiful glassmorphism content layout
                document.getElementById('modalContent').innerHTML = `
                    <div class="glass-detail-container">
                        <!-- Header Section -->
                        <div class="glass-detail-header">
                            <div class="glass-request-badge">
                                <span class="request-number">${request.request_number || '#' + request.id}</span>
                                <div class="glass-status-indicator status-${request.status || 'new'}">
                                    <div class="status-pulse indicator-${statusColor.indicator.replace('bg-', '').replace('-400', '').replace('-500', '').replace('-600', '')}"></div>
                                    <span>${capitalizeFirstLetter(request.status)}</span>
                                </div>
                            </div>
                            <div class="glass-date-info">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>${formattedDate.date} at ${formattedDate.time}</span>
                            </div>
                        </div>

                        <!-- Main Content Grid -->
                        <div class="glass-detail-grid">
                            <!-- Issue Description Card -->
                            <div class="glass-info-card issue-card">
                                <div class="glass-card-icon issue-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                </div>
                                <div class="glass-card-content">
                                    <h4 class="glass-card-title">Issue Description</h4>
                                    <p class="glass-card-text">${request.issue || request.description || 'No description provided.'}</p>
                                </div>
                            </div>

                            <!-- Location Card -->
                            <div class="glass-info-card location-card">
                                <div class="glass-card-icon location-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                                    </svg>
                                </div>
                                <div class="glass-card-content">
                                    <h4 class="glass-card-title">Location Request</h4>
                                    <div class="glass-detail-rows">
                                        <div class="detail-row">
                                            <span class="detail-label">Institution:</span>
                                            <span class="detail-value">${request.institution_name || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Location:</span>
                                            <span class="detail-value">${request.location || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Priority:</span>
                                            <span class="detail-value priority-${request.priority || 'medium'}">${capitalizeFirstLetter(request.priority || 'medium')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- institution_user Information Card - DEBUG: Always show -->
                            <div class="glass-info-card requester-card">
                                <div class="glass-card-icon requester-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <div class="glass-card-content">
                                    <h4 class="glass-card-title">Requested By</h4>
                                    <div class="glass-detail-rows">
                                        <div class="detail-row">
                                            <span class="detail-label">Name:</span>
                                            <span class="detail-value">${[request.institution_user_first_name, request.institution_user_last_name].filter(Boolean).join(' ') || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Email:</span>
                                            <span class="detail-value">${request.institution_user_email || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">DEBUG first_name:</span>
                                            <span class="detail-value">${request.institution_user_first_name || 'undefined'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">DEBUG last_name:</span>
                                            <span class="detail-value">${request.institution_user_last_name || 'undefined'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${(request.printer_id || request.printer_name || request.brand || request.model) ? `
                            <!-- Printer Request Card -->
                            <div class="glass-info-card printer-card">
                                <div class="glass-card-icon printer-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                                    </svg>
                                </div>
                                <div class="glass-card-content">
                                    <h4 class="glass-card-title">Equipment Request</h4>
                                    <div class="glass-detail-rows">
                                        <div class="detail-row">
                                            <span class="detail-label">Name:</span>
                                            <span class="detail-value">${request.printer_name || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Brand:</span>
                                            <span class="detail-value">${request.brand || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Model:</span>
                                            <span class="detail-value">${request.model || 'N/A'}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">Serial:</span>
                                            <span class="detail-value">${request.serial_number || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            })
            .catch(error => {
                console.error('Error fetching service request:', error);
                
                const modalContent = document.getElementById('modalContent');
                if (modalContent) {
                    modalContent.innerHTML = `
                        <div class="glass-error-container">
                            <div class="glass-error-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>
                            <h3 class="glass-error-title">Unable to Load Request</h3>
                            <p class="glass-error-message">There was a problem loading the service request. This might be due to network issues or the request no longer exists.</p>
                            <div class="glass-error-actions">
                                <button id="retryBtn" class="glass-action-primary">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                    </svg>
                                    <span>Try Again</span>
                                </button>
                                <button id="closeErrorBtn" class="glass-action-secondary">
                                    <span>Close</span>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('retryBtn')?.addEventListener('click', () => {
                        // Show loading again
                        modalContent.innerHTML = `
                            <div class="flex justify-center items-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
                            </div>
                        `;
                        // Retry the request
                        setTimeout(() => window.viewServiceRequest(requestId), 100);
                    });
                    
                    document.getElementById('closeErrorBtn')?.addEventListener('click', () => {
                        const modal = document.getElementById('serviceRequestModal');
                        if (modal) modal.remove();
                    });
                }
            });
    };
    
    // Debug helper to fetch and display inventory request for a specific request
    window.debugInventoryItem = function(inventoryItemId) {
        console.log(`Manually debugging inventory item ${inventoryItemId}`);
        
        fetch(`/api/inventory-items/${inventoryItemId}`)
            .then(response => {
                console.log('Inventory item debug - API response status:', response.status);
                if (!response.ok) {
                    console.error(`API error: ${response.status}`);
                    return response.json().then(err => {
                        console.error('API error request:', err);
                        throw new Error(`API error: ${err.error || 'Unknown error'}`);
                    });
                }
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.warn('Response is not JSON:', contentType);
                    throw new Error('Server returned HTML instead of JSON data');
                }
                
                return response.json();
            })
            .then(data => {
                console.log(`%c==== INVENTORY ITEM #${inventoryItemId} REQUEST ====`, 'color: green; font-weight: bold;');
                console.log('Name:', data.name || 'Not specified');
                console.log('Brand:', data.brand || 'Not specified');
                console.log('Model:', data.model || 'Not specified');
                console.log('Serial Number:', data.serial_number || 'Not specified');
                console.log('Category:', data.category || 'Not specified');
                console.log('Status:', data.status || 'Not specified');
                console.log('Location:', data.location || 'Not specified');
                console.log('Full data:', data);
                console.log(`%c======================================`, 'color: green; font-weight: bold;');
                
                // Return for chaining
                return data;
            })
            .catch(err => {
                console.error('Error during inventory item debug:', err);
            });
    };
    // Debug helper to fetch and show service request with inventory details
    window.debugServiceRequestWithInventory = function(requestId) {
        console.log(`Debugging service request ${requestId} with inventory details`);
        
        fetch(`/api/technician/service-requests/${requestId}`)
            .then(response => {
                if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
                return response.json();
            })
            .then(request => {
                console.log(`%c==== SERVICE REQUEST #${requestId} ====`, 'color: blue; font-weight: bold;');
                console.log('Request Data:', request);
                console.log('printer_id:', request.printer_id);
                
                if (request.printer_id) {
                    return window.debugInventoryItem(request.printer_id)
                        .then(inventoryData => {
                            console.log(`%c==== COMBINED DATA ====`, 'color: purple; font-weight: bold;');
                            console.log('Service Request + Inventory:', {
                                ...request,
                                inventory: inventoryData
                            });
                        });
                }
                
                console.log('No printer_id found for this request');
                return request;
            })
            .catch(err => {
                console.error('Error during service request debug:', err);
            });
    };
    
    // Function to toggle card details expansion
    window.toggleCardDetails = function(button, requestId) {
        const detailsSection = document.getElementById(`card-details-${requestId}`);
        const icon = button.querySelector('svg');
        const text = button.querySelector('span');
        
        // Add touch feedback for mobile
        if (window.ResponsiveUtils && window.ResponsiveUtils.isMobile()) {
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }
        
        if (detailsSection.classList.contains('hidden')) {
            // Expand
            detailsSection.classList.remove('hidden');
            detailsSection.style.maxHeight = detailsSection.scrollHeight + 'px';
            icon.style.transform = 'rotate(180deg)';
            
            // Update text based on screen size
            if (window.ResponsiveUtils && window.ResponsiveUtils.isMobile()) {
                text.textContent = text.classList.contains('xs:hidden') ? 'Less' : 'Less Details';
            } else {
                text.textContent = 'Less Details';
            }
            
            // Add smooth animation
            setTimeout(() => {
                detailsSection.style.transition = 'max-height 0.3s ease-in-out';
            }, 10);
        } else {
            // Collapse
            detailsSection.style.maxHeight = '0px';
            icon.style.transform = 'rotate(0deg)';
            
            // Update text based on screen size
            if (window.ResponsiveUtils && window.ResponsiveUtils.isMobile()) {
                text.textContent = text.classList.contains('xs:hidden') ? 'Details' : 'More Details';
            } else {
                text.textContent = 'More Details';
            }
            
            // Hide after animation
            setTimeout(() => {
                detailsSection.classList.add('hidden');
                detailsSection.style.maxHeight = '';
                detailsSection.style.transition = '';
            }, 300);
        }
    };
    
    // Function for quick status updates
    window.quickStatusUpdate = function(requestId, newStatus) {
        // Add visual feedback
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        const isMobile = window.ResponsiveUtils && window.ResponsiveUtils.isMobile();
        
        // Add tactile feedback for mobile
        if (isMobile) {
            button.style.transform = 'scale(0.95)';
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }
        
        // Disable button to prevent multiple clicks
        button.disabled = true;
        button.style.pointerEvents = 'none';
        
        button.innerHTML = `
            <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span class="hidden xs:inline">Updating...</span>
            <span class="xs:hidden">...</span>
        `;
        
        // Simulate API call (replace with actual implementation)
        setTimeout(() => {
            button.innerHTML = `
                <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="hidden xs:inline">Updated!</span>
                <span class="xs:hidden">?</span>
            `;
            button.className = button.className.replace('text-green-600 bg-green-50 hover:bg-green-100 border-green-200', 'text-green-700 bg-green-100 border-green-300');
            
            // Success haptic feedback for mobile
            if (isMobile && navigator.vibrate) {
                navigator.vibrate([50, 100, 50]);
            }
            
            // Reset after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.className = button.className.replace('text-green-700 bg-green-100 border-green-300', 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200');
                button.disabled = false;
                button.style.pointerEvents = '';
            }, 2000);
        }, 1000);
        
        console.log(`Quick status update for request ${requestId} to ${newStatus}`);
        // TODO: Implement actual API call here
    };
    
    // Responsive utilities
    function initializeResponsiveUtilities() {
        // Breakpoint detection utility
        window.ResponsiveUtils = {
            // Define breakpoints (matching Tailwind CSS breakpoints)
            breakpoints: {
                xs: 375,
                sm: 640,
                md: 768,
                lg: 1024,
                xl: 1280,
                '2xl': 1536
            },
            
            // Get current breakpoint
            getCurrentBreakpoint: function() {
                const width = window.innerWidth;
                if (width >= this.breakpoints['2xl']) return '2xl';
                if (width >= this.breakpoints.xl) return 'xl';
                if (width >= this.breakpoints.lg) return 'lg';
                if (width >= this.breakpoints.md) return 'md';
                if (width >= this.breakpoints.sm) return 'sm';
                if (width >= this.breakpoints.xs) return 'xs';
                return 'base';
            },
            
            // Check if current screen size matches or is larger than specified breakpoint
            isBreakpoint: function(breakpoint) {
                const currentWidth = window.innerWidth;
                const targetWidth = this.breakpoints[breakpoint] || 0;
                return currentWidth >= targetWidth;
            },
            
            // Check if current screen is mobile (below md breakpoint)
            isMobile: function() {
                return !this.isBreakpoint('md');
            },
            
            // Check if current screen is tablet (md to lg)
            isTablet: function() {
                return this.isBreakpoint('md') && !this.isBreakpoint('lg');
            },
            
            // Check if current screen is desktop (lg and above)
            isDesktop: function() {
                return this.isBreakpoint('lg');
            },
            
            // Optimize card display based on screen size
            optimizeCardDisplay: function() {
                const cards = document.querySelectorAll('.card-hover-effect');
                const isMobile = this.isMobile();
                
                cards.forEach(card => {
                    if (isMobile) {
                        // Mobile optimizations
                        card.classList.add('touch-optimization');
                        card.style.transform = '';
                        card.addEventListener('touchstart', this.handleTouchStart, { passive: true });
                        card.addEventListener('touchend', this.handleTouchEnd, { passive: true });
                    } else {
                        // Desktop optimizations
                        card.classList.remove('touch-optimization');
                        card.removeEventListener('touchstart', this.handleTouchStart);
                        card.removeEventListener('touchend', this.handleTouchEnd);
                    }
                });
            },
            
            // Handle touch feedback for mobile
            handleTouchStart: function(e) {
                this.style.transform = 'scale(0.98)';
                this.style.transition = 'transform 0.1s ease-out';
            },
            
            handleTouchEnd: function(e) {
                setTimeout(() => {
                    this.style.transform = '';
                    this.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                }, 100);
            },
            
            // Optimize table display for different screen sizes
            optimizeTableDisplay: function() {
                const desktopTable = document.querySelector('#serviceRequestsTableDesktop');
                if (!desktopTable) return;
                
                const tableContainer = desktopTable.closest('.overflow-x-auto');
                if (!tableContainer) return;
                
                if (this.isBreakpoint('xl')) {
                    // Large screens - show all columns normally
                    tableContainer.style.overflowX = 'visible';
                } else if (this.isBreakpoint('lg')) {
                    // Medium-large screens - allow horizontal scroll if needed
                    tableContainer.style.overflowX = 'auto';
                } else {
                    // Hide table on smaller screens (handled by CSS md:hidden)
                    tableContainer.style.overflowX = 'auto';
                }
            },
            
            // Debounced resize handler
            handleResize: debounce(function() {
                console.log('Screen resized to:', window.ResponsiveUtils.getCurrentBreakpoint());
                window.ResponsiveUtils.optimizeCardDisplay();
                window.ResponsiveUtils.optimizeTableDisplay();
                window.ResponsiveUtils.updateViewportClasses();
            }, 250),
            
            // Update CSS classes based on viewport
            updateViewportClasses: function() {
                const body = document.body;
                const breakpoint = this.getCurrentBreakpoint();
                
                // Remove all breakpoint classes
                body.classList.remove('viewport-xs', 'viewport-sm', 'viewport-md', 'viewport-lg', 'viewport-xl', 'viewport-2xl');
                
                // Add current breakpoint class
                body.classList.add(`viewport-${breakpoint}`);
                
                // Add device type classes
                body.classList.toggle('is-mobile', this.isMobile());
                body.classList.toggle('is-tablet', this.isTablet());
                body.classList.toggle('is-desktop', this.isDesktop());
            }
        };
        
        // Initialize responsive features
        window.ResponsiveUtils.updateViewportClasses();
        window.ResponsiveUtils.optimizeCardDisplay();
        window.ResponsiveUtils.optimizeTableDisplay();
        
        // Listen for resize events
        window.addEventListener('resize', window.ResponsiveUtils.handleResize);
        
        // Listen for orientation changes on mobile
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                window.ResponsiveUtils.handleResize();
            }, 100);
        });
    }
    
    // Initialize settings page
    function initializeSettings() {
        // Display user email in settings
        const userEmailElement = document.getElementById('user-email');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (userEmailElement && userData.email) {
            userEmailElement.textContent = userData.email;
        }
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                (async () => {
                    const confirmed = (typeof window.showLogoutConfirm === 'function')
                        ? await window.showLogoutConfirm()
                        : confirm('Are you sure you want to logout?');

                    if (!confirmed) return;

                    // Call the logout function from auth.js
                    if (typeof logout === 'function') {
                        logout();
                    } else {
                        // Fallback logout if auth.js logout function not available
                        localStorage.removeItem('user');
                        localStorage.removeItem('isLoggedIn');
                        localStorage.removeItem('token');
                        window.location.href = '/pages/login.html';
                    }
                })();
            });
        }
    }
    
    // Call settings initialization
    initializeSettings();
    
    // Debounce utility function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});









