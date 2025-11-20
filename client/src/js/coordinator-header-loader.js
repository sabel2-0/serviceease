/**
 * Coordinator Header Loader
 * Automatically loads and initializes the unified header component for coordinator pages
 */

(function() {
    'use strict';
    
    /**
     * Load coordinator profile data from API
     */
    async function loadCoordinatorProfile() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No authentication token found');
                // Try fallback
                useFallbackData();
                return;
            }

            console.log('Fetching coordinator profile from /api/coordinator/profile');
            const response = await fetch('/api/coordinator/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch coordinator profile:', response.status, response.statusText);
                throw new Error('Failed to fetch coordinator profile');
            }

            const data = await response.json();
            console.log('Coordinator profile data:', data);
            
            // Update institution name
            const institutionNameEl = document.getElementById('header-institution-name');
            if (institutionNameEl && data.institution_name) {
                institutionNameEl.textContent = data.institution_name;
            }
            
            // Update coordinator name
            const coordinatorNameEl = document.getElementById('header-coordinator-name');
            if (coordinatorNameEl && data.first_name && data.last_name) {
                coordinatorNameEl.textContent = `${data.first_name} ${data.last_name}`;
            }
            
        } catch (error) {
            console.error('Error loading coordinator profile:', error);
            useFallbackData();
        }
    }
    
    /**
     * Use fallback data from localStorage
     */
    function useFallbackData() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('Using fallback localStorage data:', user);
        
        if (user.institutionName) {
            const institutionNameEl = document.getElementById('header-institution-name');
            if (institutionNameEl) institutionNameEl.textContent = user.institutionName;
        }
        
        if (user.firstName && user.lastName) {
            const coordinatorNameEl = document.getElementById('header-coordinator-name');
            if (coordinatorNameEl) coordinatorNameEl.textContent = `${user.firstName} ${user.lastName}`;
        }
    }
    
    /**
     * Load notification count
     */
    async function loadNotificationCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/notifications/count', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const badge = document.getElementById('header-notification-badge');
                if (badge && data.count > 0) {
                    badge.textContent = data.count;
                    badge.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error loading notification count:', error);
        }
    }
    
    /**
     * Initialize header interactions
     */
    function initHeaderInteractions() {
        // Notifications button handler
        const notifBtn = document.getElementById('header-notifications-button');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                const notificationCenter = document.getElementById('notification-center');
                if (notificationCenter) {
                    notificationCenter.classList.toggle('translate-x-full');
                    notificationCenter.classList.toggle('translate-x-0');
                }
            });
        }
        
        // Refresh notification count periodically
        setInterval(loadNotificationCount, 30000); // Every 30 seconds
    }
    
    /**
     * Load the unified header component
     * @param {Object} options - Configuration options
     * @param {string} options.title - Page title
     * @param {string} options.subtitle - Page subtitle
     */
    async function loadCoordinatorHeader(options = {}) {
        try {
            // Determine the correct path to the components directory
            const paths = [
                '../../components/coordinator-header.html',
                '../components/coordinator-header.html',
                '/components/coordinator-header.html',
                '/client/src/components/coordinator-header.html'
            ];
            
            let response = null;
            let html = null;
            
            // Try each path until one works
            for (const path of paths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        html = await response.text();
                        console.log(`✓ Loaded header from: ${path}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }
            
            if (!html) {
                console.error('Could not load coordinator header from any path');
                return;
            }
            
            // Insert the header into the container
            const container = document.getElementById('coordinator-header-container');
            if (container) {
                container.innerHTML = html;
                
                // Update page-specific content
                if (options.title) {
                    const titleEl = document.getElementById('header-page-title');
                    if (titleEl) titleEl.textContent = options.title;
                }
                
                if (options.subtitle) {
                    const subtitleEl = document.getElementById('header-page-subtitle');
                    if (subtitleEl) subtitleEl.textContent = options.subtitle;
                }
                
                console.log('✓ Coordinator header loaded successfully');
                
                // Now load the profile data and initialize interactions
                await loadCoordinatorProfile();
                await loadNotificationCount();
                initHeaderInteractions();
                
            } else {
                console.error('Header container element not found');
            }
            
        } catch (error) {
            console.error('Error loading coordinator header:', error);
        }
    }
    
    // Make the function globally available
    window.loadCoordinatorHeader = loadCoordinatorHeader;
    
    // Auto-load if data-auto-load attribute is present on script tag
    const currentScript = document.currentScript;
    if (currentScript && currentScript.dataset.autoLoad === 'true') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                loadCoordinatorHeader({
                    title: currentScript.dataset.title || 'Dashboard',
                    subtitle: currentScript.dataset.subtitle || ''
                });
            });
        } else {
            loadCoordinatorHeader({
                title: currentScript.dataset.title || 'Dashboard',
                subtitle: currentScript.dataset.subtitle || ''
            });
        }
    }
})();
