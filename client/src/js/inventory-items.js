// Global variables for grouped view
let currentItems = [];

// Global utility function
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
    const openAdd = document.getElementById('openAddPrinter');
    const modal = document.getElementById('addPrinterModal');
    const closeAdd = document.getElementById('closeAddPrinter');
    const cancelAdd = document.getElementById('cancelAddPrinter');
    const confirmAdd = document.getElementById('confirmAddPrinter');
    const modalBrand = document.getElementById('modalBrand');
    const modalModel = document.getElementById('modalModel');
    const modalSerial = document.getElementById('modalSerial');
    const count = document.getElementById('invCount');
    const filterAvailable = document.getElementById('filterAvailable');
    
    // Edit modal elements
    const editModal = document.getElementById('editPrinterModal');
    const closeEdit = document.getElementById('closeEditPrinter');
    const cancelEdit = document.getElementById('cancelEditPrinter');
    const confirmEdit = document.getElementById('confirmEditPrinter');
    const editModalBrand = document.getElementById('editModalBrand');
    const editModalModel = document.getElementById('editModalModel');
    const editPrinterBrand = document.getElementById('editPrinterBrand');
    const editPrinterModel = document.getElementById('editPrinterModel');
    
    // Edit unit modal elements
    const editUnitModal = document.getElementById('editPrinterUnitModal');
    const closeEditUnit = document.getElementById('closeEditUnit');
    const cancelEditUnit = document.getElementById('cancelEditUnit');
    const confirmEditUnit = document.getElementById('confirmEditUnit');
    const editUnitId = document.getElementById('editUnitId');
    const editUnitBrand = document.getElementById('editUnitBrand');
    const editUnitModel = document.getElementById('editUnitModel');
    const editUnitSerial = document.getElementById('editUnitSerial');
    
    // View info modal elements
    const viewInfoModal = document.getElementById('viewPrinterInfoModal');
    const closeViewInfo = document.getElementById('closeViewInfo');
    const closeViewInfoBtn = document.getElementById('closeViewInfoBtn');
    
    // Grouped view elements
    const groupedTbody = document.getElementById('groupedTbody');
    const groupedEmpty = document.getElementById('groupedEmpty');

    async function fetchInventory() {
        try {
            const token = localStorage.getItem('token');
            const q = filterAvailable.checked ? '?available=true' : '';
            const res = await fetch(`/api/inventory-items${q}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const items = await res.json();
            currentItems = items;
            render(items);
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        }
    }

    function groupItemsByModel(items) {
        const grouped = {};
        items.forEach(item => {
            const key = `${item.brand || 'Unknown'}-${item.model || 'Unknown'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    brand: item.brand || 'Unknown',
                    model: item.model || 'Unknown',
                    items: [],
                    totalQuantity: 0,
                    available: 0,
                    assigned: 0
                };
            }
            grouped[key].items.push(item);
            
            const quantity = item.quantity || 1;
            grouped[key].totalQuantity += quantity;
            
            const status = item.status || 'available';
            if (status === 'available') {
                grouped[key].available += quantity;
            } else if (status === 'assigned') {
                grouped[key].assigned += quantity;
            }
        });
        return Object.values(grouped);
    }

    function renderGrouped(items) {
        const grouped = groupItemsByModel(items);
        
        if (grouped.length === 0) {
            groupedTbody.innerHTML = '';
            groupedEmpty.classList.remove('hidden');
            count.textContent = '0 models';
            return;
        }
        
        groupedEmpty.classList.add('hidden');
        const totalQuantity = grouped.reduce((sum, group) => sum + group.totalQuantity, 0);
        count.textContent = `${grouped.length} model${grouped.length === 1 ? '' : 's'} (${totalQuantity} unit${totalQuantity === 1 ? '' : 's'})`;
        
        groupedTbody.innerHTML = grouped.map((group, index) => `
            <tr class="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                <td class="px-3 sm:px-6 py-5">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                            <i class="fas fa-printer text-slate-400 text-lg"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-sm sm:text-base">Brand: ${escapeHtml(group.brand)}</div>
                            <div class="text-xs sm:text-sm text-slate-600 mt-1">Model: ${escapeHtml(group.model)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-3 sm:px-6 py-5 text-center">
                    <span class="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-slate-100 text-slate-800 shadow-sm">
                        <i class="fas fa-layer-group mr-1 sm:mr-2 text-xs"></i>
                        ${group.totalQuantity}
                    </span>
                </td>
                <td class="px-3 sm:px-6 py-5 text-center">
                    <span class="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${group.available > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}">
                        <i class="fas fa-check-circle mr-1 sm:mr-2 text-xs"></i>
                        ${group.available}
                    </span>
                </td>
                <td class="px-3 sm:px-6 py-5 text-center">
                    <span class="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${group.assigned > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}">
                        <i class="fas fa-user-check mr-1 sm:mr-2 text-xs"></i>
                        ${group.assigned}
                    </span>
                </td>
                <td class="px-3 sm:px-6 py-5 text-right">
                    <div class="flex flex-col sm:flex-row items-end sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                        <button onclick="editPrinterModel('${escapeHtml(group.brand)}', '${escapeHtml(group.model)}')" 
                                class="inline-flex items-center px-3 sm:px-4 py-2 border border-emerald-300 rounded-lg text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 transition-all duration-200 shadow-sm w-full sm:w-auto justify-center">
                            <i class="fas fa-edit mr-1 sm:mr-2 text-xs"></i>
                            <span class="hidden sm:inline">Edit</span>
                            <span class="sm:hidden">Edit</span>
                        </button>
                        <button onclick="viewModelDetails('${escapeHtml(group.brand)}', '${escapeHtml(group.model)}')" 
                                class="inline-flex items-center px-3 sm:px-4 py-2 border border-blue-300 rounded-lg text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 shadow-sm w-full sm:w-auto justify-center">
                            <i class="fas fa-eye mr-1 sm:mr-2 text-xs"></i>
                            <span class="hidden sm:inline">View Printers</span>
                            <span class="sm:hidden">View</span>
                        </button>
                        <button onclick="addToModel('${escapeHtml(group.brand)}', '${escapeHtml(group.model)}')" 
                                class="inline-flex items-center px-3 sm:px-4 py-2 border border-blue-300 rounded-lg text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 shadow-sm w-full sm:w-auto justify-center">
                            <i class="fas fa-plus mr-1 sm:mr-2 text-xs"></i>
                            <span class="hidden sm:inline">Add Unit</span>
                            <span class="sm:hidden">Add</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function render(items) {
        renderGrouped(items);
    }

    function openModal() { 
        // Reset fields for new printer (all editable)
        modalBrand.value = '';
        modalModel.value = '';
        modalSerial.value = '';
        
        // Enable all fields
        modalBrand.disabled = false;
        modalModel.disabled = false;
        modalBrand.classList.remove('bg-gray-100', 'cursor-not-allowed');
        modalModel.classList.remove('bg-gray-100', 'cursor-not-allowed');
        
        // Update modal title
        const modalTitle = modal.querySelector('h2');
        modalTitle.textContent = 'Add New Printer';
        
        modal.classList.remove('hidden'); 
        setTimeout(() => { modalBrand.focus(); }, 0); 
    }
    
    function closeModal() { 
        modal.classList.add('hidden');
        
        // Reset form to default state
        modalBrand.value = '';
        modalModel.value = '';
        modalSerial.value = '';
        
        // Re-enable all fields
        modalBrand.disabled = false;
        modalModel.disabled = false;
        modalBrand.classList.remove('bg-gray-100', 'cursor-not-allowed');
        modalModel.classList.remove('bg-gray-100', 'cursor-not-allowed');
    }

    async function addItem() {
        try {
            const token = localStorage.getItem('token');
            const quantity = 1; // Single printer unit
            const res = await fetch('/api/inventory-items', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    brand: modalBrand.value,
                    model: modalModel.value,
                    serial_number: modalSerial.value,
                    quantity: quantity
                })
            });
            if (!res.ok) throw new Error('Failed to add');
            closeModal();
            modalBrand.value = '';
            modalModel.value = '';
            modalSerial.value = '';
            fetchInventory();
        } catch (err) {
            console.error(err);
            alert('Failed to add printer');
        }
    }

    openAdd.addEventListener('click', openModal);
    closeAdd.addEventListener('click', closeModal);
    cancelAdd.addEventListener('click', closeModal);
    confirmAdd.addEventListener('click', addItem);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    // Edit modal event listeners
    closeEdit.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    confirmEdit.addEventListener('click', updatePrinterModel);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    
    // Edit unit modal event listeners
    closeEditUnit.addEventListener('click', closeEditUnitModal);
    cancelEditUnit.addEventListener('click', closeEditUnitModal);
    confirmEditUnit.addEventListener('click', updatePrinterUnit);
    editUnitModal.addEventListener('click', (e) => { if (e.target === editUnitModal) closeEditUnitModal(); });
    
    // View info modal event listeners
    closeViewInfo.addEventListener('click', closeViewInfoModal);
    closeViewInfoBtn.addEventListener('click', closeViewInfoModal);
    viewInfoModal.addEventListener('click', (e) => { if (e.target === viewInfoModal) closeViewInfoModal(); });
    
    filterAvailable.addEventListener('change', fetchInventory);
    fetchInventory();
    
    // View info modal functions
    function closeViewInfoModal() {
        viewInfoModal.classList.add('hidden');
    }
    
    // Edit modal functions
    function closeEditModal() {
        editModal.classList.add('hidden');
        editModalBrand.value = '';
        editModalModel.value = '';
        editPrinterBrand.value = '';
        editPrinterModel.value = '';
    }
    
    async function updatePrinterModel() {
        const oldBrand = editPrinterBrand.value;
        const oldModel = editPrinterModel.value;
        const newBrand = editModalBrand.value.trim();
        const newModel = editModalModel.value.trim();
        
        if (!newBrand || !newModel) {
            alert('Please enter both brand and model name');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            // Fetch all items with the old brand/model
            const res = await fetch('/api/inventory-items', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const items = await res.json();
            const itemsToUpdate = items.filter(item => 
                item.brand === oldBrand && item.model === oldModel
            );
            
            if (itemsToUpdate.length === 0) {
                alert('No items found to update');
                closeEditModal();
                return;
            }
            
            // Update each item
            const updatePromises = itemsToUpdate.map(item => 
                fetch(`/api/inventory-items/${item.id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        brand: newBrand,
                        model: newModel
                    })
                })
            );
            
            await Promise.all(updatePromises);
            
            closeEditModal();
            fetchInventory();
            alert(`Successfully updated ${itemsToUpdate.length} printer(s)`);
        } catch (err) {
            console.error('Error updating printer model:', err);
            alert('Failed to update printer model');
        }
    }
    
    // Edit unit modal functions
    function closeEditUnitModal() {
        editUnitModal.classList.add('hidden');
        editUnitId.value = '';
        editUnitBrand.value = '';
        editUnitModel.value = '';
        editUnitSerial.value = '';
    }
    
    async function updatePrinterUnit() {
        const unitId = editUnitId.value;
        const newSerial = editUnitSerial.value.trim();
        
        if (!newSerial) {
            alert('Please enter a serial number');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/inventory-items/${unitId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    serial_number: newSerial
                })
            });
            
            if (!res.ok) {
                throw new Error('Failed to update printer unit');
            }
            
            closeEditUnitModal();
            
            // Refresh the printers list in the view modal
            if (window.currentViewBrand && window.currentViewModel) {
                loadPrintersForModel(window.currentViewBrand, window.currentViewModel, 'all');
            }
            
            // Also refresh the main inventory
            fetchInventory();
            
            alert('Serial number updated successfully!');
        } catch (err) {
            console.error('Error updating printer unit:', err);
            alert('Failed to update serial number');
        }
    }
});

