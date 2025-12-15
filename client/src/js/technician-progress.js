// Technician Progress Tracking
const API_BASE_URL = '';
let allTechnicians = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTechnicianProgress();
    setupSearch();
});

async function loadTechnicianProgress() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/technician-progress`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load technician progress');
        }

        const data = await response.json();
        allTechnicians = data.technicians || [];
        
        updateSummaryCards(data.summary);
        renderTechniciansTable(allTechnicians);
        
    } catch (error) {
        console.error('Error loading technician progress:', error);
        showToast('Failed to load data', 'error');
    }
}

function updateSummaryCards(summary) {
    document.getElementById('totalTechnicians').textContent = summary.totalTechnicians || 0;
    document.getElementById('totalInProgress').textContent = summary.totalInProgress || 0;
    document.getElementById('totalPendingApproval').textContent = summary.totalPendingApproval || 0;
    document.getElementById('totalCompleted').textContent = summary.totalCompleted || 0;
}

function renderTechniciansTable(technicians) {
    const tbody = document.getElementById('techniciansTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!technicians || technicians.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = technicians.map(tech => {
        const completionRate = tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0;
        const statusColor = getStatusColor(completionRate);
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-800">${escapeHtml(tech.first_name + ' ' + tech.last_name)}</p>
                            <p class="text-sm text-slate-500">${escapeHtml(tech.email)}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded-full font-semibold">
                        ${tech.total}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                        ${tech.pending}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                        ${tech.in_progress}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                        ${tech.pending_approval}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex flex-col items-center gap-1">
                        <span class="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                            ${tech.completed}
                        </span>
                        <div class="w-full bg-slate-200 rounded-full h-2">
                            <div class="h-2 rounded-full ${statusColor}" style="width: ${completionRate}%"></div>
                        </div>
                        <span class="text-xs text-slate-500">${completionRate}%</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="viewTechnicianDetails(${tech.id})" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                        <i class="fas fa-eye mr-2"></i>View Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusColor(rate) {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-blue-500';
    if (rate >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
}

async function viewTechnicianDetails(technicianId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/technician-progress/${technicianId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load technician details');
        }

        const data = await response.json();
        displayTechnicianDetails(data);
        
    } catch (error) {
        console.error('Error loading technician details:', error);
        showToast('Failed to load details', 'error');
    }
}

function displayTechnicianDetails(data) {
    const { technician, requests } = data;
    
    document.getElementById('modalTechnicianName').textContent = 
        `${technician.first_name} ${technician.last_name}`;

    const content = document.getElementById('detailsContent');
    
    // Group requests by status
    const grouped = {
        pending: requests.filter(r => r.status === 'pending'),
        in_progress: requests.filter(r => r.status === 'in_progress'),
        pending_approval: requests.filter(r => r.status === 'pending_approval'),
        completed: requests.filter(r => r.status === 'completed')
    };

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Technician Info -->
            <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p class="text-sm text-blue-600 font-medium">Email</p>
                        <p class="text-slate-800">${escapeHtml(technician.email)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-blue-600 font-medium">Total Requests</p>
                        <p class="text-2xl font-bold text-slate-800">${requests.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-blue-600 font-medium">Completed</p>
                        <p class="text-2xl font-bold text-green-600">${grouped.completed.length}</p>
                    </div>
                    <div>
                        <p class="text-sm text-blue-600 font-medium">Completion Rate</p>
                        <p class="text-2xl font-bold text-blue-600">
                            ${requests.length > 0 ? Math.round((grouped.completed.length / requests.length) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            <!-- Tabs for different statuses -->
            <div class="border-b border-slate-200">
                <nav class="flex space-x-4">
                    <button onclick="switchTab('all')" class="status-tab px-4 py-2 font-medium border-b-2 border-blue-600 text-blue-600">
                        All (${requests.length})
                    </button>
                    <button onclick="switchTab('pending')" class="status-tab px-4 py-2 font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-800">
                        Pending (${grouped.pending.length})
                    </button>
                    <button onclick="switchTab('in_progress')" class="status-tab px-4 py-2 font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-800">
                        In Progress (${grouped.in_progress.length})
                    </button>
                    <button onclick="switchTab('pending_approval')" class="status-tab px-4 py-2 font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-800">
                        Pending Approval (${grouped.pending_approval.length})
                    </button>
                    <button onclick="switchTab('completed')" class="status-tab px-4 py-2 font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-800">
                        Completed (${grouped.completed.length})
                    </button>
                </nav>
            </div>

            <!-- Requests List -->
            <div id="requestsList">
                ${renderRequestsList(requests, 'all')}
            </div>
        </div>
    `;

    // Store grouped data for tab switching
    window.currentTechnicianRequests = grouped;
    window.allTechnicianRequests = requests;
    
    document.getElementById('detailsModal').classList.remove('hidden');
}

