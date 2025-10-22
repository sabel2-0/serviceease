// Shared Sidebar Loader
function loadSidebar() {
    return fetch('../components/sidebar.html')
        .then(response => response.text())
        .then(html => {
            const sidebarContainer = document.getElementById('sidebar');
            if (sidebarContainer) {
                sidebarContainer.innerHTML = html;
                
                // Initialize dropdown functionality immediately after loading
                initializeDropdowns();
                initializeNavigation();
                initializeLogout();
            }
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
        });
}

// Initialize dropdown functionality
function initializeDropdowns() {
    console.log('Initializing dropdowns...');
    const dropdowns = document.querySelectorAll('.dropdown');
    console.log('Found dropdowns:', dropdowns.length);
    
    dropdowns.forEach((dropdown, index) => {
        console.log(`Setting up dropdown ${index + 1}`);
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const content = dropdown.querySelector('.dropdown-content');
        const chevron = toggle ? toggle.querySelector('.fa-chevron-down') : null;
        
        if (!toggle || !content) {
            console.error(`Missing elements for dropdown ${index + 1}`);
            return;
        }
        
        // Remove any existing event listeners to prevent duplicates
        toggle.replaceWith(toggle.cloneNode(true));
        const newToggle = dropdown.querySelector('.dropdown-toggle');
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Dropdown clicked!');
            
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
            
            const currentChevron = newToggle.querySelector('.fa-chevron-down');
            if (currentChevron) {
                if (isHidden) {
                    currentChevron.style.transform = 'rotate(180deg)';
                    console.log('Opening dropdown');
                } else {
                    currentChevron.style.transform = 'rotate(0deg)';
                    console.log('Closing dropdown');
                }
            }
        });
        
        console.log(`Dropdown ${index + 1} setup complete`);
    });
}

// Initialize navigation highlighting
function initializeNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        const dataPage = item.getAttribute('data-page');
        
        // Check if this is the current page
        if (href === currentPage || 
            (currentPage === 'admin.html' && dataPage === 'admin') ||
            (href && href.includes(currentPage)) ||
            dataPage === currentPage.replace('.html', '')) {
            
            item.classList.add('bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300', 'text-slate-400');
            
            // If this item is inside a dropdown, open the dropdown
            const parentDropdown = item.closest('.dropdown');
            if (parentDropdown) {
                const content = parentDropdown.querySelector('.dropdown-content');
                const chevron = parentDropdown.querySelector('.fa-chevron-down');
                if (content) {
                    content.classList.remove('hidden');
                }
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            }
        }
    });
}

// Initialize logout functionality
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const logoutModalContent = document.getElementById('logout-modal-content');
    const cancelLogout = document.getElementById('cancel-logout');
    const confirmLogout = document.getElementById('confirm-logout');
    const logoutText = document.getElementById('logout-text');
    const logoutSpinner = document.getElementById('logout-spinner');
    
    if (logoutBtn && logoutModal) {
        // Show modal when logout button is clicked
        logoutBtn.addEventListener('click', function() {
            showLogoutModal();
        });
        
        // Cancel logout
        if (cancelLogout) {
            cancelLogout.addEventListener('click', function() {
                hideLogoutModal();
            });
        }
        
        // Confirm logout
        if (confirmLogout) {
            confirmLogout.addEventListener('click', function() {
                performLogout();
            });
        }
        
        // Close modal when clicking outside
        logoutModal.addEventListener('click', function(e) {
            if (e.target === logoutModal) {
                hideLogoutModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
                hideLogoutModal();
            }
        });
    }
    
    function showLogoutModal() {
        logoutModal.classList.remove('hidden');
        // Trigger animation
        setTimeout(() => {
            logoutModalContent.classList.remove('scale-95', 'opacity-0');
            logoutModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
    
    function hideLogoutModal() {
        logoutModalContent.classList.remove('scale-100', 'opacity-100');
        logoutModalContent.classList.add('scale-95', 'opacity-0');
        // Hide modal after animation
        setTimeout(() => {
            logoutModal.classList.add('hidden');
        }, 300);
    }
    
    function performLogout() {
        // Show loading state
        logoutText.textContent = 'Signing out...';
        logoutSpinner.classList.remove('hidden');
        confirmLogout.disabled = true;
        cancelLogout.disabled = true;
        
        // Clear all authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        sessionStorage.clear();
        
        // Force a small delay to ensure localStorage is cleared
        setTimeout(() => {
            // Use absolute path to ensure proper navigation
            window.location.replace('login.html');
        }, 1000);
    }
}

// Auto-load sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadSidebar();
});