// Global functions for grouped view actions
window.viewPrinterInfo = async function(unitId) {
    try {
        // Fetch the printer details
        const res = await fetch(`/api/inventory-items/${unitId}`);
        if (!res.ok) {
            throw new Error('Failed to fetch printer information');
        }
        
        const printer = await res.json();
        
        // Populate the modal fields
        document.getElementById('viewInfoBrand').textContent = printer.brand || 'N/A';
        document.getElementById('viewInfoModel').textContent = printer.model || 'N/A';
        document.getElementById('viewInfoSerial').textContent = printer.serial_number || 'N/A';
        document.getElementById('viewInfoStatus').textContent = printer.status || 'N/A';
        
        // Handle institution
        const institutionEl = document.getElementById('viewInfoInstitution');
        if (printer.status === 'assigned' && printer.institution_name) {
            institutionEl.textContent = printer.institution_name;
        } else {
            institutionEl.textContent = 'Not assigned';
            institutionEl.classList.add('text-gray-400');
        }
        
        // Handle location
        document.getElementById('viewInfoLocation').textContent = printer.location || 'Not specified';
        
        // Format and display date added
        const dateAddedEl = document.getElementById('viewInfoDateAdded');
        if (printer.created_at) {
            const date = new Date(printer.created_at);
            const formatted = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            dateAddedEl.textContent = formatted;
        } else {
            dateAddedEl.textContent = 'Unknown';
        }
        
        // Show the modal
        document.getElementById('viewPrinterInfoModal').classList.remove('hidden');
        
    } catch (err) {
        console.error('Error fetching printer info:', err);
        alert('Failed to load printer information');
    }
};

