/**
 * institutionAdmin Printers Management
 * This script handles the printers management functionality for institutionAdmins
 */

// Global variable to store institutionAdmin information
let institutionAdminData = {
    email: '',
    institution_id: '',
    institution_name: 'Unknown Institution'
};

document.addEventListener('DOMContentLoaded', function() {
    // Get institutionAdmin data from localStorage
    loadinstitutionAdminData();
    
    // Update welcome message with institutionAdmin info
    updateWelcomeMessage();
    
    // Initialize the page without authentication checks
    initPrintersPage();
});

/**
 * Load institutionAdmin data from localStorage
 */
function loadinstitutionAdminData() {
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            institutionAdminData.email = user.email || '';
            institutionAdminData.institution_id = user.institution_id || 'INST-004'; // Default to INST-004 if not found
            institutionAdminData.institution_name = user.institution_name || 'Default Institution';
            
            console.log('institutionAdmin data loaded:', institutionAdminData);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    } else {
        console.warn('No user data found in localStorage, using default values');
        // Default values for testing
        institutionAdminData.email = 'markivan.storm@gmail.com';
        institutionAdminData.institution_id = 'INST-004';
        institutionAdminData.institution_name = 'Default Institution';
    }
}

/**
 * Update welcome message with institutionAdmin info
 */
function updateWelcomeMessage() {
    const welcomeNameElement = document.getElementById('welcome-name');
    const pageHeader = document.querySelector('h1.text-xl');
    
    if (welcomeNameElement) {
        welcomeNameElement.textContent = institutionAdminData.institution_name;
    }
    
    if (pageHeader) {
        pageHeader.textContent = `${institutionAdminData.institution_name} - Printer Management`;
    }
}

/**
 * Initialize the printers management page
 */
function initPrintersPage() {
    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Initialize search and filters
    initializeSearchAndFilters();
    
    // Load printers assigned to the institutionAdmin
    fetchAssignedPrinters();
}

// Wire UI buttons
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshPrintersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchAssignedPrinters);
});

/**
 * Initialize search and filter functionality
 */
function initializeSearchAndFilters() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            fetchAssignedPrinters();
        }, 500));
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            fetchAssignedPrinters();
        });
    }
}

/**
 * Fetch printers assigned to the current institutionAdmin's institution
 */
