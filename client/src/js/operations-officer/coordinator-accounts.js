// Coordinator Accounts Management for Operations Officer
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    loadSidebar('operations-officer');
    initializeCoordinatorAccounts();
});

let currentCoordinator = null;

async function initializeCoordinatorAccounts() {
    try {
        await setupEventListeners();
        await loadCoordinatorAccounts();
    } catch (error) {
        console.error('Error initializing coordinator accounts:', error);
        showError('Failed to initialize the page. Please try again.');
    }
}

function setupEventListeners() {
    // Search input listener
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Status filter listener
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', handleStatusFilter);
}

async function loadCoordinatorAccounts(searchQuery = '', statusFilter = '') {
    showLoading(true);
    try {
        const response = await fetch('/api/operations-officer/coordinators?' + new URLSearchParams({
            search: searchQuery,
            status: statusFilter
        }), {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch coordinator accounts');
        
        const coordinators = await response.json();
        renderCoordinatorTable(coordinators);
        updatePagination(coordinators.length);
    } catch (error) {
        console.error('Error loading coordinator accounts:', error);
        showError('Failed to load coordinator accounts. Please try again.');
    } finally {
        showLoading(false);
    }
}

function renderCoordinatorTable(coordinators) {
    const tableBody = document.getElementById('coordinatorTableBody');
    tableBody.innerHTML = '';

    coordinators.forEach(coordinator => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user-tie text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(coordinator.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(coordinator.email)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${escapeHtml(coordinator.organization)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    coordinator.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }">
                    ${coordinator.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewCoordinatorDetails('${coordinator.id}')" 
                    class="text-blue-600 hover:text-blue-900 mr-4">
                    View Details
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function viewCoordinatorDetails(coordinatorId) {
    showLoading(true);
    try {
        const response = await fetch(`/api/operations-officer/coordinators/${coordinatorId}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch coordinator details');
        
        currentCoordinator = await response.json();
        displayCoordinatorDetails();
        showDetailsModal();
    } catch (error) {
        console.error('Error loading coordinator details:', error);
        showError('Failed to load coordinator details. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayCoordinatorDetails() {
    if (!currentCoordinator) return;

    document.getElementById('coordinatorName').textContent = currentCoordinator.name;
    document.getElementById('coordinatorEmail').textContent = currentCoordinator.email;
    document.getElementById('orgName').textContent = currentCoordinator.organization;
    document.getElementById('regDate').textContent = new Date(currentCoordinator.registrationDate).toLocaleDateString();

    const statusElement = document.getElementById('coordinatorStatus');
    statusElement.textContent = currentCoordinator.status === 'active' ? 'Active' : 'Inactive';
    statusElement.className = `px-2 py-1 text-xs rounded-full ${
        currentCoordinator.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
    }`;

    const toggleBtn = document.getElementById('toggleStatusBtn');
    toggleBtn.textContent = currentCoordinator.status === 'active' ? 'Deactivate Account' : 'Activate Account';
    toggleBtn.className = `px-4 py-2 rounded-md ${
        currentCoordinator.status === 'active'
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-green-500 text-white hover:bg-green-600'
    }`;
}

async function toggleAccountStatus() {
    if (!currentCoordinator) return;

    const newStatus = currentCoordinator.status === 'active' ? 'inactive' : 'active';
    const confirmMessage = `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this coordinator account?`;
    
    if (!confirm(confirmMessage)) return;

    showLoading(true);
    try {
        const response = await fetch(`/api/operations-officer/coordinators/${currentCoordinator.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update account status');

        currentCoordinator.status = newStatus;
        displayCoordinatorDetails();
        await loadCoordinatorAccounts(
            document.getElementById('searchInput').value,
            document.getElementById('statusFilter').value
        );
        showSuccess(`Coordinator account successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
        console.error('Error updating account status:', error);
        showError('Failed to update account status. Please try again.');
    } finally {
        showLoading(false);
    }
}

// UI Helper Functions
function showDetailsModal() {
    document.getElementById('detailsModal').classList.remove('hidden');
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
    currentCoordinator = null;
}

function showLoading(show) {
    document.getElementById('loadingState').classList.toggle('hidden', !show);
}

function updatePagination(totalResults) {
    document.getElementById('totalResults').textContent = totalResults;
}

// Event Handler Functions
function handleSearch(event) {
    loadCoordinatorAccounts(
        event.target.value,
        document.getElementById('statusFilter').value
    );
}

function handleStatusFilter(event) {
    loadCoordinatorAccounts(
        document.getElementById('searchInput').value,
        event.target.value
    );
}

// Utility Functions
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

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showError(message) {
    // Implement error notification UI
    console.error(message);
}

function showSuccess(message) {
    // Implement success notification UI
    console.log(message);
}
