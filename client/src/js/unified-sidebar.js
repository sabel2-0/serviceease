/**
 * Unified Sidebar Component
 * This script handles the functionality of the unified sidebar that adapts based on user role
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load the unified sidebar component
    loadUnifiedSidebar();
    
    // Initialize sidebar functionality once loaded
    initSidebar();
});

/**
 * Load the unified sidebar component
 */
function loadUnifiedSidebar() {
    // Support multiple container IDs for backward compatibility
    let sidebarContainer = document.getElementById('sidebar-container');
    
    // Fallback to older IDs if the standard one isn't found
    if (!sidebarContainer) {
        sidebarContainer = document.getElementById('admin-sidebar') || 
                          document.getElementById('operations-officer-sidebar');
    }
    
    if (!sidebarContainer) {
        console.error('Sidebar container element not found. Please add <div id="sidebar-container"></div> to your page.');
        return;
    }
    
    // Determine the correct path for the sidebar component based on current URL
    const path = window.location.pathname;
    // Calculate relative path to components directory
    let sidebarPath = '../../components/unified-sidebar.html'; // Default for pages in subdirectories
    
    // If we're in the root pages directory, adjust path
    if (path.split('/').filter(Boolean).length <= 2) {
        sidebarPath = '../components/unified-sidebar.html';
    }
    
    // Fetch the sidebar HTML
    fetch(sidebarPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load sidebar component');
            }
            return response.text();
        })
        .then(html => {
            sidebarContainer.innerHTML = html;
            
            // Configure the sidebar based on the user's role
            configureForUserRole();
            
            // Set active menu item based on current page
            setActiveMenuItem();
            
            // Initialize dropdown toggles
            initializeDropdowns();
            
            // Setup logout functionality
            setupLogout();
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            sidebarContainer.innerHTML = `
                <div class="p-4 bg-red-100 text-red-700 rounded-lg">
                    <p class="font-bold">Failed to load sidebar component.</p>
                    <p class="text-sm mt-1">Common issues:</p>
                    <ul class="text-sm list-disc pl-5 mt-1">
                        <li>Check if path to unified-sidebar.html is correct</li>
                        <li>Make sure auth.js is loaded before unified-sidebar.js</li>
                        <li>Verify user is properly logged in</li>
                    </ul>
                    <p class="mt-2"><a href="javascript:location.reload()" class="underline">Click here to try again</a></p>
                </div>
            `;
            
            // Don't log out the user when sidebar fails to load
            // Instead, provide a way to retry
        });
}

/**
 * Configure sidebar based on user's role
 */
function configureForUserRole() {
    console.log('Configuring sidebar for user role');
    
    // Check if user is logged in using isLoggedIn from auth.js
    if (!isLoggedIn()) {
        console.error('User not authenticated');
        // Redirect to login if not authenticated
        window.location.href = '/pages/login.html';
        return;
    }
    
    const user = getCurrentUser();
    
    if (!user || !user.role) {
        console.error('User or role information missing');
        // Don't remove authentication data here, let the specific page handle it
        // Just log the error and return
        console.error('Invalid user data in sidebar:', user);
        return;
    }
    
    console.log('Configuring sidebar for role:', user.role);
    
    const role = user.role;
    
    // Update header based on role
    const rolePortal = document.getElementById('role-portal');
    const roleIcon = document.getElementById('role-icon');
    const dashboardLink = document.getElementById('dashboard-link');
    const notificationsLink = document.getElementById('notifications-link');
    const accountLink = document.getElementById('account-link');
    
    if (rolePortal) {
        if (role === 'admin') {
            rolePortal.textContent = 'Admin Portal';
            roleIcon.className = 'w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center';
        } else if (role === 'operations_officer') {
            rolePortal.textContent = 'Operations Portal';
            roleIcon.className = 'w-10 h-10 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center';
        }
    }
    
    // Update dashboard link based on role
    if (dashboardLink) {
        if (role === 'admin') {
            dashboardLink.href = '../../pages/admin/admin.html';
            dashboardLink.setAttribute('data-page', 'admin');
        } else if (role === 'operations_officer') {
            dashboardLink.href = '../../pages/admin/admin.html';
            dashboardLink.setAttribute('data-page', 'operations-officer');
        }
    }
    
    // Update notifications link based on role
    if (notificationsLink) {
        if (role === 'admin') {
            notificationsLink.href = '../../pages/admin/notifications.html';
        } else if (role === 'operations_officer') {
            notificationsLink.href = '../../pages/admin/notifications.html';
        }
    }
    
    // Fix paths for all role-shared pages based on the user's role
    // Get role-specific links
    const walkInServiceLink = document.querySelector('a[data-page="walk-in-service"]');
    const serviceCompletionsLink = document.querySelector('a[data-page="service-completions"]');
    const coordinatorAccountsLink = document.getElementById('coordinator-accounts-link');
    const coordinatorApprovalsLink = document.getElementById('coordinator-approvals-link');
    const clientPrintersLink = document.getElementById('client-printers-link');
    const inventoryItemsLink = document.getElementById('inventory-items-link');
    const inventoryPartsLink = document.getElementById('inventory-parts-link');
    
    // Set correct URLs based on role
    if (walkInServiceLink) {
        walkInServiceLink.href = role === 'admin' 
            ? '../../pages/admin/walk-in-service.html'
            : '../../pages/admin/walk-in-service.html';
    }
    
    if (serviceCompletionsLink) {
        serviceCompletionsLink.href = role === 'admin'
            ? '../../pages/admin/service-completions.html' 
            : '../../pages/admin/service-completions.html';
    }
    
    // Coordinator accounts link
    if (coordinatorAccountsLink) {
        coordinatorAccountsLink.href = role === 'admin'
            ? '../../pages/admin/coordinator-accounts.html'
            : '../../pages/admin/coordinator-accounts.html';
        console.log(`Set coordinator accounts link for ${role} to: ${coordinatorAccountsLink.href}`);
    }
    
    // Coordinator approvals link
    if (coordinatorApprovalsLink) {
        coordinatorApprovalsLink.href = role === 'admin'
            ? '../../pages/admin/coordinator-approvals.html'
            : '../../pages/admin/coordinator-approvals.html';
        console.log(`Set coordinator approvals link for ${role} to: ${coordinatorApprovalsLink.href}`);
    }
    
    // Client printers link
    if (clientPrintersLink) {
        clientPrintersLink.href = role === 'admin'
            ? '../../pages/admin/client-printers.html'
            : '../../pages/admin/client-printers.html';
        console.log(`Set client printers link for ${role} to: ${clientPrintersLink.href}`);
    }
    
    // Inventory items link
    if (inventoryItemsLink) {
        inventoryItemsLink.href = role === 'admin'
            ? '../../pages/admin/inventory-items.html'
            : '../../pages/admin/inventory-items.html';
        console.log(`Set inventory items link for ${role} to: ${inventoryItemsLink.href}`);
    }
    
    // Inventory parts link
    if (inventoryPartsLink) {
        inventoryPartsLink.href = role === 'admin'
            ? '../../pages/admin/inventory-parts.html'
            : '../../pages/admin/inventory-parts.html';
        console.log(`Set inventory parts link for ${role} to: ${inventoryPartsLink.href}`);
    }
    
    // Update account settings link based on role
    if (accountLink) {
        if (role === 'admin') {
            accountLink.href = '../../pages/admin/account-management.html';
        } else if (role === 'operations_officer') {
            accountLink.href = '../../pages/admin/account-settings.html';
        }
    }
    
    // Show/hide elements based on role permissions
    const roleElements = document.querySelectorAll('.role-based, [data-roles]');
    roleElements.forEach(element => {
        const allowedRoles = element.getAttribute('data-roles');
        
        if (allowedRoles) {
            const rolesArray = allowedRoles.split(',').map(r => r.trim());
            
            if (!rolesArray.includes(role)) {
                // Hide elements not accessible to current role
                element.classList.add('hidden');
            }
        }
    });
    
    // Show/hide menu items based on role
    document.querySelectorAll('.role-item').forEach(item => {
        const itemRoles = item.getAttribute('data-roles');
        
        if (itemRoles) {
            const rolesArray = itemRoles.split(',').map(r => r.trim());
            
            if (!rolesArray.includes(role)) {
                // Hide menu items not accessible to current role
                item.classList.add('hidden');
            }
        }
    });
}

