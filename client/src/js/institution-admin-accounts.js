/**
 * institutionAdmin Accounts Management - Admin View
 * This script handles the institutionAdmin accounts page in the admin section
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
let allinstitutionAdmins = [];

/**
 * Get current user's role
 */
function getUserRole() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role;
}

/**
 * Initialize the page and load institutionAdmins
 */
function initPage() {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Initialize search and filters
    initializeSearchAndFilters();
    
    // Load institutionAdmins data
    fetchinstitutionAdmins();
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
    
    // Filter and render institutionAdmins based on tab
    filterAndRenderinstitutionAdmins();
}

/**
 * Filter and render institutionAdmins based on current tab and search
 */
function filterAndRenderinstitutionAdmins() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredinstitutionAdmins = allinstitutionAdmins;
    
    // Filter by tab
    if (currentTab === 'active') {
        filteredinstitutionAdmins = allinstitutionAdmins.filter(coord => coord.status === 'active');
    } else if (currentTab === 'inactive') {
        filteredinstitutionAdmins = allinstitutionAdmins.filter(coord => coord.status === 'inactive');
    }
    
    // Filter by search query
    if (searchQuery) {
        filteredinstitutionAdmins = filteredinstitutionAdmins.filter(coord => 
            coord.first_name.toLowerCase().includes(searchQuery) ||
            coord.last_name.toLowerCase().includes(searchQuery) ||
            coord.email.toLowerCase().includes(searchQuery) ||
            (coord.institution && coord.institution.toLowerCase().includes(searchQuery))
        );
    }
    
    renderinstitutionAdminTable(filteredinstitutionAdmins);
    updateCounts();
}

/**
 * Update status counters
 */
function updateCounts() {
    const activeCount = allinstitutionAdmins.filter(coord => coord.status === 'active').length;
    const inactiveCount = allinstitutionAdmins.filter(coord => coord.status === 'inactive').length;
    
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('inactiveCount').textContent = inactiveCount;
}

/**
 * Refresh institutionAdmins list
 */
function refreshinstitutionAdmins() {
    fetchinstitutionAdmins();
}

/**
 * Initialize search and filter functionality
 */
function initializeSearchAndFilters() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            fetchinstitutionAdmins();
        }, 500));
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            fetchinstitutionAdmins();
        });
    }
}

/**
 * Fetch institutionAdmins from the server
 */
