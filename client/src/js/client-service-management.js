document.addEventListener('DOMContentLoaded', function() {
    let serviceRequests = [];
    let currentRequestId = null;

    // DOM Elements
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const requestsContainer = document.getElementById('requestsContainer');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const serviceTypeFilter = document.getElementById('serviceTypeFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Modals
    const requestModal = document.getElementById('requestModal');
    const requestModalContent = document.getElementById('requestModalContent');
    const closeRequestModal = document.getElementById('closeRequestModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    
    const statusModal = document.getElementById('statusModal');
    const submitStatusUpdate = document.getElementById('submitStatusUpdate');
    const cancelStatusUpdate = document.getElementById('cancelStatusUpdate');

    // Stats Elements
    const newRequestsElement = document.getElementById('newRequests');
    const inProgressRequestsElement = document.getElementById('inProgressRequests');
    const completedRequestsElement = document.getElementById('completedRequests');
    const issueRequestsElement = document.getElementById('issueRequests');

    // Load service requests on page load
    loadServiceRequests();

    // Event Listeners
    refreshBtn.addEventListener('click', loadServiceRequests);
    searchInput.addEventListener('input', filterRequests);
    statusFilter.addEventListener('change', filterRequests);
    serviceTypeFilter.addEventListener('change', filterRequests);
    
    closeRequestModal.addEventListener('click', hideRequestModal);
    closeModalBtn.addEventListener('click', hideRequestModal);
    requestModal.addEventListener('click', (e) => {
        if (e.target === requestModal) hideRequestModal();
    });

    updateStatusBtn.addEventListener('click', showStatusModal);
    submitStatusUpdate.addEventListener('click', handleStatusUpdate);
    cancelStatusUpdate.addEventListener('click', hideStatusModal);
    statusModal.addEventListener('click', (e) => {
        if (e.target === statusModal) hideStatusModal();
    });

    async function loadServiceRequests() {
        try {
            showLoadingState();
            
            const response = await fetch(`${API_URL}/api/service-requests`);
            if (!response.ok) {
                throw new Error('Failed to fetch service requests');
            }
            
            serviceRequests = await response.json();
            updateStats(serviceRequests);
            
            if (serviceRequests.length === 0) {
                showEmptyState();
            } else {
                displayRequests(serviceRequests);
            }
        } catch (error) {
            console.error('Error loading service requests:', error);
            showEmptyState();
        }
    }

    function updateStats(requests) {
        const stats = requests.reduce((acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {});

        newRequestsElement.textContent = stats.new || 0;
        inProgressRequestsElement.textContent = stats.in_progress || 0;
        completedRequestsElement.textContent = stats.completed || 0;
        issueRequestsElement.textContent = stats.issue || 0;
    }

    function showLoadingState() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        requestsContainer.classList.add('hidden');
    }

    function showEmptyState() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        requestsContainer.classList.add('hidden');
    }

    function displayRequests(requests) {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
        requestsContainer.classList.remove('hidden');
        
        requestsContainer.innerHTML = '';
        
        requests.forEach(request => {
            const requestCard = createRequestCard(request);
            requestsContainer.appendChild(requestCard);
        });
    }

    function createRequestCard(request) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-4';
        
        const statusColors = {
            new: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
            issue: 'bg-red-100 text-red-800'
        };

        const statusColor = statusColors[request.status] || 'bg-gray-100 text-gray-800';
        const formattedDate = new Date(request.created_at).toLocaleDateString();
        
        card.innerHTML = `
            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <div class="flex items-center space-x-3">
                            <h3 class="text-lg font-semibold text-gray-900">
                                ${request.client_name}
                            </h3>
                            <span class="px-3 py-1 ${statusColor} rounded-full text-sm font-medium capitalize">
                                ${request.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">Service ID: ${request.id}</p>
                    </div>
                    <p class="text-sm text-gray-500">Requested: ${formattedDate}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 mb-1">Service Details</h4>
                        <p class="text-sm text-gray-600">Type: ${request.service_type}</p>
                        <p class="text-sm text-gray-600">Priority: ${request.priority}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 mb-1">Equipment</h4>
                        <p class="text-sm text-gray-600">Type: ${request.equipment_type}</p>
                        <p class="text-sm text-gray-600">Model: ${request.equipment_model}</p>
                    </div>
                </div>

                <div class="border-t pt-4 flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">Last Updated:</span> ${new Date(request.last_updated).toLocaleDateString()}
                    </div>
                    <button onclick="viewRequestDetails(${request.id})" 
                        class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <i class="fas fa-info-circle mr-2"></i>View Details
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }

    function filterRequests() {
        const searchTerm = searchInput.value.toLowerCase();
        const status = statusFilter.value;
        const serviceType = serviceTypeFilter.value;
        
        const filteredRequests = serviceRequests.filter(request => {
            const matchesSearch = !searchTerm || 
                request.client_name.toLowerCase().includes(searchTerm) ||
                request.service_type.toLowerCase().includes(searchTerm) ||
                request.id.toString().includes(searchTerm);
                
            const matchesStatus = !status || request.status === status;
            const matchesType = !serviceType || request.service_type === serviceType;
            
            return matchesSearch && matchesStatus && matchesType;
        });
        
        if (filteredRequests.length === 0) {
            showEmptyState();
        } else {
            displayRequests(filteredRequests);
        }
    }

    // Global functions for button clicks
    window.viewRequestDetails = async function(requestId) {
        try {
            currentRequestId = requestId;
            const response = await fetch(`/api/service-requests/${requestId}`);
            if (!response.ok) throw new Error('Failed to fetch request details');
            
            const request = await response.json();
            
            requestModalContent.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <h4 class="text-lg font-medium text-gray-900 mb-2">Client Information</h4>
                            <div class="text-sm space-y-2">
                                <p><span class="font-medium">Name:</span> ${request.client_name}</p>
                                <p><span class="font-medium">Contact:</span> ${request.client_contact}</p>
                                <p><span class="font-medium">Department:</span> ${request.department}</p>
                            </div>
                        </div>
                        <div>
                            <h4 class="text-lg font-medium text-gray-900 mb-2">Service Information</h4>
                            <div class="text-sm space-y-2">
                                <p><span class="font-medium">Type:</span> ${request.service_type}</p>
                                <p><span class="font-medium">Priority:</span> ${request.priority}</p>
                                <p><span class="font-medium">Status:</span> ${request.status.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Equipment Details</h4>
                        <div class="text-sm space-y-2">
                            <p><span class="font-medium">Type:</span> ${request.equipment_type}</p>
                            <p><span class="font-medium">Model:</span> ${request.equipment_model}</p>
                            <p><span class="font-medium">Serial Number:</span> ${request.equipment_serial}</p>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Service History</h4>
                        <div class="space-y-3">
                            ${request.history.map(entry => `
                                <div class="bg-gray-50 p-3 rounded">
                                    <div class="flex justify-between text-sm">
                                        <span class="font-medium">${entry.status.replace('_', ' ')}</span>
                                        <span class="text-gray-500">${new Date(entry.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p class="text-sm text-gray-600 mt-1">${entry.notes}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            requestModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error fetching request details:', error);
            alert('Failed to load request details. Please try again.');
        }
    };

    function hideRequestModal() {
        requestModal.classList.add('hidden');
        requestModalContent.innerHTML = '';
        currentRequestId = null;
    }

    function showStatusModal() {
        if (!currentRequestId) return;
        statusModal.classList.remove('hidden');
    }

    function hideStatusModal() {
        statusModal.classList.add('hidden');
        document.getElementById('statusUpdateForm').reset();
    }

    async function handleStatusUpdate() {
        if (!currentRequestId) return;

        const newStatus = document.getElementById('newStatus').value;
        const notes = document.getElementById('statusNotes').value;

        try {
            const response = await fetch(`/api/service-requests/${currentRequestId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    notes: notes
                })
            });

            if (!response.ok) throw new Error('Failed to update status');

            hideStatusModal();
            hideRequestModal();
            loadServiceRequests();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        }
    }
});
