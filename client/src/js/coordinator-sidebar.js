// Load the sidebar component
async function loadSidebar() {
    try {
        // Try both files - first try coordinator-sidenav.html
        let response;
        try {
            response = await fetch('../../components/coordinator-sidenav.html');
            if (!response.ok) throw new Error('Not found');
        } catch (e) {
            // If not found, try coordinator-sidebar.html as fallback
            response = await fetch('../../components/coordinator-sidebar.html');
        }
        
        const html = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        
        // Get the sidebar component - try both selectors
        let sidebarContent = tempContainer.querySelector('.coordinator-sidenav');
        if (!sidebarContent) {
            sidebarContent = tempContainer.querySelector('.coordinator-sidebar-component');
        }
        
        // Insert sidebar into the page
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer && sidebarContent) {
            sidebarContainer.appendChild(sidebarContent.cloneNode(true));
        }

        // Execute the sidebar scripts
        const scripts = tempContainer.getElementsByTagName('script');
        Array.from(scripts).forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
        });
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Handle notifications
function setupWebSocket() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const ws = new WebSocket(`ws://localhost:3000/notifications/${user.id}`);
    
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
