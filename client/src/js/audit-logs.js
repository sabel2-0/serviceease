// Audit Logs Page JavaScript

let currentPage = 1;
let currentFilters = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Verify authentication
    const user = getCurrentUser();
    if (!user || !isLoggedIn()) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Check admin access
    if (user.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/pages/login.html';
        return;
    }

    // Load initial data
    await loadAuditLogs();
    await loadStatistics();

    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadAuditLogs();
        await loadStatistics();
    });

    document.getElementById('applyFiltersBtn').addEventListener('click', async () => {
        const roleValue = document.getElementById('filterRole').value;
        const actionValue = document.getElementById('filterActionType').value;
        
        currentFilters = {
            user_role: roleValue !== '' && roleValue !== 'all' ? roleValue : undefined,
            action_type: actionValue !== '' && actionValue !== 'all' ? actionValue : undefined,
            start_date: document.getElementById('filterStartDate').value || undefined,
            end_date: document.getElementById('filterEndDate').value || undefined,
            search: document.getElementById('filterSearch').value || undefined
        };
        
        // Remove undefined values
        Object.keys(currentFilters).forEach(key => 
            currentFilters[key] === undefined && delete currentFilters[key]
        );
        
        currentPage = 1;
        await loadAuditLogs();
        await loadStatistics();
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', async () => {
        document.getElementById('filterRole').value = '';
        document.getElementById('filterActionType').value = '';
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterSearch').value = '';
        currentFilters = {};
        currentPage = 1;
        await loadAuditLogs();
        await loadStatistics();
    });

    document.getElementById('closeDetailsModal').addEventListener('click', () => {
        document.getElementById('detailsModal').classList.add('hidden');
    });

    // Enter key to search
    document.getElementById('filterSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('applyFiltersBtn').click();
        }
    });
    
    // Keyboard navigation for pagination
    document.addEventListener('keydown', (e) => {
        // Left arrow - previous page
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            changePage(currentPage - 1);
        }
        // Right arrow - next page
        if (e.key === 'ArrowRight') {
            const paginationText = document.querySelector('#paginationContainer span');
            if (paginationText) {
                const match = paginationText.textContent.match(/Page \d+ of (\d+)/);
                if (match && currentPage < parseInt(match[1])) {
                    changePage(currentPage + 1);
                }
            }
        }
    });
}

