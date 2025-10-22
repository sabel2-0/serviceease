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

    // State
    let allInstitutions = [];
    let filteredInstitutions = [];
    let selectedInstitution = null;
    let availableInventory = [];
    let allPrinters = []; // Store all printers for filtering
    let filteredPrinters = [];

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
        
        clientCardsGrid.innerHTML = institutions.map((institution, index) => `
            <div class="client-card bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-green-300 transition-all duration-300 card-fade-in" 
                 data-id="${institution.institution_id}" 
                 style="animation-delay: ${index * 50}ms">
                <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <i class="fas fa-building text-green-600 text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-slate-900 text-lg leading-tight break-words">${escapeHtml(institution.name)}</h4>
                        <p class="text-sm text-slate-500 mt-1">ID: ${institution.institution_id}</p>
                        <div class="mt-2 flex items-center space-x-1">
                            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span class="text-xs text-slate-600">Active Client</span>
                        </div>
                    </div>
                    <div class="text-slate-400 flex-shrink-0 self-start mt-1">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `).join('');

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
        selectedInstitution = institution;
        
        // Update UI
        selectedClientName.textContent = institution.name;
        selectedClientId.textContent = `ID: ${institution.institution_id}`;
        
        // Update hidden select for compatibility
        institutionSelect.value = institution.institution_id;
        
        // Show selected client section
        selectedClientSection.classList.remove('hidden');
        
        // Scroll to selected section
        selectedClientSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update card selection visual state
        document.querySelectorAll('.client-card').forEach(card => {
            if (card.dataset.id == institution.institution_id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Load printers for this client
        fetchPrinters();
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

    deselectClientBtn.addEventListener('click', deselectClient);

    // Fetch institutions and render cards
    async function fetchInstitutions() {
        try {
            showLoadingSkeleton();
            const res = await fetch('/api/institutions');
            allInstitutions = await res.json();
            filteredInstitutions = allInstitutions;
            
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
            const res = await fetch(`/api/institutions/${encodeURIComponent(selectedInstitution.institution_id)}/printers`);
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
            const res = await fetch('/api/inventory-items?available=true');
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
            alert('No available printers in inventory.');
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
            const payload = { inventory_item_id: inventoryId };
            try {
                const res = await fetch(`/api/institutions/${encodeURIComponent(selectedInstitution.institution_id)}/printers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                const res = await fetch(`/api/printers/${encodeURIComponent(id)}`, { method: 'DELETE' });
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


