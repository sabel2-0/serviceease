/**
 * Coordinator Sidenav Loader
 * 
 * This file handles the loading of the coordinator sidenav component.
 */

document.addEventListener('DOMContentLoaded', function() {
    loadSidenav();
    setupNotifications();
    
    // Add dropdown styles to the head
    const dropdownStyles = document.createElement('style');
    dropdownStyles.textContent = `
        .dropdown-toggle .fa-chevron-down {
            transition: transform 0.3s ease;
        }
        .dropdown-menu {
            overflow: hidden;
            max-height: 0;
            transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
            opacity: 0;
        }
        .dropdown-menu:not(.hidden) {
            max-height: 500px;
            opacity: 1;
            transition: max-height 0.5s ease-in, opacity 0.3s ease-in;
        }
        .sidenav-item.active {
            background-color: rgba(31, 41, 55, var(--tw-bg-opacity));
            color: white;
            border-left: 3px solid #3b82f6;
            padding-left: calc(1rem - 3px);
        }
    `;
    document.head.appendChild(dropdownStyles);
});

/**
 * Load the coordinator sidenav component
 */
async function loadSidenav() {
    try {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) {
            console.error('Sidebar container not found');
            return;
        }
        
        // Define all possible paths to try for the sidenav component - prioritize components directory
        const paths = [
            '../../components/coordinator-sidenav.html', // Components directory (CORRECT PATH)
            '../components/coordinator-sidenav.html', // Relative components directory
            '/components/coordinator-sidenav.html', // Root components
            '/src/components/coordinator-sidenav.html', // Root src/components
            '/client/src/components/coordinator-sidenav.html', // Absolute path
            '../../src/components/coordinator-sidenav.html', // From js directory up to src/components
            'coordinator-sidenav.html', // Same directory - LOWER PRIORITY
            '../coordinator/coordinator-sidenav.html', // From a pages subdirectory - LOWER PRIORITY
            '../../pages/coordinator/coordinator-sidenav.html', // From src/js to pages/coordinator - LOWER PRIORITY
            '/client/src/pages/coordinator/coordinator-sidenav.html' // Absolute path to pages - LOWER PRIORITY
        ];
        
        let response = null;
        let html = null;
        let loadedPath = '';
        
        // Try each path until one works
        for (const path of paths) {
            try {
                console.log(`Attempting to load sidenav from: ${path}`);
                const pathResponse = await fetch(path);
                if (pathResponse.ok) {
                    response = pathResponse;
                    loadedPath = path;
                    html = await pathResponse.text();
                    console.log(`Successfully loaded sidenav from: ${path}`);
                    break;
                }
            } catch (e) {
                console.warn(`Failed to load from ${path}:`, e.message);
            }
        }
        
        // If we didn't find a working path
        if (!html) {
            throw new Error('Could not load sidenav component from any path');
        }
        
        // Create a temporary container to hold the HTML
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        
        // Get the sidenav component - be more flexible with what we accept
        const sidenavContent = tempContainer.firstChild || tempContainer.querySelector('.coordinator-sidenav') || tempContainer;
        
        // Clear the container before appending
        sidebarContainer.innerHTML = '';
        
        // Add the sidenav to the container
        if (sidenavContent.nodeType === Node.ELEMENT_NODE) {
            sidebarContainer.appendChild(sidenavContent.cloneNode(true));
        } else {
            // Fallback if we didn't get a proper element
            sidebarContainer.innerHTML = html;
        }
        
        // Execute the scripts in the sidenav
        const scripts = tempContainer.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            if (script.innerHTML) {
                newScript.innerHTML = script.innerHTML;
            }
            
            document.body.appendChild(newScript);
        });
        
        // Initialize sidenav functionality
        initSidenav();
        
        return true;
        
    } catch (error) {
        console.error('Error loading sidenav:', error);
        
        // Log more detailed information to help with debugging
        console.error('Navigator information:', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor
        });
        
        console.error('Current location:', window.location.href);
        
        // Last attempt - try loading directly from components directory
        try {
            console.log('Attempting direct load from components directory...');
            const directLoad = await fetch('/client/src/components/coordinator-sidenav.html');
            if (directLoad.ok) {
                const html = await directLoad.text();
                const sidebarContainer = document.getElementById('sidebar-container');
                sidebarContainer.innerHTML = html;
                console.log('Successfully loaded sidenav from components directory');
                initSidenav();
                return true;
            }
        } catch (e) {
            console.error('Final attempt to load sidenav failed:', e);
        }
        
        // Fallback: Create a simple sidenav directly
        createFallbackSidenav();
        
        // Show error notification to the user
        if (typeof showNotification === 'function') {
            showNotification('Navigation Error', 'There was a problem loading the navigation menu. Using simplified menu instead.', 'error');
        }
        
        return false;
    }
}

