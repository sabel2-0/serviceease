/**
 * Coordinator Accounts Management - Admin View
 * This script handles the coordinator accounts page in the admin section
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin or operations_officer role
    if (!verifyRole(['admin', 'operations_officer'])) {
        return; // verifyRole will handle redirect
    }

    // Initialize the page
    initPage();
});

// Global variables
let currentTab = 'all';
let allCoordinators = [];

/**
 * Get current user's role
 */
function getUserRole() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role;
}

/**
 * Initialize the page and load coordinators
 */
function initPage() {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Initialize search and filters
    initializeSearchAndFilters();
    
    // Load coordinators data
    fetchCoordinators();
}

/**
 * Switch between tabs
 */
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab styles
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
    activeTab.classList.remove('border-transparent', 'text-gray-500');
    
    // Filter and render coordinators based on tab
    filterAndRenderCoordinators();
}

/**
 * Filter and render coordinators based on current tab and search
 */
function filterAndRenderCoordinators() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredCoordinators = allCoordinators;
    
    // Filter by tab
    if (currentTab === 'active') {
        filteredCoordinators = allCoordinators.filter(coord => coord.status === 'active');
    } else if (currentTab === 'inactive') {
        filteredCoordinators = allCoordinators.filter(coord => coord.status === 'inactive');
    }
    
    // Filter by search query
    if (searchQuery) {
        filteredCoordinators = filteredCoordinators.filter(coord => 
            coord.first_name.toLowerCase().includes(searchQuery) ||
            coord.last_name.toLowerCase().includes(searchQuery) ||
            coord.email.toLowerCase().includes(searchQuery) ||
            (coord.institution && coord.institution.toLowerCase().includes(searchQuery))
        );
    }
    
    renderCoordinatorTable(filteredCoordinators);
    updateCounts();
}

/**
 * Update status counters
 */
function updateCounts() {
    const activeCount = allCoordinators.filter(coord => coord.status === 'active').length;
    const inactiveCount = allCoordinators.filter(coord => coord.status === 'inactive').length;
    
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('inactiveCount').textContent = inactiveCount;
}

/**
 * Refresh coordinators list
 */
function refreshCoordinators() {
    fetchCoordinators();
}

/**
 * Initialize search and filter functionality
 */
function initializeSearchAndFilters() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            fetchCoordinators();
        }, 500));
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            fetchCoordinators();
        });
    }
}

/**
 * Fetch coordinators from the server
 */