function renderRequestsList(requests, filter = 'all') {
    if (!requests || requests.length === 0) {
        return `
            <div class="text-center py-12">
                <i class="fas fa-inbox text-6xl text-slate-300 mb-4"></i>
                <p class="text-slate-500">No requests found</p>
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            ${requests.map(req => `
                <div class="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-semibold text-slate-800">
                                    Request #${req.id} - ${req.is_walk_in ? (req.walk_in_printer_brand || 'Unknown') : (req.printer_brand || 'Unknown')} ${req.printer_model || ''}
                                </h4>
                                ${req.is_walk_in ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">Walk-In</span>' : '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">Institution</span>'}
                            </div>
                            <p class="text-sm text-slate-600 mb-2">${escapeHtml(req.description || req.issue)}</p>
                            <div class="flex flex-wrap gap-3 text-xs">
                                ${req.location ? `<span class="text-slate-500"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(req.location)}</span>` : ''}
                                ${req.printer_department ? `<span class="text-slate-500"><i class="fas fa-building mr-1"></i>${escapeHtml(req.printer_department)}</span>` : ''}
                            </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(req.status)}">
                            ${formatStatus(req.status)}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                            <p class="text-slate-500">Priority</p>
                            <p class="font-medium text-slate-800 capitalize">${req.priority}</p>
                        </div>
                        <div>
                            <p class="text-slate-500">Created</p>
                            <p class="font-medium text-slate-800">${formatDate(req.created_at)}</p>
                        </div>
                        ${req.is_walk_in ? `
                        <div>
                            <p class="text-slate-500">Customer</p>
                            <p class="font-medium text-slate-800">${escapeHtml(req.walk_in_customer_name || 'N/A')}</p>
                        </div>
                        <div>
                            <p class="text-slate-500">Submitted By</p>
                            <p class="font-medium text-slate-800">${req.institution_user_first_name ? escapeHtml(req.institution_user_first_name + ' ' + req.institution_user_last_name) : 'N/A'}</p>
                            ${req.user_role ? `<p class="text-xs text-slate-500 capitalize">${req.user_role.replace('_', ' ')}</p>` : ''}
                        </div>
                        ` : `
                        <div>
                            <p class="text-slate-500">Institution</p>
                            <p class="font-medium text-slate-800">${escapeHtml(req.institution_name || 'N/A')}</p>
                        </div>
                        <div>
                            <p class="text-slate-500">Requested By</p>
                            <p class="font-medium text-slate-800">${req.institution_user_first_name ? escapeHtml(req.institution_user_first_name + ' ' + req.institution_user_last_name) : 'N/A'}</p>
                            ${req.user_role ? `<p class="text-xs text-slate-500 capitalize">${req.user_role.replace('_', ' ')}</p>` : ''}
                        </div>
                        `}
                        ${req.resolution_notes || (req.approved_by_first_name && req.approved_by_last_name) ? `
                        <div class="col-span-2 md:col-span-4">
                            <p class="text-slate-500">Resolution Notes</p>
                            ${req.approved_by_first_name && req.approved_by_last_name ? `
                            <p class="font-semibold text-green-700 mb-1">
                                Approved by: <span class="capitalize">${req.approver_role || 'Staff'}</span> - ${escapeHtml(req.approved_by_first_name + ' ' + req.approved_by_last_name)}
                            </p>
                            ` : ''}
                            ${req.resolution_notes ? `
                            <p class="font-medium text-slate-800">${escapeHtml(req.resolution_notes)}</p>
                            ` : ''}
                        </div>
                        ` : ''}
                        ${req.items_used && req.items_used.length > 0 ? `
                        <div class="col-span-2 md:col-span-4">
                            <p class="text-slate-500 mb-2">Items Used</p>
                            <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                ${req.items_used.map(part => `
                                    <div class="flex items-center justify-between py-2 border-b border-slate-200 last:border-b-0">
                                        <div class="flex flex-col">
                                            <span class="font-medium text-slate-700">${escapeHtml(part.part_name)}</span>
                                            ${part.brand ? `<span class="text-xs text-slate-500">Brand: ${escapeHtml(part.brand)}</span>` : ''}
                                            ${part.category ? `<span class="text-xs text-slate-500">Category: ${escapeHtml(part.category)}</span>` : ''}
                                        </div>
                                        <span class="text-slate-600 font-semibold">Qty: ${part.quantity_used} ${part.unit || 'pcs'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        ${req.completion_photo_url ? `
                        <div class="col-span-2 md:col-span-4">
                            <p class="text-slate-500 mb-2">Completion Photo</p>
                            <img src="${req.completion_photo_url}" 
                                 alt="Completion photo" 
                                 class="w-48 h-auto rounded-lg border-2 border-blue-200 cursor-pointer hover:opacity-90"
                                 onclick="window.open('${req.completion_photo_url}', '_blank')">
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function switchTab(status) {
    // Update tab styles
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.classList.remove('border-blue-600', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-slate-600');
    });
    event.target.classList.add('border-blue-600', 'text-blue-600');
    event.target.classList.remove('border-transparent', 'text-slate-600');

    // Filter requests
    let requests;
    if (status === 'all') {
        requests = window.allTechnicianRequests;
    } else {
        requests = window.currentTechnicianRequests[status] || [];
    }

    // Re-render list
    document.getElementById('requestsList').innerHTML = renderRequestsList(requests, status);
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'in_progress': 'bg-blue-100 text-blue-700',
        'pending_approval': 'bg-purple-100 text-purple-700',
        'completed': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
}

function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
}

function setupSearch() {
    const searchInput = document.getElementById('searchTechnician');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allTechnicians.filter(tech => 
            `${tech.first_name} ${tech.last_name}`.toLowerCase().includes(query) ||
            tech.email.toLowerCase().includes(query)
        );
        renderTechniciansTable(filtered);
    });
}

function refreshData() {
    loadTechnicianProgress();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Simple toast notification
    alert(message);
}