/**
 * Initialize sidenav functionality
 */
function initSidenav() {
    // Get the current user data
    const user = JSON.parse(localStorage.getItem('user')) || { 
        firstName: 'Coordinator',
        lastName: 'User'
    };
    
    // Update notification badges with real data
    updateNotificationCounts();
    
    // Initialize dropdown functionality
    initializeDropdowns();
    
    // Handle page navigation
    document.querySelectorAll('.sidenav-item').forEach(item => {
        if (item.getAttribute('href')) {
            item.addEventListener('click', function(e) {
                if (this.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    
                    // Get the page ID from the href
                    const pageId = this.getAttribute('href').substring(1);
                    
                    // Show the corresponding page
                    showPage(pageId);
                }
            });
        }
    });
}

/**
 * Initialize dropdown functionality
 */
function initializeDropdowns() {
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle dropdown visibility
            const dropdownMenu = this.nextElementSibling;
            const chevron = this.querySelector('.fa-chevron-down');
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== dropdownMenu && !menu.classList.contains('hidden')) {
                    menu.classList.add('hidden');
                    const otherChevron = menu.previousElementSibling.querySelector('.fa-chevron-down');
                    if (otherChevron) {
                        otherChevron.style.transform = '';
                    }
                }
            });
            
            // Toggle this dropdown
            dropdownMenu.classList.toggle('hidden');
            
            // Rotate chevron icon
            if (chevron) {
                chevron.style.transform = dropdownMenu.classList.contains('hidden') ? '' : 'rotate(180deg)';
            }
        });
    });
    
    // Clicking outside closes all dropdowns
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
                const chevron = menu.previousElementSibling.querySelector('.fa-chevron-down');
                if (chevron) {
                    chevron.style.transform = '';
                }
            });
        }
    });
}

/**
 * Create a fallback sidenav if loading fails
 */
