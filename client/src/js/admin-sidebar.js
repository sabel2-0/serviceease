/**
 * Admin Sidebar Loader
 * This script loads the admin sidebar component into any admin page that includes it
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.getElementById('admin-sidebar');
    
    if (sidebarContainer) {
        // Load the admin sidebar component
        fetch('../../components/admin-sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load admin sidebar');
                }
                return response.text();
            })
            .then(html => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = html;
                
                // Extract just the sidebar element
                const sidebar = tempContainer.querySelector('aside');
                
                if (sidebar) {
                    sidebarContainer.appendChild(sidebar);
                    
                    // Initialize sidebar functionality
                    initializeSidebar();
                    
                    // Load notification count
                    loadNotificationCount();
                    
                    // Refresh notification count every 30 seconds
                    setInterval(loadNotificationCount, 30000);
                } else {
                    console.error('Could not find sidebar element in admin-sidebar.html');
                }
            })
            .catch(error => {
                console.error('Error loading admin sidebar:', error);
                sidebarContainer.innerHTML = `<div class="p-4 text-red-500">Error loading sidebar: ${error.message}</div>`;
            });
    }
});

// Initialize sidebar functionality
function initializeSidebar() {
    // Dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const content = dropdown.querySelector('.dropdown-content');
        const chevron = toggle ? toggle.querySelector('.fa-chevron-down') : null;
        
        if (!toggle || !content) {
            return;
        }
        
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Close other dropdowns
            dropdowns.forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    const otherContent = otherDropdown.querySelector('.dropdown-content');
                    const otherChevron = otherDropdown.querySelector('.fa-chevron-down');
                    if (otherContent) {
                        otherContent.classList.add('hidden');
                    }
                    if (otherChevron) {
                        otherChevron.style.transform = 'rotate(0deg)';
                    }
                }
            });
            
            // Toggle current dropdown
            const isHidden = content.classList.contains('hidden');
            content.classList.toggle('hidden');
            
            if (chevron) {
                if (isHidden) {
                    chevron.style.transform = 'rotate(180deg)';
                } else {
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        });
    });

    // Highlight active page and open relevant dropdown
    const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        const dataPage = item.getAttribute('data-page');
        
        // Check if this is the current page
        if (href && href.includes(currentPage) || 
            (currentPage === 'admin.html' && dataPage === 'admin') ||
            dataPage === currentPage.replace('.html', '')) {
            
            item.classList.add('bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300', 'text-slate-400');
            
            // If this item is inside a dropdown, open the dropdown
            const parentDropdown = item.closest('.dropdown');
            if (parentDropdown) {
                const content = parentDropdown.querySelector('.dropdown-content');
                const chevron = parentDropdown.querySelector('.fa-chevron-down');
                if (content) content.classList.remove('hidden');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            }
        }
    });
    
    // Set up logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                // Clear authentication data
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                sessionStorage.clear();
                
                // Show loading state
                this.innerHTML = '<i class="fas fa-spinner fa-spin w-5 h-5 mr-3"></i><span>Signing out...</span>';
                
                // Redirect to login
                setTimeout(() => {
                    window.location.href = '../../pages/login.html';
                }, 1000);
            }
        });
    }
}

// Load notification count from API
async function loadNotificationCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/admin/notifications/count', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateNotificationBadge(data.count || 0);
        }
    } catch (error) {
        console.error('Error loading notification count:', error);
    }
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.querySelector('#notifications-link span.bg-red-500');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}