function fetchCoordinators() {
    document.getElementById('loadingState').classList.remove('hidden');
    
    const token = getAuthToken();
    console.log('Auth token:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
    
    // Check authentication before making request
    if (!token) {
        console.error('No authentication token found');
        localStorage.clear();
        window.location.href = '/pages/login.html';
        return;
    }
    
    // API call to get approved coordinators only
    fetch(`/api/coordinators`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.status === 401) {
            console.log('Authentication failed - redirecting to login');
            localStorage.clear();
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!response.ok) {
            return response.json().then(errorData => {
                console.log('Error response:', errorData);
                throw new Error(`Failed to fetch coordinators: ${errorData.error || response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Received data:', data);
        // Store all coordinators
        allCoordinators = Array.isArray(data) ? data : [];
        console.log('Stored coordinators:', allCoordinators.length);
        
        // Filter and render based on current tab
        filterAndRenderCoordinators();
        
        document.getElementById('loadingState').classList.add('hidden');
    })
    .catch(error => {
        console.error('Error fetching coordinators:', error);
        document.getElementById('loadingState').classList.add('hidden');
        
        // Check if it's an authentication error
        if (error.message.includes('401') || error.message.includes('jwt') || !getAuthToken()) {
            console.log('Authentication error detected, redirecting to login');
            localStorage.clear(); // Clear any invalid tokens
            window.location.href = '/pages/login.html';
            return;
        }
        
        showToast('Failed to load coordinators. Please try again.', 'error');
        
        // Show empty state
        const tableBody = document.getElementById('coordinatorTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-exclamation-triangle mb-3 text-3xl text-red-400"></i>
                            <p class="text-lg">Failed to load coordinators</p>
                            <p class="text-sm mt-1">Please refresh the page or try again</p>
                            <button onclick="fetchCoordinators()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });
}

/**
 * Render the coordinator table with data
 */
function renderCoordinatorTable(coordinators) {
    const tableBody = document.getElementById('coordinatorTableBody');
    
    if (!tableBody) {
        console.error('Coordinator table body element not found');
        return;
    }
    
    if (coordinators.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search mb-3 text-3xl text-gray-400"></i>
                        <p class="text-lg">No coordinators found</p>
                        <p class="text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add coordinator rows
    coordinators.forEach(coordinator => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusClass = coordinator.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        
        // Format names from database fields (first_name, last_name) to camelCase for display
        const firstName = coordinator.first_name || coordinator.firstName || '';
        const lastName = coordinator.last_name || coordinator.lastName || '';
        
        // Get organization name and handle display better
        const institution = coordinator.institution || coordinator.organizationName || '';
        const institutionDisplay = institution || 'No Organization';
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-user-tie text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${firstName} ${lastName}</div>
                        <div class="text-sm text-gray-500">${coordinator.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <div class="text-sm font-medium text-gray-900">${institutionDisplay}</div>
                    ${coordinator.phone ? `
                    <div class="text-xs text-blue-600 mt-1">
                        <i class="fas fa-phone-alt mr-1"></i> ${coordinator.phone}
                    </div>
                    ` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${coordinator.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end space-x-3">
                    <button onclick="viewCoordinatorDetails('${coordinator.id}')" class="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${getUserRole() === 'admin' ? `
                        <button onclick="changeCoordinatorPassword('${coordinator.id}')" class="p-2 action-password rounded-lg" title="Change Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="toggleCoordinatorStatus('${coordinator.id}', '${coordinator.status}')" 
                            class="p-2 ${coordinator.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg"
                            title="${coordinator.status === 'active' ? 'Deactivate Account' : 'Activate Account'}">
                            <i class="fas fa-${coordinator.status === 'active' ? 'user-slash' : 'user-check'}"></i>
                        </button>
                    ` : `
                        <button class="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed" title="Requires admin privileges" disabled>
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed" title="Requires admin privileges" disabled>
                            <i class="fas fa-${coordinator.status === 'active' ? 'user-slash' : 'user-check'}"></i>
                        </button>
                    `}
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Update pagination information
 */
function updatePagination(total) {
    document.getElementById('totalResults').textContent = total;
}

/**
 * View coordinator details
 */
function viewCoordinatorDetails(coordinatorId) {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    
    fetch(`/api/coordinators/${coordinatorId}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch coordinator details');
        }
        return response.json();
    })
    .then(coordinator => {
        // Extract fields with proper naming, handling both camelCase and snake_case
        const firstName = coordinator.first_name || coordinator.firstName || '';
        const lastName = coordinator.last_name || coordinator.lastName || '';
        
        // Populate coordinator details in modal
        document.getElementById('coordinatorName').textContent = `${firstName} ${lastName}`;
        document.getElementById('coordinatorEmail').textContent = coordinator.email;
        
        const statusElem = document.getElementById('coordinatorStatus');
        statusElem.textContent = coordinator.status || 'active';
        statusElem.className = `px-2 py-1 text-xs rounded-full ${(coordinator.status === 'active' || !coordinator.status) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        
        // Show only institution name
        document.getElementById('orgName').textContent = coordinator.institution || coordinator.institution_name || 'No institution specified';
        
        // Show registration date
        const createdAt = coordinator.created_at || coordinator.createdAt;
        document.getElementById('regDate').textContent = createdAt ? 
            new Date(createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'
            }) : 'Unknown';
        
        // Toggle status button text and style
        const status = coordinator.status || 'active';
        const toggleStatusBtn = document.getElementById('toggleStatusBtn');
        toggleStatusBtn.textContent = status === 'active' ? 'Deactivate Account' : 'Activate Account';
        toggleStatusBtn.className = `px-4 py-2 ${status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-md`;
        toggleStatusBtn.onclick = function() {
            toggleCoordinatorStatus(coordinator.id, status);
        };
        
        // Show the modal
        document.getElementById('detailsModal').classList.remove('hidden');
        document.getElementById('loadingState').classList.add('hidden');
        
        // Hide deactivate button for operations officers
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.role === 'operations_officer') {
            const toggleBtn = document.getElementById('toggleStatusBtn');
            if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
        }
    })
    .catch(error => {
        console.error('Error fetching coordinator details:', error);
        document.getElementById('loadingState').classList.add('hidden');
        showToast('Failed to load coordinator details. Please try again.', 'error');
    });
}

/**
 * Fetch technicians assigned to a coordinator
 */
function fetchAssignedTechnicians(coordinatorId) {
    // Display a "Not implemented yet" message since the API endpoint doesn't exist
    document.getElementById('assignedTechniciansList').innerHTML = `
        <div class="text-center py-4 text-gray-500">
            <p>No technicians assigned to this coordinator</p>
            <p class="text-xs mt-1">Technician assignments feature coming soon</p>
        </div>
    `;
    
    /* 
    // Keep this code commented out until the API endpoint is implemented
    fetch(`/api/coordinators/${coordinatorId}/technicians`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch assigned technicians');
        }
        return response.json();
    })
    .then(data => {
        const techniciansList = document.getElementById('assignedTechniciansList');
        
        if (data.technicians && data.technicians.length > 0) {
            techniciansList.innerHTML = '';
            
            data.technicians.forEach(tech => {
                const techItem = document.createElement('div');
                techItem.className = 'flex items-center justify-between py-2';
                techItem.innerHTML = `
                    <div class="flex items-center">
                        <div class="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user text-gray-600"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${tech.firstName} ${tech.lastName}</p>
                            <p class="text-xs text-gray-500">${tech.email}</p>
                        </div>
                    </div>
                `;
                
                techniciansList.appendChild(techItem);
            });
        } else {
            techniciansList.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>No technicians assigned to this coordinator</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error fetching assigned technicians:', error);
        document.getElementById('assignedTechniciansList').innerHTML = `
            <div class="text-center py-4 text-red-500">
                <p>Failed to load assigned technicians</p>
            </div>
        `;
    });
    */
}

/**
 * Close details modal
 */
function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
}

/**
 * Toggle coordinator account status (active/inactive)
 */
function toggleCoordinatorStatus(coordinatorId, currentStatus) {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    const confirmMsg = currentStatus === 'active' 
        ? 'Are you sure you want to deactivate this coordinator account?' 
        : 'Are you sure you want to activate this coordinator account?';
    
    if (confirm(confirmMsg)) {
        document.getElementById('loadingState').classList.remove('hidden');
        
        fetch(`/api/coordinators/${coordinatorId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update coordinator status');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('loadingState').classList.add('hidden');
            
            // Close modal if open
            closeDetailsModal();
            
            // Refresh coordinators list
            fetchCoordinators();
            
            showToast(data.message || `Coordinator ${action}d successfully`, 'success');
        })
        .catch(error => {
            console.error('Error updating coordinator status:', error);
            document.getElementById('loadingState').classList.add('hidden');
            showToast('Failed to update coordinator status. Please try again.', 'error');
        });
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `mb-3 p-4 rounded-lg shadow-lg flex items-center w-72 transform transition-all duration-300 ease-in-out translate-y-2 opacity-0 ${type === 'error' ? 'bg-red-500 text-white' : type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon} mr-3"></i>
        <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Debounce function to limit how often a function is called
 */
function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Get authentication token from storage
 */
function getAuthToken() {
    return localStorage.getItem('token');
}

/**
 * Check if user has required role
 */
function checkAuth(requiredRoles = []) {
    // First try to get user data from localStorage directly
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log("User data from localStorage:", user);
            // Check if user has required role
            if (user && user.role && requiredRoles.includes(user.role)) {
                return true;
            }
        } catch (err) {
            console.error('Error parsing user data:', err);
        }
    }
    
    // Fall back to token-based auth if direct user data is not available
    const token = getAuthToken();
    
    if (!token) {
        console.log("No auth token found");
        return false;
    }
    
    try {
        // Decode JWT token to get user data
        const base64Url = token.split('.')[1];
        if (!base64Url) {
            console.error("Invalid token format");
            return false;
        }
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userData = JSON.parse(jsonPayload);
        console.log("User data from token:", userData);
        
        // Check if user has required role
        return requiredRoles.includes(userData.role);
    } catch (err) {
        console.error('Error checking auth:', err);
        return false;
    }
}

/**
 * Change Coordinator Password Functions
 */
window.changeCoordinatorPassword = function(coordinatorId) {
    console.log('changeCoordinatorPassword called with ID:', coordinatorId);
    console.log('All coordinators:', allCoordinators);
    
    const coordinator = allCoordinators.find(c => String(c.id) === String(coordinatorId));
    if (!coordinator) {
        console.error('Coordinator not found with ID:', coordinatorId);
        showToast('Coordinator not found', 'error');
        return;
    }

    console.log('Found coordinator:', coordinator);

    // Populate modal with coordinator info
    document.getElementById('changePasswordCoordinatorId').value = coordinator.id;
    document.getElementById('changePasswordCoordinatorName').textContent = `${coordinator.first_name || coordinator.firstName} ${coordinator.last_name || coordinator.lastName}`;
    document.getElementById('changePasswordCoordinatorEmail').textContent = coordinator.email;
    
    // Clear form fields
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
    
    // Hide any previous alerts
    const alertDiv = document.getElementById('changePasswordAlert');
    alertDiv.classList.add('hidden');
    
    // Show modal
    document.getElementById('changePasswordModal').classList.remove('hidden');
};

window.closeChangePasswordModal = function() {
    document.getElementById('changePasswordModal').classList.add('hidden');
    document.getElementById('changePasswordForm').reset();
};

// Handle password change form submission
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const coordinatorId = document.getElementById('changePasswordCoordinatorId').value;
    const newPassword = document.getElementById('newPasswordInput').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();
    const alertDiv = document.getElementById('changePasswordAlert');
    const submitBtn = document.getElementById('submitChangePasswordBtn');
    const btnText = document.getElementById('changePasswordBtnText');
    const loader = document.getElementById('changePasswordLoader');
    
    // Validation
    if (newPassword.length < 6) {
        showAlertInModal(alertDiv, 'Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlertInModal(alertDiv, 'Passwords do not match', 'error');
        return;
    }
    
    try {
        // Show loading state
        submitBtn.disabled = true;
        btnText.textContent = 'Changing...';
        loader.classList.remove('hidden');
        alertDiv.classList.add('hidden');
        
        const token = getAuthToken();
        const response = await fetch(`/api/admin/coordinators/${coordinatorId}/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        // Success
        showToast('Password changed successfully', 'success');
        closeChangePasswordModal();
        
    } catch (error) {
        console.error('Error changing password:', error);
        showAlertInModal(alertDiv, error.message || 'Failed to change password', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.textContent = 'Change Password';
        loader.classList.add('hidden');
    }
});

// Helper function to show alerts in modal
function showAlertInModal(alertDiv, message, type) {
    alertDiv.className = `rounded-md p-3 mb-4 text-sm ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    alertDiv.classList.remove('hidden');
}
