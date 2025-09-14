/**
 * Operations Officer Sidebar JavaScript
 * Handles the functionality of the Operations Officer sidebar navigation
 * Operations Officers have delegated management capabilities but limited administrative access
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Operations Officer Sidebar: DOM loaded');
    
    // Verify user role first
    const user = getCurrentUser();
    if (!user || user.role !== 'operations_officer') {
        console.error('Unauthorized access attempt to operations officer sidebar');
        window.location.href = '/pages/login.html';
        return;
    }
    
    const sidebarContainer = document.getElementById('operations-officer-sidebar');
    
    if (sidebarContainer) {
        console.log('Operations Officer Sidebar: Container found, loading sidebar...');
        
        // Load the operations officer sidebar component
        fetch('../../components/operations-officer-sidebar.html')
            .then(response => {
                console.log('Operations Officer Sidebar: Fetch response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Failed to load sidebar (HTTP ${response.status})`);
                }
                return response.text();
            })
            .then(html => {
                console.log('Operations Officer Sidebar: HTML loaded, length:', html.length);
                sidebarContainer.innerHTML = html;
                
                // Initialize sidebar functionality
                initializeSidebar();
                // Add click protection for operations officer navigation
                protectNavigation();
            })
            .catch(error => {
                console.error('Error loading operations officer sidebar:', error);
                sidebarContainer.innerHTML = `
                    <div class="p-4 bg-red-100 text-red-600 rounded-lg">
                        <p class="font-bold">Failed to load sidebar</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                `;
            });
    } else {
        console.error('Operations Officer Sidebar: Container not found');
    }
    
    // Dropdown toggles
    function initializeSidebar() {
        console.log('Operations Officer Sidebar: Initializing functionality');
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        
        // Handle dropdown toggles
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const dropdownId = this.closest('.dropdown').dataset.dropdown;
                const content = this.nextElementSibling;
                const icon = this.querySelector('.fa-chevron-down');
                
                content.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
                console.log('Operations Officer Sidebar: Toggled dropdown', dropdownId);
            });
        });
    }

    // Add protection to ensure operations officer stays within their section
    function protectNavigation() {
        console.log('Operations Officer Sidebar: Setting up navigation protection');
        
        // Get all navigation links in the sidebar
        const navLinks = document.querySelectorAll('a[href]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Allow external links and non-page links
                if (!href || !href.includes('/pages/')) {
                    return;
                }
                
                // Special exception: Allow access to admin coordinator-approvals page
                if (href.includes('/pages/admin/coordinator-approvals.html')) {
                    return; // Allow this specific admin page
                }
                
                // Check if trying to access non-operations-officer pages
                if (!href.includes('/pages/operations-officer/')) {
                    e.preventDefault();
                    
                    // Show security warning
                    showSecurityWarning('You can only access Operations Officer pages. Attempted access to: ' + href);
                    console.warn('Operations Officer tried to access:', href);
                    return false;
                }
                
                // Verify the page exists before allowing navigation
                verifyPageAccess(href);
            });
        });
    }

    // Function to verify page access
    function verifyPageAccess(href) {
        // Extract page name from href
        const pageName = href.split('/').pop().replace('.html', '');
        
        // List of allowed pages for operations officer
        const allowedPages = [
            'operations-officer',
            'coordinator-accounts', 
            'coordinator-approvals',  // Allow access to coordinator approvals
            'client-management',
            'client-printers',
            'inventory-items',
            'inventory-parts',
            'parts-requests',
            'service-requests', 
            'service-history',
            'account-management',
            'notifications'
        ];
        
        // Special case: Allow access to admin coordinator-approvals page
        if (href.includes('/pages/admin/coordinator-approvals.html')) {
            return true;
        }
        
        if (!allowedPages.includes(pageName)) {
            console.warn('Operations Officer tried to access unauthorized page:', pageName);
            showSecurityWarning('Access denied to page: ' + pageName);
            return false;
        }
        
        return true;
    }

    // Function to show security warnings
    function showSecurityWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'fixed top-5 right-5 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg transition-opacity duration-500 z-50 max-w-sm';
        warning.innerHTML = `
            <div class="flex items-start">
                <div class="mr-3 mt-1">
                    <i class="fas fa-shield-alt text-red-500"></i>
                </div>
                <div>
                    <p class="font-bold">Security Alert</p>
                    <p class="text-sm mt-1">${message}</p>
                    <p class="text-xs mt-2 opacity-75">This incident has been logged.</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            warning.classList.add('opacity-0');
            setTimeout(() => {
                if (warning.parentElement) {
                    warning.remove();
                }
            }, 500);
        }, 5000);
    }

    // Function to get current user (using auth.js function if available)
    function getCurrentUser() {
        if (typeof window.getCurrentUser === 'function') {
            return window.getCurrentUser();
        }
        
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    // Highlight current page in navigation
    const currentPage = document.body.dataset.page;
    if (currentPage) {
        const activeNavItem = document.querySelector(`.nav-item[data-page="${currentPage}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('bg-slate-800', 'text-white');
            
            // If it's in a dropdown, open the dropdown
            const parentDropdown = activeNavItem.closest('.dropdown-content');
            if (parentDropdown) {
                parentDropdown.classList.remove('hidden');
                const toggleIcon = parentDropdown.previousElementSibling.querySelector('.fa-chevron-down');
                if (toggleIcon) {
                    toggleIcon.classList.add('rotate-180');
                }
            }
        }
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                // Use auth.js logout function if available
                if (typeof window.logout === 'function') {
                    window.logout();
                } else {
                    // Fallback logout
                    localStorage.removeItem('user');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('token');
                    sessionStorage.clear();
                    window.location.href = '/pages/login.html';
                }
            }
        });
    }

    // Show tooltips for restricted features
    const restrictedItems = document.querySelectorAll('[title]');
    restrictedItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bg-slate-800 text-white text-xs p-2 rounded-md z-50 -mt-10 ml-4';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.whiteSpace = 'nowrap';
            this.appendChild(tooltip);
        });
        
        item.addEventListener('mouseleave', function() {
            const tooltip = this.querySelector('.bg-slate-800.text-white');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });

    // Display a message about restricted permissions
    function showRestrictedPermissionMessage() {
        const restrictedLinks = document.querySelectorAll('.cursor-not-allowed');
        
        restrictedLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Create and show a toast notification
                const toast = document.createElement('div');
                toast.className = 'fixed top-5 right-5 bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded shadow-md transition-opacity duration-500 z-50';
                toast.innerHTML = `
                    <div class="flex items-center">
                        <div class="mr-3">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div>
                            <p class="font-bold">Access Restricted</p>
                            <p class="text-sm">This feature requires administrator privileges.</p>
                            <p class="text-xs mt-1 opacity-75">Operations Officers have limited access.</p>
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-orange-500 hover:text-orange-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                document.body.appendChild(toast);
                
                // Remove the toast after 4 seconds
                setTimeout(() => {
                    toast.classList.add('opacity-0');
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 500);
                }, 4000);
            });
        });
    }

    // Initialize restricted permission message
    showRestrictedPermissionMessage();
});