// Load audit logs
async function loadAuditLogs() {
    try {
        const token = localStorage.getItem('token');
        
        // Build query string
        const params = new URLSearchParams({
            page: currentPage,
            limit: 5,
            ...currentFilters
        });

        const response = await fetch(`${API_URL}/api/audit-logs?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch audit logs');
        }

        const data = await response.json();
        renderAuditLogs(data.logs);
        renderPagination(data.pagination);

    } catch (error) {
        console.error('Error loading audit logs:', error);
        const tbody = document.getElementById('auditLogsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-2"></i>
                    <p class="text-lg text-red-600">Failed to load audit logs</p>
                    <p class="text-sm">${error.message || 'Please try again later'}</p>
                    <button onclick="location.reload()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// Render audit logs table
function renderAuditLogs(logs) {
    const tbody = document.getElementById('auditLogsTableBody');

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p class="text-lg">No audit logs found</p>
                    <p class="text-sm">Try adjusting your filters</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="showDetails(${log.id})">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatDateTime(log.created_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(log.first_name)} ${escapeHtml(log.last_name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(log.email)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${getRoleBadge(log.user_role)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${getActionTypeBadge(log.action_type)}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title="${escapeHtml(log.action)}">
                ${formatAction(log.action, log.action_type, log.target_type)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${log.target_type ? `
                    <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                        ${escapeHtml(log.target_type.replace('_', ' '))} ${log.target_id ? '#' + escapeHtml(log.target_id) : ''}
                    </span>
                ` : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${escapeHtml(log.ip_address || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="event.stopPropagation(); showDetails(${log.id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    const { page, totalPages, total, limit } = pagination;

    // Update showing text
    const showingFrom = (page - 1) * limit + 1;
    const showingTo = Math.min(page * limit, total);
    document.getElementById('showingFrom').textContent = showingFrom;
    document.getElementById('showingTo').textContent = showingTo;
    document.getElementById('totalRecords').textContent = total;

    if (totalPages <= 1) {
        container.innerHTML = `
            <div class="flex items-center justify-center gap-3">
                <span class="text-gray-600 text-sm">Page 1 of 1</span>
            </div>
        `;
        return;
    }

    // Simple pagination with arrows and page count
    container.innerHTML = `
        <div class="flex items-center justify-center gap-3">
            <button 
                onclick="changePage(${page - 1})" 
                ${page === 1 ? 'disabled' : ''}
                class="px-3 py-2 rounded-lg border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                title="Previous page"
            >
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <span class="text-gray-700 font-medium px-4">
                Page ${page} of ${totalPages}
            </span>
            
            <button 
                onclick="changePage(${page + 1})" 
                ${page === totalPages ? 'disabled' : ''}
                class="px-3 py-2 rounded-lg border ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                title="Next page"
            >
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// Change page
window.changePage = async (page) => {
    currentPage = page;
    await loadAuditLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Load statistics
async function loadStatistics() {
    try {
        const token = localStorage.getItem('token');
        
        const params = new URLSearchParams();
        if (currentFilters.start_date) params.append('start_date', currentFilters.start_date);
        if (currentFilters.end_date) params.append('end_date', currentFilters.end_date);

        const response = await fetch(`${API_URL}/api/audit-logs/stats?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch statistics');
        }

        const data = await response.json();
        updateStatistics(data);

    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set stats to 0 on error
        document.getElementById('totalActions').textContent = '0';
        document.getElementById('adminActions').textContent = '0';
        document.getElementById('technicianActions').textContent = '0';
        document.getElementById('operationsActions').textContent = '0';
    }
}

// Update statistics cards
function updateStatistics(data) {
    // Calculate totals
    const totalActions = data.roleStats.reduce((sum, stat) => sum + stat.count, 0);
    const adminActions = data.roleStats.find(s => s.user_role === 'admin')?.count || 0;
    const technicianActions = data.roleStats.find(s => s.user_role === 'technician')?.count || 0;
    const operationsActions = data.roleStats.find(s => s.user_role === 'operations_officer')?.count || 0;

    document.getElementById('totalActions').textContent = totalActions.toLocaleString();
    document.getElementById('adminActions').textContent = adminActions.toLocaleString();
    document.getElementById('technicianActions').textContent = technicianActions.toLocaleString();
    document.getElementById('operationsActions').textContent = operationsActions.toLocaleString();
}

// Show details modal
window.showDetails = async (logId) => {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/audit-logs?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch log details');
        }

        const data = await response.json();
        const log = data.logs.find(l => l.id === logId);

        if (!log) {
            throw new Error('Log not found');
        }

        const detailsContent = document.getElementById('detailsContent');
        let parsedDetails = null;
        try {
            parsedDetails = log.details ? JSON.parse(log.details) : null;
        } catch (e) {
            parsedDetails = log.details;
        }

        detailsContent.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <p class="text-gray-900">${escapeHtml(log.first_name)} ${escapeHtml(log.last_name)} (${escapeHtml(log.email)})</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <p>${getRoleBadge(log.user_role)}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <p>${getActionTypeBadge(log.action_type)}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Action</label>
                    <p class="text-gray-900">${escapeHtml(log.action)}</p>
                </div>

                ${log.target_type ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Target</label>
                        <p class="text-gray-900">${escapeHtml(log.target_type)} #${escapeHtml(log.target_id)}</p>
                    </div>
                ` : ''}

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                    <p class="text-gray-900">${formatDateTime(log.created_at)}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <p class="text-gray-900">${escapeHtml(log.ip_address || 'N/A')}</p>
                </div>

                ${log.user_agent ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                        <p class="text-gray-600 text-sm break-words">${escapeHtml(log.user_agent)}</p>
                    </div>
                ` : ''}

                ${parsedDetails ? formatDetailsSection(parsedDetails) : ''}
            </div>
        `;

        document.getElementById('detailsModal').classList.remove('hidden');

    } catch (error) {
        console.error('Error showing details:', error);
        showError('Failed to load log details');
    }
};

// Format details section to be user-friendly
function formatDetailsSection(details) {
    if (!details) return '';
    
    const sections = [];
    
    // Request Information
    if (details.method || details.path) {
        sections.push(`
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Request Information</label>
                <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                    ${details.method ? `<div class="flex items-center gap-2"><span class="text-xs font-medium text-gray-500 w-20">Method:</span><span class="text-sm text-gray-900">${escapeHtml(details.method)}</span></div>` : ''}
                    ${details.path ? `<div class="flex items-center gap-2"><span class="text-xs font-medium text-gray-500 w-20">Path:</span><span class="text-sm text-gray-900">${escapeHtml(details.path)}</span></div>` : ''}
                </div>
            </div>
        `);
    }
    
    // Parameters
    if (details.params && Object.keys(details.params).length > 0) {
        const paramItems = Object.entries(details.params).map(([key, value]) => 
            `<div class="flex items-start gap-2"><span class="text-xs font-medium text-gray-500 w-32">${escapeHtml(key)}:</span><span class="text-sm text-gray-900">${escapeHtml(String(value))}</span></div>`
        ).join('');
        
        sections.push(`
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Parameters</label>
                <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                    ${paramItems}
                </div>
            </div>
        `);
    }
    
    // Request Body
    if (details.body && Object.keys(details.body).length > 0) {
        const bodyItems = Object.entries(details.body).map(([key, value]) => {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `<div class="flex items-start gap-2"><span class="text-xs font-medium text-gray-500 w-32">${escapeHtml(key)}:</span><span class="text-sm text-gray-900">${escapeHtml(displayValue)}</span></div>`;
        }).join('');
        
        sections.push(`
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Request Data</label>
                <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                    ${bodyItems}
                </div>
            </div>
        `);
    }
    
    // Query Parameters
    if (details.query && Object.keys(details.query).length > 0) {
        const queryItems = Object.entries(details.query).map(([key, value]) => 
            `<div class="flex items-start gap-2"><span class="text-xs font-medium text-gray-500 w-32">${escapeHtml(key)}:</span><span class="text-sm text-gray-900">${escapeHtml(String(value))}</span></div>`
        ).join('');
        
        sections.push(`
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Query Parameters</label>
                <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                    ${queryItems}
                </div>
            </div>
        `);
    }
    
    return sections.join('');
}

// Format action description to be more readable
function formatAction(action, actionType, targetType) {
    // The action field from the backend already contains descriptive text
    // Just return it as-is (e.g., "Approved institutionAdmin registration: John Doe (john@email.com)")
    return escapeHtml(action);
}

// Get role badge HTML
function getRoleBadge(role) {
    const badges = {
        'admin': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Admin</span>',
        'technician': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Technician</span>',
        'operations_officer': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Operations Officer</span>'
    };
    return badges[role] || `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${escapeHtml(role)}</span>`;
}

// Get action type badge HTML
function getActionTypeBadge(actionType) {
    const badges = {
        'login': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><i class="fas fa-sign-in-alt mr-1"></i>Login</span>',
        'logout': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800"><i class="fas fa-sign-out-alt mr-1"></i>Logout</span>',
        'create': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><i class="fas fa-plus mr-1"></i>Create</span>',
        'read': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><i class="fas fa-eye mr-1"></i>Read</span>',
        'update': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"><i class="fas fa-edit mr-1"></i>Update</span>',
        'delete': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><i class="fas fa-trash mr-1"></i>Delete</span>',
        'approve': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><i class="fas fa-check mr-1"></i>Approve</span>',
        'reject': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><i class="fas fa-times mr-1"></i>Reject</span>',
        'assign': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"><i class="fas fa-user-plus mr-1"></i>Assign</span>',
        'complete': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i>Complete</span>'
    };
    return badges[actionType] || `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${escapeHtml(actionType)}</span>`;
}

// Format date time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    alert(message);
}









