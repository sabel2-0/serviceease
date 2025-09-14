/**
 * Coordinator Accounts Management - Admin View
 * This script handles the coordinator accounts page in the admin section
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin role
    if (!checkAuth(['admin'])) {
        window.location.href = '../../pages/login.html';
        return;
    }

    // Initialize the page
    initPage();
});

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
    const searchQuery = document.getElementById('searchInput').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (statusFilter) params.append('status', statusFilter);
    
    // API call to get approved coordinators only
    fetch(`/api/coordinators`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch coordinators');
        }
        return response.json();
    })
    .then(data => {
        // Since the API returns an array directly instead of {coordinators: []}
        const coordinators = Array.isArray(data) ? data : [];
        renderCoordinatorTable(coordinators);
        updatePagination(coordinators.length);
        document.getElementById('loadingState').classList.add('hidden');
    })
    .catch(error => {
        console.error('Error fetching coordinators:', error);
        document.getElementById('loadingState').classList.add('hidden');
        showToast('Failed to load coordinators. Please try again.', 'error');
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
                    <button onclick="toggleCoordinatorStatus('${coordinator.id}', '${coordinator.status}')" 
                        class="p-2 ${coordinator.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg"
                        title="${coordinator.status === 'active' ? 'Deactivate Account' : 'Activate Account'}">
                        <i class="fas fa-${coordinator.status === 'active' ? 'user-slash' : 'user-check'}"></i>
                    </button>
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
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
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
            },
            body: JSON.stringify({ status: newStatus })
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
            
            showToast(`Coordinator ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
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
    return localStorage.getItem('authToken');
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