function createFallbackSidenav() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;
    
    // Check if there's already content in the sidebar container
    if (sidebarContainer.children.length > 0) {
        console.log('Sidebar already has content, using existing fallback');
        return;
    }
    
    console.log('Creating fallback sidenav');
    
    sidebarContainer.innerHTML = `
        <div class="h-full bg-gray-900 w-64 min-h-screen shadow-lg p-4">
            <div class="px-4 py-6 border-b border-gray-800">
                <h1 class="text-lg font-bold text-white">ServiceEase</h1>
                <p class="text-xs text-gray-400">Coordinator Portal</p>
            </div>
            
            <nav class="mt-6">
                <a href="#" class="sidenav-item block px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">
                    <i class="fas fa-tachometer-alt mr-2"></i> Dashboard
                </a>
                
                <!-- Service Management Dropdown -->
                <div class="nav-dropdown mb-2">
                    <button class="sidenav-item dropdown-toggle flex items-center justify-between w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-clipboard-list mr-2"></i> Service Management
                        </div>
                        <i class="fas fa-chevron-down text-xs transition-transform"></i>
                    </button>
                    <div class="dropdown-menu pl-7 mt-1 hidden">
                        <a href="#new-service-request" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">New Service Request</a>
                        <a href="#service-requests" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Active Requests</a>
                        <a href="#service-approvals" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Request Approvals</a>
                    </div>
                </div>
                
                <!-- Printer Management Dropdown -->
                <div class="nav-dropdown mb-2">
                    <button class="sidenav-item dropdown-toggle flex items-center justify-between w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-print mr-2"></i> Printer Management
                        </div>
                        <i class="fas fa-chevron-down text-xs transition-transform"></i>
                    </button>
                    <div class="dropdown-menu pl-7 mt-1 hidden">
                        <a href="#printer-management" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">View All Printers</a>
                        <a href="#add-printer" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Add Printer</a>
                        <a href="#printer-groups" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Manage Printer Groups</a>
                        <a href="#maintenance-schedules" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Maintenance Schedules</a>
                    </div>
                </div>
                
                <!-- User Management Dropdown -->
                <div class="nav-dropdown mb-2">
                    <button class="sidenav-item dropdown-toggle flex items-center justify-between w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-users mr-2"></i> User Management
                        </div>
                        <i class="fas fa-chevron-down text-xs transition-transform"></i>
                    </button>
                    <div class="dropdown-menu pl-7 mt-1 hidden">
                        <a href="#user-management" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">User Accounts</a>
                        <a href="#add-user" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Add New User</a>
                        <a href="#user-permissions" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">User Permissions</a>
                        <a href="#printer-assignments" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Printer Assignments</a>
                    </div>
                </div>
                
                <!-- Technician Assignment Dropdown -->
                <div class="nav-dropdown mb-2">
                    <button class="sidenav-item dropdown-toggle flex items-center justify-between w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-user-cog mr-2"></i> Technician Assignment
                        </div>
                        <i class="fas fa-chevron-down text-xs transition-transform"></i>
                    </button>
                    <div class="dropdown-menu pl-7 mt-1 hidden">
                        <a href="#technician-assignments" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">View Assignments</a>
                        <a href="#request-technician" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Request Technician</a>
                        <a href="#tech-schedule" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Technician Schedule</a>
                        <a href="#tech-performance" class="sidenav-item block px-4 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">Technician Performance</a>
                    </div>
                </div>
                
                <a href="#reports" class="sidenav-item block px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">
                    <i class="fas fa-chart-bar mr-2"></i> Reports
                </a>
                
                <a href="#notifications" class="sidenav-item block px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors mb-1">
                    <i class="fas fa-bell mr-2"></i> Notifications
                    <span class="notification-badge ml-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">0</span>
                </a>
            </nav>
            
            <div class="mt-8 border-t border-gray-800 pt-4">
                <button id="logout-fallback-btn" class="block w-full text-left px-4 py-3 text-red-400 rounded-lg hover:bg-gray-800 hover:text-red-300 transition-colors mb-1">
                    <i class="fas fa-sign-out-alt mr-2"></i> Logout
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to the logout button
    const logoutBtn = document.getElementById('logout-fallback-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear all user data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            
            // Determine the correct redirect path based on current location
            const currentPath = window.location.pathname;
            let loginRedirect = '/pages/login.html';
            
            // Check if we're in a subdirectory
            if (currentPath.includes('/pages/admin/') || 
                currentPath.includes('/pages/operations-officer/') ||
                currentPath.includes('/pages/coordinator/') ||
                currentPath.includes('/pages/technician/')) {
                loginRedirect = '../../pages/login.html';
            } else if (currentPath.includes('/pages/')) {
                loginRedirect = '../pages/login.html';
            }
            
            window.location.href = loginRedirect;
        });
    }
    
    // Add event listeners to navigation links
    sidebarContainer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const pageId = this.getAttribute('href').substring(1);
                if (typeof showPage === 'function') {
                    showPage(pageId);
                }
            }
        });
    });
    
    // Initialize dropdown functionality in the fallback sidenav
    initializeDropdowns();
}

/**
 * Setup real-time notifications
 */
function setupNotifications() {
    // Notifications should be loaded from the server or real-time channel.
    // Removed dummy simulation. Trigger a single counts update (no-op by default).
    try {
        updateNotificationCounts();
    } catch (e) {
        // ignore
    }
}

/**
 * Update notification counts
 */
function updateNotificationCounts() {
    // Intentionally left blank: notification counts should come from server-side API or real-time events.
    // Implement a small safe fallback to hide header badge if present.
    try {
        const headerBadge = document.querySelector('#notifications-button .notification-badge');
        if (headerBadge) {
            headerBadge.classList.add('hidden');
        }
    } catch (e) {
        // ignore
    }
}

/**
 * Show the specified page
 * @param {string} pageId - ID of the page to show
 */
function showPage(pageId) {
    // Show the page container
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;
    
    pageContainer.classList.remove('hidden');
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show the specified page
    const targetPageId = `${pageId}-page`;
    const targetPage = document.getElementById(targetPageId);
    
    if (targetPage) {
        targetPage.classList.remove('hidden');
        
        // Update URL hash
        window.location.hash = `#${pageId}`;
        
        // Scroll to top
        window.scrollTo(0, 0);
    } else {
        // If we're showing special pages like account settings or notifications
        handleSpecialPages(pageId);
    }
}

/**
 * Handle special pages that don't follow the standard naming pattern
 * @param {string} pageId - ID of the special page
 */
