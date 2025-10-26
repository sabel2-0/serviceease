/**
 * Admin Parts Requests Management System
 * Handles viewing, filtering, approving, and denying parts requests from technicians
 */

class AdminPartsRequestsManager {
    constructor() {
        this.allRequests = [];
        this.filteredRequests = [];
        this.currentRequest = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadPartsRequests();
        this.loadStatistics();
    }
    
    setupEventListeners() {
        // Search and filter events
        document.getElementById('searchInput')?.addEventListener('input', 
            this.debounce(this.handleSearch.bind(this), 300));
        document.getElementById('statusFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('priorityFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('dateFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('refreshBtn')?.addEventListener('click', this.loadPartsRequests.bind(this));
        document.getElementById('exportBtn')?.addEventListener('click', this.exportRequests.bind(this));
        
        // Modal events
        document.getElementById('closeModal')?.addEventListener('click', this.closeModal.bind(this));
        document.getElementById('cancelResponse')?.addEventListener('click', this.closeResponseModal.bind(this));
        document.getElementById('approveRequest')?.addEventListener('click', this.approveRequest.bind(this));
        document.getElementById('denyRequest')?.addEventListener('click', this.denyRequest.bind(this));
        document.getElementById('fulfillRequest')?.addEventListener('click', this.fulfillRequest.bind(this));
        
        // Close modals on backdrop click
        document.getElementById('requestModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });
        
        document.getElementById('responseModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeResponseModal();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeResponseModal();
            }
        });
    }
    
    async loadPartsRequests() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/parts-requests', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const requests = await response.json();
            console.log('Loaded parts requests:', requests);
            
            this.allRequests = requests;
            this.filteredRequests = [...requests];
            this.renderRequests();
            
            this.hideLoading();
            
            // Show success toast
            this.showToast('success', 'Requests Loaded', `Found ${requests.length} parts requests`);
            
        } catch (error) {
            console.error('Error loading parts requests:', error);
            this.hideLoading();
            this.showEmptyState();
            this.showToast('error', 'Loading Failed', 'Could not load parts requests. Please try again.');
        }
    }
    
    async loadStatistics() {
        try {
            const response = await fetch('/api/parts-requests/stats/summary', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                this.updateStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    updateStatistics(stats) {
        document.getElementById('totalRequests').textContent = stats.total_requests || 0;
        document.getElementById('pendingRequests').textContent = stats.pending_requests || 0;
        document.getElementById('approvedRequests').textContent = stats.approved_requests || 0;
        document.getElementById('urgentRequests').textContent = stats.urgent_requests || 0;
    }
    
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        this.filterRequests(searchTerm);
    }
    
    handleFilter() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        this.filterRequests(searchTerm);
    }
    
    filterRequests(searchTerm = '') {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        
        this.filteredRequests = this.allRequests.filter(request => {
            // Search filter
            const matchesSearch = !searchTerm || 
                request.part_name?.toLowerCase().includes(searchTerm) ||
                request.technician_first_name?.toLowerCase().includes(searchTerm) ||
                request.technician_last_name?.toLowerCase().includes(searchTerm) ||
                request.technician_email?.toLowerCase().includes(searchTerm) ||
                request.reason?.toLowerCase().includes(searchTerm);
            
            // Status filter
            const matchesStatus = !statusFilter || request.status === statusFilter;
            
            // Priority filter
            const matchesPriority = !priorityFilter || request.priority === priorityFilter;
            
            // Date filter
            const matchesDate = this.matchesDateFilter(request.created_at, dateFilter);
            
            return matchesSearch && matchesStatus && matchesPriority && matchesDate;
        });
        
        this.renderRequests();
    }
    
    matchesDateFilter(dateString, filter) {
        if (!filter) return true;
        
        const requestDate = new Date(dateString);
        const now = new Date();
        
        switch (filter) {
            case 'today':
                return requestDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return requestDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                return requestDate >= monthAgo;
            default:
                return true;
        }
    }
    
    renderRequests() {
        const container = document.getElementById('requestsContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;
        
        if (this.filteredRequests.length === 0) {
            container.classList.add('hidden');
            emptyState?.classList.remove('hidden');
            return;
        }
        
        emptyState?.classList.add('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = this.filteredRequests.map(request => this.createRequestCard(request)).join('');
    }
    
    createRequestCard(request) {
        const priorityClass = `priority-${request.priority}`;
        const statusClass = `status-${request.status}`;
        const technicianName = `${request.technician_first_name || ''} ${request.technician_last_name || ''}`.trim();
        const formattedDate = new Date(request.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        const formattedTime = new Date(request.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="parts-request-card ${priorityClass} rounded-xl group hover:shadow-lg cursor-pointer h-[460px]" 
                 data-request-id="${request.id}"
                 onclick="window.partsRequestsManager.viewRequestDetails(${request.id})">
                <!-- Fixed Layout Container -->
                <div class="h-full flex flex-col p-6">
                    <!-- Header Section -->
                    <div class="flex items-start space-x-4 mb-4 h-[102px]">
                        <div class="card-icon priority-icon-${request.priority} p-3 rounded-xl text-white flex-shrink-0">
                            <i class="fas fa-tools text-lg"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <!-- Part Name -->
                            <div class="h-[54px] flex items-start mb-2 overflow-hidden">
                                <h3 class="font-bold text-lg text-gray-900 transition-colors leading-tight line-clamp-2">
                                    ${this.escapeHtml(request.part_name)}
                                </h3>
                            </div>
                            <!-- Part Number Row -->
                            <div class="flex items-center gap-2 h-[44px]">
                                ${request.part_number ? `
                                <div class="part-number text-xs px-2 py-1 rounded-md font-medium border truncate">
                                    ${this.escapeHtml(request.part_number)}
                                </div>
                                ` : '<div class="h-6"></div>'}
                            </div>
                        </div>
                        <!-- Status and Priority Section -->
                        <div class="flex flex-col items-end space-y-2">
                            <span class="status-badge px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                                ${this.formatStatus(request.status)}
                            </span>
                            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${this.getPriorityClass(request.priority)}">
                                <i class="fas ${this.getPriorityIcon(request.priority)} mr-1"></i>
                                ${this.formatPriority(request.priority)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Technician and Quantity Information -->
                    <div class="space-y-2 mb-4 h-[84px] overflow-hidden">
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-user-cog text-gray-400 mr-3 w-4 flex-shrink-0"></i>
                            <span class="font-medium truncate">${this.escapeHtml(technicianName)}</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-boxes text-gray-400 mr-3 w-4 flex-shrink-0"></i>
                            <span>Qty: <span class="font-semibold text-gray-900">${request.quantity_requested}</span> units</span>
                            <span class="mx-2 text-gray-400">|</span>
                            <span>Stock: <span class="font-semibold ${request.available_stock > 0 ? 'text-green-600' : 'text-red-600'}">${request.available_stock}</span></span>
                        </div>
                    </div>
                    
                    <!-- Reason Section -->
                    <div class="mb-4 h-[68px] overflow-hidden">
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full">
                            <div class="text-xs font-medium text-gray-500 mb-1">Reason:</div>
                            <div class="text-sm text-gray-700 line-clamp-2">${this.escapeHtml(request.reason)}</div>
                        </div>
                    </div>
                    
                    <!-- Footer Section -->
                    <div class="mt-auto">
                        <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                            <!-- Action Buttons -->
                            <div class="flex space-x-1">
                                ${request.status === 'pending' ? `
                                    <button onclick="event.stopPropagation(); window.partsRequestsManager.openResponseModal(${request.id}, 'approve')" 
                                        class="action-button p-2.5 text-green-600 bg-green-50 hover:bg-green-600 hover:text-white rounded-lg transition-all relative z-1 w-[36px] h-[36px] flex items-center justify-center" 
                                        title="Approve">
                                        <i class="fas fa-check text-sm relative z-1"></i>
                                    </button>
                                    <button onclick="event.stopPropagation(); window.partsRequestsManager.openResponseModal(${request.id}, 'deny')" 
                                        class="action-button p-2.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all relative z-1 w-[36px] h-[36px] flex items-center justify-center" 
                                        title="Deny">
                                        <i class="fas fa-times text-sm relative z-1"></i>
                                    </button>
                                ` : request.status === 'approved' ? `
                                    <button onclick="event.stopPropagation(); window.partsRequestsManager.openResponseModal(${request.id}, 'fulfill')" 
                                        class="action-button p-2.5 text-purple-600 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg transition-all relative z-1 w-[36px] h-[36px] flex items-center justify-center" 
                                        title="Mark Fulfilled">
                                        <i class="fas fa-check-double text-sm relative z-1"></i>
                                    </button>
                                ` : ''}
                                <button onclick="event.stopPropagation(); window.partsRequestsManager.viewRequestDetails(${request.id})" 
                                    class="action-button p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all relative z-1 w-[36px] h-[36px] flex items-center justify-center" 
                                    title="View Details">
                                    <i class="fas fa-eye text-sm relative z-1"></i>
                                </button>
                            </div>
                            
                            <!-- Date Section -->
                            <div class="text-right">
                                <div class="text-xs text-gray-400 font-medium">Requested</div>
                                <div class="text-xs text-gray-600 font-semibold">${formattedDate}</div>
                                <div class="text-xs text-gray-500">${formattedTime}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    
    viewRequestDetails(requestId) {
        const request = this.allRequests.find(r => r.id === requestId);
        if (!request) {
            this.showToast('error', 'Error', 'Request not found');
            return;
        }
        
        this.currentRequest = request;
        this.populateModal(request);
        document.getElementById('requestModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    populateModal(request) {
        const technicianName = `${request.technician_first_name || ''} ${request.technician_last_name || ''}`.trim();
        const formattedDate = new Date(request.created_at).toLocaleDateString();
        const formattedTime = new Date(request.created_at).toLocaleTimeString();
        
        document.getElementById('modalContent').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Request Information</h4>
                    <div class="space-y-3">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Request ID</label>
                            <div class="text-gray-800">#${request.id}</div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Status</label>
                            <div>
                                <span class="px-3 py-1 rounded-full text-sm font-medium status-${request.status}">
                                    ${this.formatStatus(request.status)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Priority</label>
                            <div>
                                <span class="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${this.getPriorityClass(request.priority)}">
                                    <i class="fas ${this.getPriorityIcon(request.priority)} mr-1"></i>
                                    ${this.formatPriority(request.priority)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Created</label>
                            <div class="text-gray-800">${formattedDate} at ${formattedTime}</div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Part Information</h4>
                    <div class="space-y-3">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Part Name</label>
                            <div class="text-gray-800 font-medium">${this.escapeHtml(request.part_name)}</div>
                        </div>
                        ${request.part_number ? `
                        <div>
                            <label class="text-sm font-medium text-gray-600">Part Number</label>
                            <div class="text-gray-800">${this.escapeHtml(request.part_number)}</div>
                        </div>
                        ` : ''}
                        ${request.part_category ? `
                        <div>
                            <label class="text-sm font-medium text-gray-600">Category</label>
                            <div class="text-gray-800">${this.escapeHtml(request.part_category)}</div>
                        </div>
                        ` : ''}
                        <div>
                            <label class="text-sm font-medium text-gray-600">Quantity Requested</label>
                            <div class="text-gray-800 font-medium">${request.quantity_requested} units</div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Available Stock</label>
                            <div class="font-medium ${request.available_stock > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${request.available_stock} units
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">Technician Information</h4>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Name</label>
                            <div class="text-gray-800">${this.escapeHtml(technicianName)}</div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Email</label>
                            <div class="text-gray-800">${this.escapeHtml(request.technician_email)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">Reason for Request</h4>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-gray-800 whitespace-pre-wrap">${this.escapeHtml(request.reason)}</div>
                </div>
            </div>
            
            ${request.admin_response ? `
            <div class="mt-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">Admin Response</h4>
                <div class="bg-blue-50 rounded-lg p-4">
                    <div class="text-blue-800 whitespace-pre-wrap">${this.escapeHtml(request.admin_response)}</div>
                    ${request.approved_by_first_name ? `
                    <div class="text-sm text-blue-600 mt-2">
                        Responded by: ${this.escapeHtml(request.approved_by_first_name)} ${this.escapeHtml(request.approved_by_last_name)}
                        ${request.approved_at ? `on ${new Date(request.approved_at).toLocaleDateString()}` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
        `;
        
        // Update modal actions
        const actionsContainer = document.getElementById('modalActions');
        const actionButtons = this.getModalActionButtons(request);
        actionsContainer.innerHTML = `
            <button id="closeModalBtn" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                Close
            </button>
            ${actionButtons}
        `;
        
        // Attach action listeners
        document.getElementById('closeModalBtn')?.addEventListener('click', this.closeModal.bind(this));
        this.attachModalActionListeners(request);
    }
    
    getModalActionButtons(request) {
        const buttons = [];
        
        if (request.status === 'pending') {
            buttons.push(`
                <button class="modal-approve bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <i class="fas fa-check mr-2"></i>Approve
                </button>
            `);
            buttons.push(`
                <button class="modal-deny bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    <i class="fas fa-times mr-2"></i>Deny
                </button>
            `);
        } else if (request.status === 'approved') {
            buttons.push(`
                <button class="modal-fulfill bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <i class="fas fa-check-double mr-2"></i>Mark Fulfilled
                </button>
            `);
        }
        
        return buttons.join('');
    }
    
    attachModalActionListeners(request) {
        document.querySelector('.modal-approve')?.addEventListener('click', () => {
            this.closeModal();
            this.openResponseModal(request.id, 'approve');
        });
        
        document.querySelector('.modal-deny')?.addEventListener('click', () => {
            this.closeModal();
            this.openResponseModal(request.id, 'deny');
        });
        
        document.querySelector('.modal-fulfill')?.addEventListener('click', () => {
            this.closeModal();
            this.openResponseModal(request.id, 'fulfill');
        });
    }
    
    openResponseModal(requestId, action) {
        const request = this.allRequests.find(r => r.id === requestId);
        if (!request) {
            this.showToast('error', 'Error', 'Request not found');
            return;
        }
        
        this.currentRequest = request;
        this.currentAction = action;
        
        // Update modal title and buttons
        const title = {
            'approve': 'Approve Parts Request',
            'deny': 'Deny Parts Request',
            'fulfill': 'Mark Request as Fulfilled'
        }[action];
        
        document.getElementById('responseModalTitle').textContent = title;
        document.getElementById('adminResponse').value = '';
        
        // Show/hide relevant buttons
        document.getElementById('approveRequest').style.display = action === 'approve' ? 'inline-flex' : 'none';
        document.getElementById('denyRequest').style.display = action === 'deny' ? 'inline-flex' : 'none';
        document.getElementById('fulfillRequest').style.display = action === 'fulfill' ? 'inline-flex' : 'none';
        
        document.getElementById('responseModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    async approveRequest() {
        await this.updateRequestStatus('approved');
    }
    
    async denyRequest() {
        await this.updateRequestStatus('denied');
    }
    
    async fulfillRequest() {
        await this.updateRequestStatus('fulfilled');
    }
    
    async updateRequestStatus(status) {
        if (!this.currentRequest) {
            this.showToast('error', 'Error', 'No request selected');
            return;
        }
        
        const adminResponse = document.getElementById('adminResponse').value.trim();
        
        try {
            const response = await fetch(`/api/parts-requests/${this.currentRequest.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({
                    status: status,
                    admin_response: adminResponse
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update request status`);
            }
            
            const result = await response.json();
            console.log('Request status updated:', result);
            
            this.showToast('success', 'Success', 
                `Request has been ${status === 'fulfilled' ? 'marked as fulfilled' : status}`);
            
            this.closeResponseModal();
            
            // Reload data
            await this.loadPartsRequests();
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error updating request status:', error);
            this.showToast('error', 'Update Failed', 
                error.message || 'Could not update request status. Please try again.');
        }
    }
    
    closeModal() {
        document.getElementById('requestModal').classList.add('hidden');
        document.body.style.overflow = '';
        this.currentRequest = null;
    }
    
    closeResponseModal() {
        document.getElementById('responseModal').classList.add('hidden');
        document.body.style.overflow = '';
        this.currentRequest = null;
        this.currentAction = null;
    }
    
    exportRequests() {
        if (this.filteredRequests.length === 0) {
            this.showToast('error', 'No Data', 'No requests to export');
            return;
        }
        
        // Create CSV content
        const headers = [
            'ID', 'Part Name', 'Part Number', 'Category', 'Quantity Requested', 
            'Available Stock', 'Priority', 'Status', 'Technician Name', 'Technician Email',
            'Reason', 'Admin Response', 'Created Date', 'Approved Date'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredRequests.map(request => [
                request.id,
                `"${(request.part_name || '').replace(/"/g, '""')}"`,
                `"${(request.part_number || '').replace(/"/g, '""')}"`,
                `"${(request.part_category || '').replace(/"/g, '""')}"`,
                request.quantity_requested,
                request.available_stock,
                request.priority,
                request.status,
                `"${`${request.technician_first_name || ''} ${request.technician_last_name || ''}`.trim().replace(/"/g, '""')}"`,
                `"${(request.technician_email || '').replace(/"/g, '""')}"`,
                `"${(request.reason || '').replace(/"/g, '""')}"`,
                `"${(request.admin_response || '').replace(/"/g, '""')}"`,
                new Date(request.created_at).toISOString(),
                request.approved_at ? new Date(request.approved_at).toISOString() : ''
            ].join(','))
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `parts_requests_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.showToast('success', 'Export Complete', 'Parts requests exported successfully');
    }
    
    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'denied': 'Denied',
            'fulfilled': 'Fulfilled'
        };
        return statusMap[status] || status;
    }
    
    formatPriority(priority) {
        const priorityMap = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'urgent': 'Urgent'
        };
        return priorityMap[priority] || priority;
    }
    
    getPriorityClass(priority) {
        const classMap = {
            'low': 'bg-green-100 text-green-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'high': 'bg-orange-100 text-orange-800',
            'urgent': 'bg-red-100 text-red-800'
        };
        return classMap[priority] || 'bg-gray-100 text-gray-800';
    }
    
    getPriorityIcon(priority) {
        const iconMap = {
            'low': 'fa-arrow-down',
            'medium': 'fa-minus',
            'high': 'fa-arrow-up',
            'urgent': 'fa-exclamation-triangle'
        };
        return iconMap[priority] || 'fa-question';
    }
    
    showLoading() {
        document.getElementById('loadingState')?.classList.remove('hidden');
        document.getElementById('requestsContainer')?.classList.add('hidden');
        document.getElementById('emptyState')?.classList.add('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingState')?.classList.add('hidden');
    }
    
    showEmptyState() {
        document.getElementById('requestsContainer')?.classList.add('hidden');
        document.getElementById('emptyState')?.classList.remove('hidden');
    }
    
    showToast(type, title, message) {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast fixed bottom-4 right-4 bg-white border-l-4 p-4 rounded shadow-lg max-w-md z-50 ${
            type === 'success' ? 'border-green-500' : 'border-red-500'
        }`;
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <i class="fas ${type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'}"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">${this.escapeHtml(title)}</p>
                    <p class="text-sm text-gray-700">${this.escapeHtml(message)}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debounce(func, wait) {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/pages/login.html';
        return;
    }
    
    const userData = JSON.parse(user);
    if (userData.role !== 'admin' && userData.role !== 'operations_officer') {
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Initialize the admin parts requests manager
    window.partsRequestsManager = new AdminPartsRequestsManager();
    window.AdminPartsRequestsManager = AdminPartsRequestsManager;
});