window.editPrinterModel = function(brand, model) {
    // Set the old values in hidden fields
    document.getElementById('editPrinterBrand').value = brand;
    document.getElementById('editPrinterModel').value = model;
    
    // Pre-fill the edit fields with current values
    document.getElementById('editModalBrand').value = brand;
    document.getElementById('editModalModel').value = model;
    
    // Show the modal
    document.getElementById('editPrinterModal').classList.remove('hidden');
    
    // Focus on brand field
    setTimeout(() => { document.getElementById('editModalBrand').focus(); }, 0);
};

window.editPrinterUnit = function(unitId, brand, model, serialNumber) {
    // Set the unit ID
    document.getElementById('editUnitId').value = unitId;
    
    // Pre-fill brand and model (readonly)
    document.getElementById('editUnitBrand').value = brand;
    document.getElementById('editUnitModel').value = model;
    
    // Pre-fill serial number (editable)
    document.getElementById('editUnitSerial').value = serialNumber;
    
    // Show the modal
    document.getElementById('editPrinterUnitModal').classList.remove('hidden');
    
    // Focus on serial number field
    setTimeout(() => { document.getElementById('editUnitSerial').focus(); }, 0);
};

window.viewModelDetails = function(brand, model) {
    // Store current brand and model for filtering
    window.currentViewBrand = brand;
    window.currentViewModel = model;
    
    // Update modal title
    document.getElementById('viewPrintersTitle').textContent = `${brand} ${model} - Printers`;
    
    // Show the modal
    document.getElementById('viewPrintersModal').classList.remove('hidden');
    
    // Load all printers for this model by default
    loadPrintersForModel(brand, model, 'all');
};

