// Function to load the appropriate sidebar based on user role
async function loadSidebar() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user found in localStorage');
        return;
    }

    let sidebarPath = '';
    let containerId = '';

    // Determine sidebar path and container based on user role
    switch (user.role) {
        case 'admin':
            sidebarPath = '../../components/admin-sidebar.html';
            containerId = 'admin-sidebar';
            break;
        case 'operations_officer':
            sidebarPath = '../../components/operations-officer-sidebar.html';
            containerId = 'operations-officer-sidebar';
            break;
        case 'technician':
            sidebarPath = '../../components/technician-sidebar.html';
            containerId = 'technician-sidebar';
            break;
        default:
            sidebarPath = '../../components/institution_admin-sidebar.html';
            containerId = 'institution_admin-sidebar';
    }

    // Find the sidebar container
    const sidebarContainer = document.getElementById(containerId);
    if (!sidebarContainer) {
        console.error(`Sidebar container #${containerId} not found`);
        return;
    }

    try {
        // Load the appropriate sidebar
        const response = await fetch(sidebarPath);
        if (!response.ok) throw new Error(`Failed to load sidebar (HTTP ${response.status})`);
        const html = await response.text();
        sidebarContainer.innerHTML = html;

        // Initialize dropdown functionality
        initializeDropdowns();
        initializeLogout();
    } catch (error) {
        console.error('Error loading sidebar:', error);
        sidebarContainer.innerHTML = `
            <div class="p-4 bg-red-100 text-red-600 rounded-lg">
                <p class="font-bold">Failed to load sidebar</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Initialize dropdowns for the sidebar
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (toggle && content) {
            toggle.addEventListener('click', function() {
                content.classList.toggle('hidden');
                const icon = this.querySelector('.fa-chevron-down');
                if (icon) {
                    icon.classList.toggle('rotate-180');
                }
            });
        }
    });
}

// Initialize logout functionality
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            (async () => {
                const confirmed = (typeof window.showLogoutConfirm === 'function')
                    ? await window.showLogoutConfirm()
                    : confirm('Are you sure you want to logout?');

                if (!confirmed) return;

                if (typeof logout === 'function') {
                    logout();
                } else {
                    console.error('Logout function not found');
                }
            })();
        });
    }
}

// Load the sidebar when the DOM is ready
document.addEventListener('DOMContentLoaded', loadSidebar);