function fetchinstitutionAdmins() {
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
    
    // API call to get approved institutionAdmins only
    fetch(`/api/institution_admins`, {
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
                throw new Error(`Failed to fetch institutionAdmins: ${errorData.error || response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Received data:', data);
        // Store all institutionAdmins
        allinstitutionAdmins = Array.isArray(data) ? data : [];
        console.log('Stored institutionAdmins:', allinstitutionAdmins.length);
        
        // Filter and render based on current tab
        filterAndRenderinstitutionAdmins();
        
        document.getElementById('loadingState').classList.add('hidden');
    })
    .catch(error => {
        console.error('Error fetching institutionAdmins:', error);
        document.getElementById('loadingState').classList.add('hidden');
        
        // Check if it's an authentication error
        if (error.message.includes('401') || error.message.includes('jwt') || !getAuthToken()) {
            console.log('Authentication error detected, redirecting to login');
            localStorage.clear(); // Clear any invalid tokens
            window.location.href = '/pages/login.html';
            return;
        }
        
        showToast('Failed to load institutionAdmins. Please try again.', 'error');
        
        // Show empty state
        const tableBody = document.getElementById('institutionAdminTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-exclamation-triangle mb-3 text-3xl text-red-400"></i>
                            <p class="text-lg">Failed to load institutionAdmins</p>
                            <p class="text-sm mt-1">Please refresh the page or try again</p>
                            <button onclick="fetchinstitutionAdmins()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
 * Render the institutionAdmin table with data
 */
function renderinstitutionAdminTable(institutionAdmins) {
    const tableBody = document.getElementById('institutionAdminTableBody');
    
    if (!tableBody) {
        console.error('institutionAdmin table body element not found');
        return;
    }
    
    if (institutionAdmins.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search mb-3 text-3xl text-gray-400"></i>
                        <p class="text-lg">No institutionAdmins found</p>
                        <p class="text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add institutionAdmin rows
    institutionAdmins.forEach(institutionAdmin => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusClass = institutionAdmin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        
        // Format names from database fields (first_name, last_name) to camelCase for display
        const firstName = institutionAdmin.first_name || institutionAdmin.firstName || '';
        const lastName = institutionAdmin.last_name || institutionAdmin.lastName || '';
        
        // Get organization name and handle display better
        const institution = institutionAdmin.institution || institutionAdmin.organizationName || '';
        const institutionDisplay = institution || 'No Organization';
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-user-tie text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${firstName} ${lastName}</div>
                        <div class="text-sm text-gray-500">${institutionAdmin.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <div class="text-sm font-medium text-gray-900">${institutionDisplay}</div>
                    ${institutionAdmin.phone ? `
                    <div class="text-xs text-blue-600 mt-1">
                        <i class="fas fa-phone-alt mr-1"></i> ${institutionAdmin.phone}
                    </div>
                    ` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${institutionAdmin.status}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end space-x-3">
                    <button onclick="viewinstitutionAdminDetails('${institutionAdmin.id}')" class="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${getUserRole() === 'admin' ? `
                        <button onclick="changeinstitutionAdminPassword('${institutionAdmin.id}')" class="p-2 action-password rounded-lg" title="Change Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="toggleinstitutionAdminStatus('${institutionAdmin.id}', '${institutionAdmin.status}')" 
                            class="p-2 ${institutionAdmin.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg"
                            title="${institutionAdmin.status === 'active' ? 'Deactivate Account' : 'Activate Account'}">
                            <i class="fas fa-${institutionAdmin.status === 'active' ? 'user-slash' : 'user-check'}"></i>
                        </button>
                    ` : `
                        <button class="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed" title="Requires admin privileges" disabled>
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed" title="Requires admin privileges" disabled>
                            <i class="fas fa-${institutionAdmin.status === 'active' ? 'user-slash' : 'user-check'}"></i>
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
 * View institutionAdmin details
 */
function viewinstitutionAdminDetails(institutionAdminId) {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    
    fetch(`/api/institution_admins/${institutionAdminId}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch institutionAdmin details');
        }
        return response.json();
    })
    .then(institutionAdmin => {
        // Extract fields with proper naming, handling both camelCase and snake_case
        const firstName = institutionAdmin.first_name || institutionAdmin.firstName || '';
        const lastName = institutionAdmin.last_name || institutionAdmin.lastName || '';
        
        // Populate institutionAdmin details in modal
        document.getElementById('institutionAdminName').textContent = `${firstName} ${lastName}`;
        document.getElementById('institutionAdminEmail').textContent = institutionAdmin.email;
        
        const statusElem = document.getElementById('institutionAdminStatus');
        statusElem.textContent = institutionAdmin.status || 'active';
        statusElem.className = `px-2 py-1 text-xs rounded-full ${(institutionAdmin.status === 'active' || !institutionAdmin.status) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        
        // Show only institution name
        document.getElementById('orgName').textContent = institutionAdmin.institution || institutionAdmin.institution_name || 'No institution specified';
        
        // Show registration date
        const createdAt = institutionAdmin.created_at || institutionAdmin.createdAt;
        document.getElementById('regDate').textContent = createdAt ? 
            new Date(createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'
            }) : 'Unknown';
        
        // Toggle status button text and style
        const status = institutionAdmin.status || 'active';
        const toggleStatusBtn = document.getElementById('toggleStatusBtn');
        toggleStatusBtn.textContent = status === 'active' ? 'Deactivate Account' : 'Activate Account';
        toggleStatusBtn.className = `px-4 py-2 ${status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-md`;
        toggleStatusBtn.onclick = function() {
            toggleinstitutionAdminStatus(institutionAdmin.id, status);
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
        console.error('Error fetching institutionAdmin details:', error);
        document.getElementById('loadingState').classList.add('hidden');
        showToast('Failed to load institutionAdmin details. Please try again.', 'error');
    });
}

/**
 * Fetch technicians assigned to a institutionAdmin
 */
function fetchAssignedTechnicians(institutionAdminId) {
    // Display a "Not implemented yet" message since the API endpoint doesn't exist
    document.getElementById('assignedTechniciansList').innerHTML = `
        <div class="text-center py-4 text-gray-500">
            <p>No technicians assigned to this institutionAdmin</p>
            <p class="text-xs mt-1">Technician assignments feature coming soon</p>
        </div>
    `;
    
    /* 
    // Keep this code commented out until the API endpoint is implemented
    fetch(`/api/institution_admins/${institutionAdminId}/technicians`, {
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
                    <p>No technicians assigned to this institutionAdmin</p>
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
 * Toggle institutionAdmin account status (active/inactive)
 */
function toggleinstitutionAdminStatus(institutionAdminId, currentStatus) {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    const confirmMsg = currentStatus === 'active' 
        ? 'Are you sure you want to deactivate this institutionAdmin account?' 
        : 'Are you sure you want to activate this institutionAdmin account?';
    
    if (confirm(confirmMsg)) {
        document.getElementById('loadingState').classList.remove('hidden');
        
        fetch(`/api/institution_admins/${institutionAdminId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update institutionAdmin status');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('loadingState').classList.add('hidden');
            
            // Close modal if open
            closeDetailsModal();
            
            // Refresh institutionAdmins list
            fetchinstitutionAdmins();
            
            // Show appropriate toast based on action
            const toastType = action === 'activate' ? 'success' : 'info';
            const toastMessage = data.message || `Institution Admin ${action}d successfully`;
            showToast(toastMessage, toastType);
        })
        .catch(error => {
            console.error('Error updating institutionAdmin status:', error);
            document.getElementById('loadingState').classList.add('hidden');
            showToast('Failed to update institutionAdmin status. Please try again.', 'error');
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
 * Change institutionAdmin Password Functions
 */
window.changeinstitutionAdminPassword = function(institutionAdminId) {
    console.log('changeinstitutionAdminPassword called with ID:', institutionAdminId);
    console.log('All institutionAdmins:', allinstitutionAdmins);
    
    const institutionAdmin = allinstitutionAdmins.find(c => String(c.id) === String(institutionAdminId));
    if (!institutionAdmin) {
        console.error('institutionAdmin not found with ID:', institutionAdminId);
        showToast('institutionAdmin not found', 'error');
        return;
    }

    console.log('Found institutionAdmin:', institutionAdmin);

    // Populate modal with institutionAdmin info
    document.getElementById('changePasswordinstitutionAdminId').value = institutionAdmin.id;
    document.getElementById('changePasswordinstitutionAdminName').textContent = `${institutionAdmin.first_name || institutionAdmin.firstName} ${institutionAdmin.last_name || institutionAdmin.lastName}`;
    document.getElementById('changePasswordinstitutionAdminEmail').textContent = institutionAdmin.email;
    
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
    
    const institutionAdminId = document.getElementById('changePasswordinstitutionAdminId').value;
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
        const response = await fetch(`/api/admin/institutionAdmins/${institutionAdminId}/password`, {
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