/**
 * Initialize sidebar functionality
 */
function initSidebar() {
    // Listen for theme changes or other sidebar configurations
    document.addEventListener('themeChanged', function(e) {
        updateSidebarTheme(e.detail.theme);
    });
}

/**
 * Set active menu item based on current page
 */
function setActiveMenuItem() {
    const currentPage = getCurrentPage();
    
    if (currentPage) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-slate-800', 'text-white');
            item.classList.add('text-slate-300');
        });
        
        // Add active class to current nav item
        const activeItem = document.querySelector(`.nav-item[data-page="${currentPage}"]`);
        if (activeItem) {
            activeItem.classList.remove('text-slate-300', 'hover:bg-slate-800');
            activeItem.classList.add('bg-slate-800', 'text-white');
            
            // If it's a dropdown item, expand the dropdown
            const parentDropdown = activeItem.closest('.dropdown-content');
            if (parentDropdown) {
                parentDropdown.classList.remove('hidden');
                const dropdownToggle = parentDropdown.previousElementSibling;
                if (dropdownToggle && dropdownToggle.classList.contains('dropdown-toggle')) {
                    dropdownToggle.querySelector('.fa-chevron-down').classList.add('transform', 'rotate-180');
                }
            }
        }
    }
}

/**
 * Get current page identifier from URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('.')[0];
    return filename;
}

/**
 * Initialize dropdown toggles
 */
function initializeDropdowns() {
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const dropdownContent = this.nextElementSibling;
            const chevron = this.querySelector('.fa-chevron-down');
            
            // Toggle dropdown visibility
            dropdownContent.classList.toggle('hidden');
            
            // Toggle chevron rotation
            chevron.classList.toggle('rotate-180');
        });
    });
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            (async () => {
                const confirmed = (typeof window.showLogoutConfirm === 'function')
                    ? await window.showLogoutConfirm()
                    : confirm('Are you sure you want to logout?');

                if (!confirmed) return;
                // Use the centralized logout function from auth.js
                logout();
            })();
        });
    }
}

/**
 * Update sidebar theme
 */
function updateSidebarTheme(theme) {
    const sidebar = document.querySelector('.unified-sidebar-component aside');
    
    if (sidebar) {
        if (theme === 'dark') {
            sidebar.classList.remove('bg-white', 'text-slate-800');
            sidebar.classList.add('bg-slate-900', 'text-white');
        } else {
            sidebar.classList.remove('bg-slate-900', 'text-white');
            sidebar.classList.add('bg-white', 'text-slate-800');
        }
    }
}

/**
 * Check if user is authenticated - use isLoggedIn from auth.js instead
 * @returns {boolean} - Whether the user is authenticated
 */
function isAuthenticated() {
    // Use the centralized isLoggedIn function if available
    if (typeof isLoggedIn === 'function') {
        return isLoggedIn();
    }
    // Fallback implementation
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('user') !== null;
}

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}
