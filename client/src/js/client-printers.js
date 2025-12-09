document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const clientSearch = document.getElementById('clientSearch');
    const clientsLoading = document.getElementById('clientsLoading');
    const clientCardsGrid = document.getElementById('clientCardsGrid');
    const noClientsFound = document.getElementById('noClientsFound');
    const selectedClientSection = document.getElementById('selectedClientSection');
    const selectedClientName = document.getElementById('selectedClientName');
    const selectedClientId = document.getElementById('selectedClientId');
    const assignPrinterBtn = document.getElementById('assignPrinterBtn');
    const deselectClientBtn = document.getElementById('deselectClientBtn');
    const printersTbody = document.getElementById('printersTbody');
    const printerSearch = document.getElementById('printerSearch');
    const emptyState = document.getElementById('emptyState');
    const totalCount = document.getElementById('totalCount');
    const institutionSelect = document.getElementById('institutionSelect'); // Hidden for compatibility

    // Tab Elements
    const assignedTab = document.getElementById('assignedTab');
    const historyTab = document.getElementById('historyTab');
    const assignedView = document.getElementById('assignedView');
    const historyView = document.getElementById('historyView');
    const historyTbody = document.getElementById('historyTbody');
    const historySearch = document.getElementById('historySearch');
    const historyEmptyState = document.getElementById('historyEmptyState');
    const historyCount = document.getElementById('historyCount');

    // State
    let allInstitutions = [];
    let filteredInstitutions = [];
    let selectedInstitution = null;
    let availableInventory = [];
    let allPrinters = []; // Store all printers for filtering
    let filteredPrinters = [];
    let allHistory = []; // Store all history records
    let filteredHistory = [];
    let printerCounts = {}; // Store printer counts per institution
    let currentView = 'assigned'; // Track current view: 'assigned' or 'history'

    // Initialize loading skeleton
    function showLoadingSkeleton() {
        clientsLoading.innerHTML = Array.from({length: 8}, () => `
            <div class="bg-white rounded-xl border border-slate-200 p-6 loading-skeleton">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-slate-200 rounded-xl loading-skeleton"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-slate-200 rounded loading-skeleton mb-2"></div>
                        <div class="h-3 bg-slate-200 rounded loading-skeleton w-2/3"></div>
                    </div>
                </div>
            </div>
        `).join('');
        clientsLoading.classList.remove('hidden');
        clientCardsGrid.classList.add('hidden');
    }

    // Tab switching functionality
    function switchToAssignedView() {
        currentView = 'assigned';
        assignedTab.classList.add('text-green-600', 'border-green-600');
        assignedTab.classList.remove('text-slate-500', 'border-transparent');
        historyTab.classList.remove('text-blue-600', 'border-blue-600');
        historyTab.classList.add('text-slate-500', 'border-transparent');
        assignedView.classList.remove('hidden');
        historyView.classList.add('hidden');
    }

    function switchToHistoryView() {
        currentView = 'history';
        historyTab.classList.add('text-blue-600', 'border-blue-600');
        historyTab.classList.remove('text-slate-500', 'border-transparent');
        assignedTab.classList.remove('text-green-600', 'border-green-600');
        assignedTab.classList.add('text-slate-500', 'border-transparent');
        historyView.classList.remove('hidden');
        assignedView.classList.add('hidden');
        fetchHistory();
    }

    // Fetch assignment history
    async function fetchHistory() {
        if (!selectedInstitution) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions/${encodeURIComponent(selectedInstitution.institution_id)}/printers/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                allHistory = await res.json();
                filteredHistory = allHistory;
                renderHistory();
            } else {
                console.error('Failed to fetch history');
                allHistory = [];
                filteredHistory = [];
                renderHistory();
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            allHistory = [];
            filteredHistory = [];
            renderHistory();
        }
    }

    // Render history table
    function renderHistory() {
        if (filteredHistory.length === 0) {
            historyEmptyState.classList.remove('hidden');
            historyTbody.innerHTML = '';
            historyCount.textContent = '0 records';
            return;
        }

        historyEmptyState.classList.add('hidden');
        historyCount.textContent = `${filteredHistory.length} record${filteredHistory.length === 1 ? '' : 's'}`;
        
        historyTbody.innerHTML = filteredHistory.map((record, idx) => {
            const statusBadge = record.status === 'assigned' 
                ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200"><i class="fas fa-check-circle mr-1"></i>Assigned</span>'
                : '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200"><i class="fas fa-times-circle mr-1"></i>Unassigned</span>';
            
            const assignedDate = record.assigned_at ? new Date(record.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
            const unassignedDate = record.unassigned_at ? new Date(record.unassigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
            
            return `
                <tr class="hover:bg-blue-50 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                    <td class="px-3 sm:px-6 py-4">
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0"><i class="fas fa-printer text-slate-400 text-lg"></i></div>
                            <div class="font-semibold text-slate-900 text-sm">${escapeHtml(record.name || 'Unknown Printer')}</div>
                        </div>
                    </td>
                    <td class="px-3 sm:px-6 py-4">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <i class="fas fa-tag mr-2 text-xs"></i>
                            ${escapeHtml(record.model || 'Unknown Model')}
                        </span>
                    </td>
                    <td class="px-3 sm:px-6 py-4"><span class="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">${escapeHtml(record.serial_number || 'N/A')}</span></td>
                    <td class="px-3 sm:px-6 py-4">${statusBadge}</td>
                    <td class="px-3 sm:px-6 py-4"><span class="text-sm text-slate-600">${assignedDate}</span></td>
                    <td class="px-3 sm:px-6 py-4"><span class="text-sm text-slate-600">${unassignedDate}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Filter history
    function filterHistory(searchTerm) {
        if (!searchTerm.trim()) {
            filteredHistory = allHistory;
        } else {
            const term = searchTerm.toLowerCase();
            filteredHistory = allHistory.filter(record => 
                (record.name && record.name.toLowerCase().includes(term)) ||
                (record.model && record.model.toLowerCase().includes(term)) ||
                (record.serial_number && record.serial_number.toLowerCase().includes(term)) ||
                (record.status && record.status.toLowerCase().includes(term))
            );
        }
        renderHistory();
    }

    // Initialize loading skeleton
    function showLoadingSkeleton() {
        clientsLoading.innerHTML = Array.from({length: 8}, () => `
            <div class="bg-white rounded-xl border border-slate-200 p-6 loading-skeleton">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-slate-200 rounded-xl loading-skeleton"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-slate-200 rounded loading-skeleton mb-2"></div>
                        <div class="h-3 bg-slate-200 rounded loading-skeleton w-2/3"></div>
                    </div>
                </div>
            </div>
        `).join('');
        clientsLoading.classList.remove('hidden');
        clientCardsGrid.classList.add('hidden');
    }

    // Render client cards
    function renderClientCards(institutions) {
        if (!institutions || institutions.length === 0) {
            clientCardsGrid.classList.add('hidden');
            noClientsFound.classList.remove('hidden');
            return;
        }

        noClientsFound.classList.add('hidden');
        clientCardsGrid.classList.remove('hidden');
        
        clientCardsGrid.innerHTML = institutions.map((institution, index) => {
            const printerCount = printerCounts[institution.institution_id] || 0;
            return `
            <div class="client-card bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-green-300 transition-all duration-300 card-fade-in flex flex-col" 
                 data-id="${institution.institution_id}" 
                 style="animation-delay: ${index * 50}ms; min-height: 180px;">
                <!-- Top Section with Icon and Printer Count -->
                <div class="flex items-start justify-between mb-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <i class="fas fa-building text-green-600 text-xl"></i>
                    </div>
                    <div class="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
                        <i class="fas fa-print text-blue-600 text-xs mr-2"></i>
                        <span class="text-sm font-semibold text-blue-700">${printerCount}</span>
                    </div>
                </div>
                
                <!-- Institution Name Section -->
                <div class="flex-1 mb-3">
                    <h4 class="font-semibold text-slate-900 text-lg leading-tight break-words">${escapeHtml(institution.name)}</h4>
                </div>
                
                <!-- Bottom Section - Fixed -->
                <div class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <p class="text-xs text-slate-500 font-mono">ID: ${institution.institution_id}</p>
                    <div class="flex items-center space-x-1">
                        <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span class="text-xs text-slate-600">Active</span>
                    </div>
                </div>
                
                <!-- Chevron Icon -->
                <div class="absolute top-1/2 right-4 transform -translate-y-1/2 text-slate-400">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            `;
        }).join('');

        // Add click handlers to cards
        document.querySelectorAll('.client-card').forEach(card => {
            card.addEventListener('click', () => {
                const institutionId = card.dataset.id;
                const institution = institutions.find(inst => inst.institution_id == institutionId);
                selectClient(institution);
            });
        });
    }

    // Select a client card
    function selectClient(institution) {
        // Keep selection in state for other actions (assigner etc.)
        selectedInstitution = institution;

        // Update hidden select for compatibility
        institutionSelect.value = institution.institution_id;

        // Visually mark selected card
        document.querySelectorAll('.client-card').forEach(card => {
            if (card.dataset.id == institution.institution_id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Show the selected client section with tabs
        selectedClientSection.classList.remove('hidden');
        selectedClientName.textContent = institution.name;
        selectedClientId.textContent = `ID: ${institution.institution_id}`;
        
        // Reset to assigned view by default
        switchToAssignedView();
        
        // Load printers
        fetchPrinters();
        
        // Scroll to the section
        selectedClientSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Open a modal showing assigned printers for the given institution.
    // Modal shows up to `pageSize` rows per view and provides left/right arrows to paginate.
    async function openPrintersModal(institution) {
        const pageSize = 3; // show at least 3 rows per screen
        let currentPage = 0;
        let printers = [];

        // Disable page scrolling
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div class="p-4 sm:p-6 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 flex items-start justify-between">
                    <div>
                        <h2 class="text-lg sm:text-xl font-bold text-green-900">${escapeHtml(institution.name)}</h2>
                        <p class="text-sm text-green-600 mt-1">ID: ${institution.institution_id}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="assignInModalBtn inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg shadow hover:from-green-700 hover:to-green-800 transition-all duration-200">
                            <i class="fas fa-plus mr-2"></i> Assign
                        </button>
                        <button class="closeModalBtn text-green-700 hover:text-white hover:bg-green-600 p-2 rounded-lg" title="Close modal">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto">
                    <div class="mb-4 flex items-center justify-between">
                        <div class="relative w-64">
                            <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input id="modalPrinterSearch" placeholder="Search printers..." class="w-full pl-12 pr-4 py-2 border-2 border-slate-200 rounded-xl text-slate-900" />
                        </div>
                        <div class="flex items-center space-x-2">
                            <button class="prevPageBtn px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200" title="Previous">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="nextPageBtn px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200" title="Next">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm border-collapse">
                            <thead class="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th class="text-left px-3 sm:px-6 py-3 font-semibold text-slate-700">Printer Name</th>
                                    <th class="text-left px-3 sm:px-6 py-3 font-semibold text-slate-700">Model</th>
                                    <th class="text-left px-3 sm:px-6 py-3 font-semibold text-slate-700">Serial Number</th>
                                    <th class="text-right px-3 sm:px-6 py-3 font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="modalPrintersTbody" class="divide-y divide-slate-100"></tbody>
                        </table>
                        <div id="modalEmptyState" class="text-center py-8 hidden">
                            <div class="flex flex-col items-center">
                                <i class="fas fa-inbox text-4xl text-slate-300 mb-4"></i>
                                <p class="text-lg font-medium text-slate-400">No printers assigned yet</p>
                                <p class="text-sm text-slate-400 mt-1">Use Assign to add printers to this client</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 text-right">
                    <span id="modalTotalCount" class="text-sm text-slate-600 mr-4">0 printers</span>
                    <button class="closeModalBtn px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const modalPrintersTbody = modal.querySelector('#modalPrintersTbody');
        const modalEmptyState = modal.querySelector('#modalEmptyState');
        const modalTotalCount = modal.querySelector('#modalTotalCount');
        const prevBtn = modal.querySelector('.prevPageBtn');
        const nextBtn = modal.querySelector('.nextPageBtn');
        const searchInput = modal.querySelector('#modalPrinterSearch');
        const closeBtns = modal.querySelectorAll('.closeModalBtn');
        const assignInModalBtn = modal.querySelector('.assignInModalBtn');

        function closeModal() {
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            document.body.style.overflow = prevOverflow || '';
        }

        closeBtns.forEach(b => b.addEventListener('click', closeModal));

        // Assign in modal should open the existing assign flow
        assignInModalBtn.addEventListener('click', async () => {
            // close printers modal first to reuse addPrinter which also appends a modal
            closeModal();
            // ensure selectedInstitution is set (it already is)
            await addPrinter();
        });

        // Fetch printers for this institution
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions/${encodeURIComponent(institution.institution_id)}/printers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            printers = res.ok ? await res.json() : [];
        } catch (err) {
            console.error('Failed to load printers for modal', err);
            printers = [];
        }

        // Filtering
        let filtered = [...printers];

        function renderModalPage() {
            const start = currentPage * pageSize;
            const pageItems = filtered.slice(start, start + pageSize);

            if (!pageItems.length) {
                modalPrintersTbody.innerHTML = '';
                modalEmptyState.classList.remove('hidden');
                modalTotalCount.textContent = `${filtered.length} printer${filtered.length === 1 ? '' : 's'}`;
            } else {
                modalEmptyState.classList.add('hidden');
                modalPrintersTbody.innerHTML = pageItems.map((p, idx) => `
                    <tr data-id="${p.assignment_id}" class="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                        <td class="px-3 sm:px-6 py-4">
                            <div class="flex items-center space-x-3">
                                <div class="flex-shrink-0"><i class="fas fa-printer text-slate-400 text-lg"></i></div>
                                <div class="font-semibold text-slate-900 text-sm">${escapeHtml(p.name || 'Unknown Printer')}</div>
                            </div>
                        </td>
                        <td class="px-3 sm:px-6 py-4">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                <i class="fas fa-tag mr-2 text-xs"></i>
                                ${escapeHtml(p.model || 'Unknown Model')}
                            </span>
                        </td>
                        <td class="px-3 sm:px-6 py-4"><span class="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">${escapeHtml(p.serial_number || 'N/A')}</span></td>
                        <td class="px-3 sm:px-6 py-4 text-right">
                            <button class="modalUnassignBtn inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-200 shadow-sm">
                                <i class="fas fa-unlink mr-2 text-xs"></i> Unassign
                            </button>
                        </td>
                    </tr>
                `).join('');
                modalTotalCount.textContent = `${filtered.length} printer${filtered.length === 1 ? '' : 's'}`;
            }

            // Update nav button states
            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = (currentPage + 1) * pageSize >= filtered.length;
        }

        // Pagination handlers
        prevBtn.addEventListener('click', () => {
            if (currentPage === 0) return;
            currentPage--;
            renderModalPage();
        });
        nextBtn.addEventListener('click', () => {
            if ((currentPage + 1) * pageSize >= filtered.length) return;
            currentPage++;
            renderModalPage();
        });

        // Search in modal
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim().toLowerCase();
            if (!term) filtered = [...printers];
            else filtered = printers.filter(pr =>
                (pr.name && pr.name.toLowerCase().includes(term)) ||
                (pr.model && pr.model.toLowerCase().includes(term)) ||
                (pr.serial_number && pr.serial_number.toLowerCase().includes(term))
            );
            currentPage = 0;
            renderModalPage();
        });

        // Delegate unassign inside modal
        modalPrintersTbody.addEventListener('click', async (ev) => {
            const row = ev.target.closest('tr[data-id]');
            if (!row) return;
            if (ev.target.closest('.modalUnassignBtn')) {
                const id = row.getAttribute('data-id');
                if (!confirm('Unassign this printer from the client?')) return;
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/printers/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    if (!res.ok) throw new Error('Failed to unassign');
                    // remove from local arrays and re-render
                    printers = printers.filter(p => p.assignment_id != id);
                    filtered = filtered.filter(p => p.assignment_id != id);
                    if (currentPage * pageSize >= filtered.length && currentPage > 0) currentPage--;
                    renderModalPage();
                } catch (err) {
                    console.error(err);
                    alert('Failed to unassign printer');
                }
            }
        });

        // initial render
        renderModalPage();
    }

    // Deselect client
    function deselectClient() {
        selectedInstitution = null;
        selectedClientSection.classList.add('hidden');
        institutionSelect.value = '';
        
        // Clear printer data and search
        allPrinters = [];
        filteredPrinters = [];
        printerSearch.value = '';
        printersTbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        totalCount.textContent = '0 printers';
        
        // Remove selection visual state
        document.querySelectorAll('.client-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    // Search functionality
    function filterClients(searchTerm) {
        if (!searchTerm.trim()) {
            filteredInstitutions = allInstitutions;
        } else {
            const term = searchTerm.toLowerCase();
            filteredInstitutions = allInstitutions.filter(inst => 
                inst.name.toLowerCase().includes(term) ||
                inst.institution_id.toString().includes(term)
            );
        }
        renderClientCards(filteredInstitutions);
    }

    // Event handlers
    clientSearch.addEventListener('input', (e) => {
        filterClients(e.target.value);
    });

    printerSearch.addEventListener('input', (e) => {
        filterPrinters(e.target.value);
    });

    if (historySearch) {
        historySearch.addEventListener('input', (e) => {
            filterHistory(e.target.value);
        });
    }

    if (assignedTab) {
        assignedTab.addEventListener('click', switchToAssignedView);
    }

    if (historyTab) {
        historyTab.addEventListener('click', switchToHistoryView);
    }

    deselectClientBtn.addEventListener('click', deselectClient);

    // Fetch institutions and render cards
    async function fetchInstitutions() {
        try {
            showLoadingSkeleton();
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allInstitutions = await res.json();
            filteredInstitutions = allInstitutions;
            
            // Fetch printer counts for all institutions
            await fetchPrinterCounts();
            
            // Populate hidden select for compatibility
            institutionSelect.innerHTML = '<option value="">Select a client</option>' +
                allInstitutions.map(i => `<option value="${i.institution_id}">${i.name}</option>`).join('');
            
            // Hide loading and show cards
            clientsLoading.classList.add('hidden');
            renderClientCards(allInstitutions);
            
        } catch (e) {
            console.error('Failed to load institutions', e);
            clientsLoading.classList.add('hidden');
            noClientsFound.classList.remove('hidden');
        }
    }

    // Fetch printer counts for all institutions
    async function fetchPrinterCounts() {
        try {
            const token = localStorage.getItem('token');
            // Fetch printer counts for each institution
            const counts = await Promise.all(
                allInstitutions.map(async (institution) => {
                    try {
                        const res = await fetch(`/api/institutions/${encodeURIComponent(institution.institution_id)}/printers`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const printers = await res.json();
                        return { id: institution.institution_id, count: printers.length };
                    } catch (err) {
                        console.error(`Failed to fetch printers for ${institution.institution_id}`, err);
                        return { id: institution.institution_id, count: 0 };
                    }
                })
            );
            
            // Store counts in the printerCounts object
            counts.forEach(({ id, count }) => {
                printerCounts[id] = count;
            });
        } catch (e) {
            console.error('Failed to fetch printer counts', e);
        }
    }

    async function fetchPrinters() {
        if (!selectedInstitution) {
            printersTbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            totalCount.textContent = '0 printers';
            return;
        }
        
        // Show loading state
        printersTbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-spinner fa-spin text-2xl text-slate-400 mb-3"></i>
                        <p class="text-slate-500">Loading printers...</p>
                    </div>
                </td>
            </tr>
        `;
        emptyState.classList.add('hidden');
        
        try {
            console.log('Fetching printers for institution:', selectedInstitution.institution_id);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions/${encodeURIComponent(selectedInstitution.institution_id)}/printers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const printers = await res.json();
            console.log('Received printers:', printers);
            
            // Store all printers for filtering
            allPrinters = printers;
            filteredPrinters = [...allPrinters];
            
            // Clear search input when fetching new data
            printerSearch.value = '';
            
            renderPrinters(filteredPrinters);
        } catch (e) {
            console.error('Failed to load printers', e);
            printersTbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-3"></i>
                            <p class="text-red-500">Failed to load printers</p>
                            <p class="text-sm text-slate-400 mt-1">Please try again</p>
                        </div>
                    </td>
                </tr>
            `;
            totalCount.textContent = '0 printers';
        }
    }

    function filterPrinters(searchTerm) {
        if (!searchTerm.trim()) {
            filteredPrinters = [...allPrinters];
        } else {
            const search = searchTerm.toLowerCase();
            filteredPrinters = allPrinters.filter(printer => 
                (printer.name && printer.name.toLowerCase().includes(search)) ||
                (printer.model && printer.model.toLowerCase().includes(search)) ||
                (printer.serial_number && printer.serial_number.toLowerCase().includes(search)) ||
                (printer.brand && printer.brand.toLowerCase().includes(search))
            );
        }
        renderPrinters(filteredPrinters);
    }

    function renderPrinters(printers) {
        if (!printers || printers.length === 0) {
            printersTbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            totalCount.textContent = '0 printers';
            return;
        }
        
        emptyState.classList.add('hidden');
        totalCount.textContent = `${printers.length} printer${printers.length === 1 ? '' : 's'}`;
        
        printersTbody.innerHTML = printers.map((p, index) => `
            <tr data-id="${p.assignment_id}" class="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                <td class="px-3 sm:px-6 py-5">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                            <i class="fas fa-printer text-slate-400 text-lg"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-sm sm:text-base">${escapeHtml(p.name || 'Unknown Printer')}</div>
                        </div>
                    </div>
                </td>
                <td class="px-3 sm:px-6 py-5">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <i class="fas fa-tag mr-2 text-xs"></i>
                        ${escapeHtml(p.model || 'Unknown Model')}
                    </span>
                </td>
                <td class="px-3 sm:px-6 py-5">
                    <span class="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        ${escapeHtml(p.serial_number || 'N/A')}
                    </span>
                </td>
                <td class="px-3 sm:px-6 py-5 text-right">
                    <button class="deleteBtn inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-200 shadow-sm">
                        <i class="fas fa-unlink mr-2 text-xs"></i>
                        Unassign
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function loadAvailableInventory() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/inventory-items?available=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            availableInventory = await res.json();
        } catch (e) {
            console.error('Failed to load available inventory', e);
            availableInventory = [];
        }
    }

    async function addPrinter() {
        if (!selectedInstitution) {
            alert('Please select a client first');
            return;
        }
        
        await loadAvailableInventory();
        if (!availableInventory.length) {
            showNoPrintersModal();
            return;
        }

        // Create modern selection modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i class="fas fa-link text-white"></i>
                            </div>
                            <h2 class="text-xl font-bold text-white">Assign Printer</h2>
                        </div>
                        <button class="cancelBtn text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                    <div class="mt-3 text-green-100 text-sm">
                        <i class="fas fa-building mr-2"></i>
                        ${escapeHtml(selectedInstitution.name)}
                    </div>
                </div>
                <div class="p-6">
                    <div class="space-y-2 mb-6">
                        <label class="block text-sm font-semibold text-slate-700">Select Available Printer</label>
                        <select class="selectList w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200">
                            <option value="">Choose a printer...</option>
                        </select>
                    </div>
                </div>
                <div class="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button class="cancelBtn px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all duration-200">
                        Cancel
                    </button>
                    <button class="confirmBtn px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl shadow-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200">
                        <i class="fas fa-link mr-2"></i>
                        Assign Printer
                    </button>
                </div>
            </div>
        `;

        const selectList = modal.querySelector('.selectList');
        availableInventory.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = `${i.brand || 'Unknown'} ${i.model || 'Model'} (${i.serial_number || 'No Serial'})`;
            selectList.appendChild(opt);
        });

        document.body.appendChild(modal);

        const cancelBtns = modal.querySelectorAll('.cancelBtn');
        const confirmBtn = modal.querySelector('.confirmBtn');

        cancelBtns.forEach(btn => {
            btn.onclick = () => document.body.removeChild(modal);
        });

        confirmBtn.onclick = async () => {
            const inventoryId = selectList.value;
            if (!inventoryId) {
                alert('Select a printer');
                return;
            }
            const payload = { printer_id: inventoryId };
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/institutions/${encodeURIComponent(selectedInstitution.institution_id)}/printers`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to assign');
                document.body.removeChild(modal);
                await fetchPrinters();
                await loadAvailableInventory();
            } catch (e) {
                console.error(e);
                alert('Failed to assign printer');
            }
        };
    }

    // Event handlers for printer table
    printersTbody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        const id = row.getAttribute('data-id');
        
        if (e.target.classList.contains('deleteBtn')) {
            if (!confirm('Unassign this printer from the client?')) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/printers/${encodeURIComponent(id)}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to delete');
                await fetchPrinters();
                await loadAvailableInventory();
            } catch (err) {
                console.error(err);
                alert('Failed to unassign printer');
            }
        }
    });

    if (assignPrinterBtn) {
        assignPrinterBtn.addEventListener('click', addPrinter);
    }

    // Initialize
    fetchInstitutions().then(async () => {
        await loadAvailableInventory();
    });
});

// Modal Functions for No Printers Available
function showNoPrintersModal() {
    const modal = document.getElementById('noPrintersModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeNoPrintersModal() {
    const modal = document.getElementById('noPrintersModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function goToInventoryItems() {
    // Navigate to inventory items page
    window.location.href = '/pages/admin/inventory-items.html';
}