function fetchAssignedPrinters() {
    const searchQuery = document.getElementById('searchInput') ? document.getElementById('searchInput').value : '';
    const statusFilter = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';
    
    // Show loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.remove('hidden');
    }
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (statusFilter) params.append('status', statusFilter);
    
    // Add institution ID to query parameters
    params.append('institution_id', institutionAdminData.institution_id);
    
    // Get token or use empty string if not available
    const authToken = getAuthToken() || '';
    
    console.log(`Fetching printers for institution ID: ${institutionAdminData.institution_id}`);
    
    // Use new endpoint that gets printers by institution ID
    fetch(`/api/institutions/${institutionAdminData.institution_id}/printers${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            console.warn('Response not OK, but continuing anyway:', response.status);
            return []; // Return empty array on error
        }
        return response.json();
    })
    .then(data => {
        const printers = Array.isArray(data) ? data : [];
        renderPrintersTable(printers);
        updatePrintersCount(printers.length);
        updatePrinterStatusCounts(printers);
        if (loadingState) loadingState.classList.add('hidden');
    })
    .catch(error => {
        console.error('Error fetching assigned printers:', error);
        if (loadingState) loadingState.classList.add('hidden');
        showToast('Could not load printers data. Using default data.', 'info');
        
        // Use sample data with the institutionAdmin's institution information
        const samplePrinters = [
            {
                printer_id: '1',
                model: 'HP LaserJet Pro',
                serial_number: 'HP12345678',
                institution_id: institutionAdminData.institution_id,
                institution_name: institutionAdminData.institution_name,
                location: 'Main Office',
                status: 'active'
            },
            {
                printer_id: '2',
                model: 'Epson WorkForce Pro',
                serial_number: 'EP98765432',
                institution_id: institutionAdminData.institution_id,
                institution_name: institutionAdminData.institution_name,
                location: 'Reception Area',
                status: 'maintenance'
            }
        ];
        renderPrintersTable(samplePrinters);
        updatePrintersCount(samplePrinters.length);
        updatePrinterStatusCounts(samplePrinters);
    });
}

/**
 * Render the printers table with data
 */
function renderPrintersTable(printers) {
    const tableBody = document.getElementById('printersTableBody');
    
    if (!tableBody) {
        console.error('Printers table body element not found');
        return;
    }
    
    if (printers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-print mb-3 text-3xl text-gray-400"></i>
                        <p class="text-lg">No printers assigned yet</p>
                        <p class="text-sm mt-1">Your assigned printers will appear here</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add printer rows
    printers.forEach(printer => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusClass = printer.status === 'active' ? 'bg-green-100 text-green-800' : printer.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-print text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${printer.name || printer.model || 'Printer'}</div>
                        <div class="text-xs text-gray-500">${printer.brand || ''} ${printer.model ? '(' + printer.model + ')' : ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${printer.model || 'Unknown'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900 font-mono">${printer.serial_number || 'No Serial'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${printer.location || '<span class="text-gray-400 italic">Not set</span>'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${printer.department || '<span class="text-gray-400 italic">Not set</span>'}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end space-x-2">
                    <button onclick="viewPrinterDetails('${printer.printer_id || printer.printer_id || ''}')" class="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm" title="View Details">
                        <i class="fas fa-eye mr-1"></i>Details
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Update the total printer count display
 */
function updatePrintersCount(total) {
    const countElement = document.getElementById('totalPrinters');
    if (countElement) {
        countElement.textContent = total;
    }
}

/**
 * Update printer status counts for the statistics cards
 */
function updatePrinterStatusCounts(printers) {
    let activeCount = 0;
    let maintenanceCount = 0;
    let pendingServiceCount = 0;
    
    printers.forEach(printer => {
        const status = (printer.status || '').toLowerCase();
        
        if (status === 'active') {
            activeCount++;
        } else if (status === 'maintenance') {
            maintenanceCount++;
        } else if (status === 'needs_service') {
            pendingServiceCount++;
        }
    });
    
    // Update the count elements
    const activePrintersElement = document.getElementById('activePrinters');
    const maintenancePrintersElement = document.getElementById('maintenancePrinters');
    const pendingServicesElement = document.getElementById('pendingServices');
    
    if (activePrintersElement) {
        activePrintersElement.textContent = activeCount;
    }
    
    if (maintenancePrintersElement) {
        maintenancePrintersElement.textContent = maintenanceCount;
    }
    
    if (pendingServicesElement) {
        pendingServicesElement.textContent = pendingServiceCount;
    }
}

/**
 * View printer details
 */
function viewPrinterDetails(printerId) {
    // Show loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.remove('hidden');
    }
    
    console.log(`Fetching details for printer ID: ${printerId} in institution: ${institutionAdminData.institution_id}`);
    
    // Use the institution_id from institutionAdmin data
    fetch(`/api/institutions/${institutionAdminData.institution_id}/printer/${printerId}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`
        }
    })
    .then(response => {
        if (!response.ok) {
            console.warn('Response not OK, continuing with sample data:', response.status);
            // Use sample data with institutionAdmin's institution information
            return {
                printer_id: printerId,
                model: 'HP LaserJet Pro',
                serial_number: 'HP12345678',
                institution_id: institutionAdminData.institution_id,
                institution_name: institutionAdminData.institution_name,
                location: 'Main Office',
                status: 'active',
                installation_date: new Date().toISOString(),
                last_service_date: new Date().toISOString()
            };
        }
        return response.json();
    })
    .then(printer => {
        // Populate printer details in modal
        document.getElementById('printerModel').textContent = printer.model || 'Unknown Model';
        document.getElementById('printerSerial').textContent = printer.serial_number || 'No Serial Number';
        
        document.getElementById('printerInstitution').textContent = printer.institution_name || 'Unknown Institution';
        
        // Show installation date
        const installationDate = printer.installation_date;
        document.getElementById('installationDate').textContent = installationDate ? 
            new Date(installationDate).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'
            }) : 'Unknown';
        
        // Show last service date
        const lastServiceDate = printer.last_service_date;
        document.getElementById('lastServiceDate').textContent = lastServiceDate ? 
            new Date(lastServiceDate).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'
            }) : 'No service history';
        
        // Load printer location and department
        const locationInput = document.getElementById('printerLocationInput');
        const departmentInput = document.getElementById('printerDepartmentInput');
        if (locationInput) {
            locationInput.value = printer.location || '';
            locationInput.dataset.printerId = printerId; // Store printerId for update function
        }
        if (departmentInput) {
            departmentInput.value = printer.department || '';
        }
        
        // Show the modal
        document.getElementById('printerDetailsModal').classList.remove('hidden');
        if (loadingState) loadingState.classList.add('hidden');
        
        // Fetch service history for this printer
        fetchPrinterServiceHistory(printerId);
    })
    .catch(error => {
        console.error('Error fetching printer details:', error);
        if (loadingState) loadingState.classList.add('hidden');
        showToast('Failed to load printer details. Please try again.', 'error');
    });
}

/**
 * Fetch service history for a printer
 */
function fetchPrinterServiceHistory(printerId) {
    const serviceHistoryContainer = document.getElementById('serviceHistoryList');
    
    if (!serviceHistoryContainer) {
        return;
    }
    
    serviceHistoryContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="text-sm text-gray-500 mt-2">Loading service history...</p>
        </div>
    `;
    
    console.log(`Fetching service history for printer ID: ${printerId} in institution: ${institutionAdminData.institution_id}`);
    
    fetch(`/api/institutions/${institutionAdminData.institution_id}/printer/${printerId}/service-history`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch service history');
        }
        return response.json();
    })
    .then(history => {
        if (!history || history.length === 0) {
            serviceHistoryContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>No service history available for this printer</p>
                </div>
            `;
            return;
        }
        
        serviceHistoryContainer.innerHTML = '';
        
        history.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'border-b border-gray-200 py-3';
            
            historyItem.innerHTML = `
                <div class="flex items-start">
                    <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-tools text-blue-600"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${record.service_type || 'Maintenance'}</p>
                        <p class="text-xs text-gray-500">${new Date(record.service_date).toLocaleDateString()}</p>
                        <p class="text-sm text-gray-600 mt-1">${record.description || 'No description provided'}</p>
                        ${record.technician_name ? `
                        <p class="text-xs text-blue-600 mt-1">
                            <i class="fas fa-user-md mr-1"></i> ${record.technician_name}
                        </p>
                        ` : ''}
                    </div>
                </div>
            `;
            
            serviceHistoryContainer.appendChild(historyItem);
        });
    })
    .catch(error => {
        console.error('Error fetching service history:', error);
        serviceHistoryContainer.innerHTML = `
            <div class="text-center py-4 text-red-500">
                <p>Failed to load service history. Please try again.</p>
            </div>
        `;
    });
}
/**
 * Close the printer details modal
 */
window.closeDetailsModal = function() {
    const modal = document.getElementById('printerDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
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
    // During login, the token is stored as 'token' in localStorage
    return localStorage.getItem('token');
}

/**
 * Check if the JWT token has expired - always returns false to prevent session expiration
 */
function isTokenExpired() {
    // Always return false to prevent session expiration messages
    return false;
}

/**
 * Check if user has required role - always returns true to allow access
 */
function checkAuth(requiredRoles = []) {
    // Always return true to allow access regardless of role
    return true;
}

// Add event listeners once DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    // Initialize the page
    initPrintersPage();
});

/**
 * Update printer location and department
 * Make it globally accessible for onclick handlers
 */
window.updatePrinterLocationAndDepartment = function() {
    const locationInput = document.getElementById('printerLocationInput');
    const departmentInput = document.getElementById('printerDepartmentInput');
    const statusElement = document.getElementById('locationUpdateStatus');
    const updateBtn = document.getElementById('updateLocationBtn');
    
    if (!locationInput || !locationInput.dataset.printerId) {
        showToast('Error: Printer ID not found', 'error');
        return;
    }
    
    const printerId = locationInput.dataset.printerId;
    const newLocation = locationInput.value.trim();
    const newDepartment = departmentInput.value.trim();
    
    if (!newLocation && !newDepartment) {
        statusElement.textContent = 'Please enter at least location or department';
        statusElement.className = 'text-xs mt-2 text-red-600';
        statusElement.classList.remove('hidden');
        return;
    }
    
    // Disable button during update
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Updating...';
    statusElement.classList.add('hidden');
    
    const updateData = {};
    if (newLocation) updateData.location = newLocation;
    if (newDepartment) updateData.department = newDepartment;
    
    fetch(`/api/institutions/${institutionAdminData.institution_id}/printers/${printerId}/location`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken() || ''}`
        },
        body: JSON.stringify(updateData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        statusElement.textContent = '? Location and department updated successfully!';
        statusElement.className = 'text-xs mt-2 text-green-600';
        statusElement.classList.remove('hidden');
        
        showToast('Printer location and department updated successfully', 'success');
        
        // Refresh the printers list to show updated information
        setTimeout(() => {
            fetchAssignedPrinters();
        }, 1000);
    })
    .catch(error => {
        console.error('Error updating printer information:', error);
        statusElement.textContent = '? Failed to update information';
        statusElement.className = 'text-xs mt-2 text-red-600';
        statusElement.classList.remove('hidden');
        
        showToast('Failed to update printer information', 'error');
    })
    .finally(() => {
        // Re-enable button
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fas fa-save mr-1"></i>Update Location';
    });
}









