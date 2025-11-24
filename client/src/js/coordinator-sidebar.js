// Load the sidebar component
async function loadSidebar() {
    try {
        const response = await fetch('../../components/coordinator-sidebar.html');
        const html = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        
        const sidebarContent = tempContainer.querySelector('.coordinator-sidebar-component');
        
        // Insert sidebar into the page
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer && sidebarContent) {
            sidebarContainer.appendChild(sidebarContent.cloneNode(true));
            
            // Initialize dropdowns after sidebar is loaded
            initializeDropdowns();
        }
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Initialize dropdown functionality
function initializeDropdowns() {
    // Get current page from URL
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    // Handle dropdown toggles
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const content = this.nextElementSibling;
            const chevron = this.querySelector('.fa-chevron-down');
            const isOpen = !content.classList.contains('hidden');
            
            if (isOpen) {
                content.classList.add('hidden');
                chevron.style.transform = '';
            } else {
                content.classList.remove('hidden');
                chevron.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // Auto-open dropdown if current page is inside it
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        if (item.dataset.page === currentPage) {
            // Add active styling
            item.classList.add('bg-gray-100', 'text-gray-900', 'font-medium');
            
            // If inside dropdown, open the parent dropdown
            const dropdown = item.closest('.dropdown');
            if (dropdown) {
                const content = dropdown.querySelector('.dropdown-content');
                const chevron = dropdown.querySelector('.fa-chevron-down');
                if (content) {
                    content.classList.remove('hidden');
                    if (chevron) {
                        chevron.style.transform = 'rotate(180deg)';
                    }
                }
            }
        }
    });
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('token');
            window.location.href = '../../pages/login.html';
        });
    }
}

// Handle notifications
function setupWebSocket() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const ws = new WebSocket(`${WS_BASE_URL}/notifications/${user.id}`);
    
    ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        showNotification(notification);
        updateNotificationBadges();
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    return ws;
}

// Show notification toast
function showNotification(notification) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 notification-toast';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-bell text-blue-500 mr-2"></i>
            <div>
                <h4 class="font-semibold">${notification.title}</h4>
                <p class="text-sm text-gray-600">${notification.message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Update notification badges
async function updateNotificationBadges() {
    try {
        const response = await fetch('/api/coordinator/notification-counts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        // Update UI badges
        document.querySelectorAll('.notification-badge').forEach(badge => badge.remove());
        
        if (data.pendingApprovals > 0) {
            addBadge('approvals', data.pendingApprovals);
        }
        if (data.activeRequests > 0) {
            addBadge('requests', data.activeRequests);
        }
        if (data.notifications > 0) {
            addBadge('notifications', data.notifications);
        }
    } catch (error) {
        console.error('Error updating notification badges:', error);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebar();
    const ws = setupWebSocket();
    
    // Add "Technician Assignments" link to sidebar if not already present
    addTechnicianAssignmentsLink();
    
    // Clean up WebSocket on page unload
    window.addEventListener('unload', () => {
        if (ws) ws.close();
    });
});

// Add Technician Assignments link to the sidebar
function addTechnicianAssignmentsLink() {
    const sidebarNavContainer = document.querySelector('.nav-group:nth-child(3) .space-y-1');
    
    if (sidebarNavContainer && !document.querySelector('[data-feature="technician-assignments"]')) {
        const techAssignmentLink = document.createElement('a');
        techAssignmentLink.href = "#";
        techAssignmentLink.setAttribute('onclick', "showTab('technician-assignments')");
        techAssignmentLink.className = 'nav-item flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors';
        techAssignmentLink.dataset.feature = 'technician-assignments';
        techAssignmentLink.innerHTML = `
            <i class="fas fa-user-cog w-5 h-5 mr-3"></i>
            <span>Technician Assignments</span>
        `;
        
        sidebarNavContainer.appendChild(techAssignmentLink);
    }
}

// Export functions for use in other modules
export {
    loadSidebar,
    setupWebSocket,
    showNotification,
    updateNotificationBadges
};