window.addToModel = function(brand, model) {
    // Pre-fill the add printer modal with the brand and model (readonly)
    document.getElementById('modalBrand').value = brand;
    document.getElementById('modalModel').value = model;
    document.getElementById('modalSerial').value = '';
    
    // Make brand and model readonly since we're adding to existing model
    const brandField = document.getElementById('modalBrand');
    const modelField = document.getElementById('modalModel');
    
    brandField.disabled = true;
    modelField.disabled = true;
    brandField.classList.add('bg-gray-100', 'cursor-not-allowed');
    modelField.classList.add('bg-gray-100', 'cursor-not-allowed');
    
    // Update modal title to reflect adding units to existing model
    const modal = document.getElementById('addPrinterModal');
    const modalTitle = modal.querySelector('h2');
    modalTitle.textContent = `Add Units to ${brand} ${model}`;
    
    document.getElementById('addPrinterModal').classList.remove('hidden');
    document.getElementById('modalSerial').focus();
};

// Functions for the View Printers Modal
window.closeViewPrintersModal = function() {
    document.getElementById('viewPrintersModal').classList.add('hidden');
};

window.loadPrintersForModel = async function(brand, model, status = 'all') {
    try {
        console.log('Loading printers for:', { brand, model, status });
        
        // Update button states
        updateStatusButtons(status);
        
        // Show loading state
        document.getElementById('printersListTbody').innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';
        
        const token = localStorage.getItem('token');
        // Fetch inventory items with assignment information
        const res = await fetch('/api/inventory-items?assignments=true', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const items = await res.json();
        console.log('Fetched items with assignments:', items);
        
        // Filter items by brand and model
        let filteredItems = items.filter(item => 
            item.brand === brand && item.model === model
        );
        
        // Apply status filter
        if (status !== 'all') {
            filteredItems = filteredItems.filter(item => item.status === status);
        }
        
        console.log('Final filtered items:', filteredItems);
        
        // Render the filtered printers
        renderPrintersList(filteredItems);
        
    } catch (error) {
        console.error('Error loading printers:', error);
        const errorMsg = error.message || 'Unknown error occurred';
        document.getElementById('printersListTbody').innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-red-600 py-4">
                    <div>Error loading printers</div>
                    <div class="text-sm text-gray-600 mt-1">${errorMsg}</div>
                    <button onclick="loadPrintersForModel('${brand}', '${model}', '${status}')" 
                            class="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        Retry
                    </button>
                </td>
            </tr>
        `;
    }
};

function updateStatusButtons(activeStatus) {
    const buttons = {
        'all': document.getElementById('showAllPrinters'),
        'assigned': document.getElementById('showAssignedPrinters'),
        'available': document.getElementById('showAvailablePrinters')
    };
    
    // Reset all buttons to inactive state
    Object.entries(buttons).forEach(([status, btn]) => {
        if (btn) {
            if (status === 'assigned') {
                btn.className = 'px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200';
            } else if (status === 'available') {
                btn.className = 'px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200';
            } else {
                btn.className = 'px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200';
            }
        }
    });
    
    // Highlight active button
    if (buttons[activeStatus]) {
        if (activeStatus === 'assigned') {
            buttons[activeStatus].className = 'px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg';
        } else if (activeStatus === 'available') {
            buttons[activeStatus].className = 'px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg';
        } else {
            buttons[activeStatus].className = 'px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg';
        }
    }
}

function renderPrintersList(printers) {
    const tbody = document.getElementById('printersListTbody');
    const empty = document.getElementById('printersListEmpty');
    
    console.log('renderPrintersList called with:', printers);
    
    if (!printers || printers.length === 0) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    
    empty.classList.add('hidden');
    tbody.innerHTML = printers.map((printer, index) => {
        console.log('Rendering printer:', printer);
        console.log('Institution name:', printer.institution_name);
        
        return `
        <tr class="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <i class="fas fa-barcode text-slate-400"></i>
                    </div>
                    <span class="font-mono text-sm font-semibold text-slate-700">${escapeHtml(printer.serial_number || 'N/A')}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getStatusBadgeClass(printer.status)}">
                    ${getStatusIcon(printer.status)}
                    ${printer.status || 'available'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                    ${printer.status === 'assigned' && printer.institution_name ? 
                        `<i class="fas fa-building text-blue-500 text-sm"></i>
                         <span class="text-sm font-medium text-slate-700">${escapeHtml(printer.institution_name)}</span>` : 
                        `<i class="fas fa-minus text-gray-300 text-sm"></i>
                         <span class="text-gray-400 text-sm">Not assigned</span>`}
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end space-x-2">
                    <button onclick="viewPrinterInfo(${printer.id})" 
                            class="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 shadow-sm">
                        <i class="fas fa-eye mr-2 text-xs"></i>
                        View
                    </button>
                    <button onclick="editPrinterUnit(${printer.id}, '${escapeHtml(printer.brand)}', '${escapeHtml(printer.model)}', '${escapeHtml(printer.serial_number || '')}')" 
                            class="inline-flex items-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all duration-200 shadow-sm">
                        <i class="fas fa-edit mr-2 text-xs"></i>
                        Edit
                    </button>
                    ${printer.status === 'available' ? 
                        `<button onclick="goToAssignPrinter('${escapeHtml(printer.brand)}', '${escapeHtml(printer.model)}')" 
                                class="inline-flex items-center px-4 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-200 shadow-sm">
                            <i class="fas fa-link mr-2 text-xs"></i>
                            Assign
                        </button>` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'assigned':
            return 'bg-blue-100 text-blue-800';
        case 'available':
            return 'bg-green-100 text-green-800';
        case 'retired':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'assigned':
            return '<i class="fas fa-user-check mr-2 text-xs"></i>';
        case 'available':
            return '<i class="fas fa-check-circle mr-2 text-xs"></i>';
        case 'retired':
            return '<i class="fas fa-archive mr-2 text-xs"></i>';
        default:
            return '<i class="fas fa-question-circle mr-2 text-xs"></i>';
    }
}

// Add event listeners for the status filter buttons when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for modal buttons (these might not exist on initial load)
    setTimeout(() => {
        const showAllBtn = document.getElementById('showAllPrinters');
        const showAssignedBtn = document.getElementById('showAssignedPrinters');
        const showAvailableBtn = document.getElementById('showAvailablePrinters');
        
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                if (window.currentViewBrand && window.currentViewModel) {
                    loadPrintersForModel(window.currentViewBrand, window.currentViewModel, 'all');
                }
            });
        }
        
        if (showAssignedBtn) {
            showAssignedBtn.addEventListener('click', () => {
                if (window.currentViewBrand && window.currentViewModel) {
                    loadPrintersForModel(window.currentViewBrand, window.currentViewModel, 'assigned');
                }
            });
        }
        
        if (showAvailableBtn) {
            showAvailableBtn.addEventListener('click', () => {
                if (window.currentViewBrand && window.currentViewModel) {
                    loadPrintersForModel(window.currentViewBrand, window.currentViewModel, 'available');
                }
            });
        }
    }, 100);
});
// Function to navigate to client-printers page
window.goToAssignPrinter = function(brand, model) {
    // Navigate to client-printers page
    window.location.href = '/pages/admin/client-printers.html';
};