function handleSpecialPages(pageId) {
    switch(pageId) {
        case 'account-settings':
            // Show account settings modal or navigate to account settings page
            showNotification('Account Settings', 'Account settings functionality is not implemented yet.', 'info');
            break;
            
        case 'notifications-settings':
            // Show the notification center
            const notificationCenter = document.getElementById('notification-center');
            if (notificationCenter) {
                notificationCenter.classList.remove('translate-x-full');
                notificationCenter.classList.add('translate-x-0');
            }
            break;
            
        case 'help':
            // Show help modal or navigate to help page
            showNotification('Help & Support', 'Help and support functionality is not implemented yet.', 'info');
            break;
            
        case 'new-service-request':
            // Show new service request modal
            const newRequestModal = document.getElementById('newRequestModal');
            if (newRequestModal) {
                newRequestModal.classList.remove('hidden');
            }
            break;
            
        case 'technician-assignments':
            // If technician assignments page doesn't exist, create a simple one
            createTechnicianAssignmentsPage();
            break;
            
        default:
            // Show the dashboard as fallback
            const dashboardPage = document.getElementById('page-container');
            dashboardPage.classList.add('hidden'); // Hide the page container to show the dashboard
            window.location.hash = ''; // Clear the hash
    }
}

/**
 * Create a technician assignments page if it doesn't exist
 */
function createTechnicianAssignmentsPage() {
    // Check if the page already exists
    if (document.getElementById('technician-assignments-page')) {
        document.getElementById('technician-assignments-page').classList.remove('hidden');
        return;
    }
    
    // Create the page
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;
    
    const techPage = document.createElement('div');
    techPage.id = 'technician-assignments-page';
    techPage.className = 'page-content';
    techPage.innerHTML = `
        <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b">
                <h2 class="text-lg font-semibold text-gray-800">Technician Assignments</h2>
            </div>
            <div class="p-6">
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-info-circle text-blue-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-blue-700">
                                Technicians are assigned by administrators. This view allows you to see which technicians are assigned to your institution's printers.
                            </p>
                        </div>
                    </div>
                </div>
                
                <h3 class="text-md font-medium text-gray-700 mb-4">Assigned Technicians</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
                                <i class="fas fa-user-cog text-xl"></i>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">John Smith</h4>
                                <p class="text-sm text-gray-600">Primary Technician</p>
                                <div class="flex items-center mt-1">
                                    <i class="fas fa-phone text-xs text-gray-500 mr-1"></i>
                                    <span class="text-xs text-gray-500">555-123-4567</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-4">
                                <i class="fas fa-user-cog text-xl"></i>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">Maria Rodriguez</h4>
                                <p class="text-sm text-gray-600">Backup Technician</p>
                                <div class="flex items-center mt-1">
                                    <i class="fas fa-phone text-xs text-gray-500 mr-1"></i>
                                    <span class="text-xs text-gray-500">555-987-6543</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h3 class="text-md font-medium text-gray-700 mb-4">Printer Assignments</h3>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase">Printer ID</th>
                                <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase">Assigned Technician</th>
                                <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase">Last Service</th>
                            </tr>
                        </thead>
                        <tbody>
                                        <tr>
                                            <td colspan="5" class="py-6 px-4 text-center text-gray-500">
                                                No technician assignments available.
                                            </td>
                                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    pageContainer.appendChild(techPage);
    techPage.classList.remove('hidden');
}

/**
 * Show a notification toast
 * @param {string} title - Title of the notification
 * @param {string} message - Notification message
 * @param {string} type - Type of notification ('info', 'success', 'error')
 */
function showNotification(title, message, type = 'info') {
    // If there's already a global showNotification function, use that
    if (window.showNotification && window.showNotification !== showNotification) {
        window.showNotification(title, message, type);
        return;
    }
    
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-100 border-green-500' : 
                   type === 'error' ? 'bg-red-100 border-red-500' : 
                   'bg-blue-100 border-blue-500';
    const textColor = type === 'success' ? 'text-green-700' : 
                     type === 'error' ? 'text-red-700' : 
                     'text-blue-700';
    const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 
               'fa-info-circle';
    
    toast.className = `fixed bottom-4 right-4 ${bgColor} border-l-4 p-4 rounded shadow-lg max-w-md z-50`;
    toast.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <i class="fas ${icon} ${textColor}"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium ${textColor}">${title}</p>
                <p class="text-sm ${textColor} opacity-90">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 ${textColor}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 5000);
}

// Make functions available globally
window.showPage = showPage;
window.updateNotificationCounts = updateNotificationCounts;
window.showNotification = showNotification;
