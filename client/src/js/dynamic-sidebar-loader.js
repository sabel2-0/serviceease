/**
 * Dynamic Sidebar Loader
 * Loads the appropriate sidebar based on user role
 * This ensures role-based access control while allowing shared pages
 */

function loadDynamicSidebar(containerId = 'dynamic-sidebar') {
    const user = getCurrentUser();
    const sidebarContainer = document.getElementById(containerId);
    
    if (!user) {
        console.error('No user found, redirecting to login');
        window.location.href = '/pages/login.html';
        return;
    }
    
    if (!sidebarContainer) {
        console.error(`Sidebar container #${containerId} not found`);
        return;
    }
    
    // Determine the correct path based on current location
    const currentPath = window.location.pathname;
    let componentBasePath = '';
    let scriptBasePath = '';
    
    // Check if we're in a subdirectory of pages
    if (currentPath.includes('/pages/admin/') || currentPath.includes('/pages/operations-officer/')) {
        componentBasePath = '../../components/';
        scriptBasePath = '../../js/';
    } else if (currentPath.includes('/pages/')) {
        componentBasePath = '../components/';
        scriptBasePath = '../js/';
    } else {
        componentBasePath = 'components/';
        scriptBasePath = 'js/';
    }
    
    let sidebarPath = '';
    let sidebarScriptPath = '';
    
    // Determine which sidebar to load based on user role
    switch (user.role) {
        case 'admin':
            sidebarPath = componentBasePath + 'admin-sidebar.html';
            sidebarScriptPath = scriptBasePath + 'admin-sidebar.js';
            break;
        case 'operations_officer':
            sidebarPath = componentBasePath + 'operations-officer-sidebar.html';
            sidebarScriptPath = scriptBasePath + 'operations-officer-sidebar.js';
            break;
        case 'technician':
            sidebarPath = componentBasePath + 'technician-sidebar.html';
            sidebarScriptPath = scriptBasePath + 'technician-sidebar.js';
            break;
        case 'coordinator':
            sidebarPath = componentBasePath + 'coordinator-sidebar.html';
            sidebarScriptPath = scriptBasePath + 'coordinator-sidebar.js';
            break;
        default:
            console.error('Unknown user role:', user.role);
            window.location.href = '/pages/login.html';
            return;
    }
    
    console.log(`Loading ${user.role} sidebar from: ${sidebarPath}`);
    console.log(`Current path: ${currentPath}`);
    console.log(`Component base path: ${componentBasePath}`);
    
    // Load the appropriate sidebar HTML
    fetch(sidebarPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load sidebar (HTTP ${response.status})`);
            }
            return response.text();
        })
        .then(html => {
            sidebarContainer.innerHTML = html;
            console.log(`Sidebar HTML loaded for ${user.role}`);
            
            // Initialize sidebar functionality immediately after loading HTML
            initializeSidebarFunctionality(user.role);
            
            // Load the corresponding sidebar JavaScript
            loadSidebarScript(sidebarScriptPath, user.role);
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            sidebarContainer.innerHTML = `
                <div class="p-4 bg-red-100 text-red-600 rounded-lg m-4">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <div>
                            <p class="font-bold">Failed to load sidebar</p>
                            <p class="text-sm mt-1">${error.message}</p>
                            <p class="text-xs mt-2 opacity-75">Role: ${user.role}</p>
                        </div>
                    </div>
                </div>
            `;
        });
}

function initializeSidebarFunctionality(userRole) {
    console.log(`Initializing sidebar functionality for ${userRole}`);
    
    // Initialize dropdown toggles
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const content = this.nextElementSibling;
            const icon = this.querySelector('.fa-chevron-down');
            
            if (content) {
                content.classList.toggle('hidden');
            }
            if (icon) {
                icon.classList.toggle('rotate-180');
            }
            
            console.log('Dropdown toggled');
        });
    });

    // Prevent dropdown content clicks from bubbling up
    const dropdownContents = document.querySelectorAll('.dropdown-content');
    dropdownContents.forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation(); // Stop click from reaching the document
        });
    });
    
    // Initialize logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        // Remove any existing event listeners first (just in case)
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add our event listener
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked in dynamic-sidebar-loader.js');
            
            if (confirm('Are you sure you want to logout?')) {
                console.log('User confirmed logout');
                
                // Clear all user data from localStorage
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('token');
                console.log('Local storage cleared');
                
                // Use absolute path for redirect - works from any page location
                try {
                    console.log('Redirecting to login page');
                    window.location.href = '/pages/login.html';
                } catch (e) {
                    console.error('Error during logout redirect:', e);
                    // Fallback to origin-based redirect
                    window.location.href = window.location.origin + '/pages/login.html';
                }
            }
        });
        
    }
    
    // Role-specific initialization
    if (userRole === 'operations_officer') {
        initializeOperationsOfficerSidebar();
    }
}

function initializeOperationsOfficerSidebar() {
    console.log('Initializing operations officer specific features');
    
    // Add navigation protection for operations officer
    const navLinks = document.querySelectorAll('a[href]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Allow external links and non-page links
            if (!href || !href.includes('/pages/')) {
                return;
            }
            
            // Allow access to specific admin pages
            const allowedAdminPages = [
                'coordinator-accounts.html',
                'coordinator-approvals.html',
                'client-management.html',
                'client-printers.html',
                'inventory-items.html',
                'inventory-parts.html'
            ];
            
            // Check if the link is to an allowed admin page
            if (allowedAdminPages.some(page => href.includes(`/pages/admin/${page}`))) {
                return;
            }
            
            // Check if trying to access operations-officer pages
            if (href.includes('/pages/operations-officer/')) {
                return;
            }
            
            // Block access to other admin pages
            if (href.includes('/pages/admin/')) {
                e.preventDefault();
                showSecurityWarning('You do not have access to this administrative page: ' + href);
                console.warn('Operations Officer tried to access restricted admin page:', href);
                return false;
            }
        });
    });
    
    // Initialize restricted permission messages
    const restrictedItems = document.querySelectorAll('.cursor-not-allowed');
    restrictedItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            showRestrictedPermissionMessage();
        });
    });
}

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
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.classList.add('opacity-0');
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 500);
    }, 5000);
}

function showRestrictedPermissionMessage() {
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
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-orange-500 hover:text-orange-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 500);
    }, 4000);
}

function loadSidebarScript(scriptPath, userRole) {
    // Check if script is already loaded to avoid duplicates
    const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
    if (existingScript) {
        console.log(`Script ${scriptPath} already loaded`);
        return;
    }
    
    const script = document.createElement('script');
    script.src = scriptPath;
    script.onload = function() {
        console.log(`Sidebar script loaded successfully for ${userRole}`);
    };
    script.onerror = function() {
        console.error(`Failed to load sidebar script: ${scriptPath}`);
    };
    
    document.head.appendChild(script);
}

// Auto-load sidebar when DOM is ready if container exists
document.addEventListener('DOMContentLoaded', function() {
    // Check for dynamic sidebar container
    const dynamicContainer = document.getElementById('dynamic-sidebar');
    if (dynamicContainer) {
        loadDynamicSidebar('dynamic-sidebar');
        return;
    }
    
    // Check for legacy containers and convert them
    const adminContainer = document.getElementById('admin-sidebar');
    const opsContainer = document.getElementById('operations-officer-sidebar');
    
    if (adminContainer) {
        adminContainer.id = 'dynamic-sidebar';
        loadDynamicSidebar('dynamic-sidebar');
        return;
    }
    
    if (opsContainer) {
        opsContainer.id = 'dynamic-sidebar';
        loadDynamicSidebar('dynamic-sidebar');
        return;
    }
});
