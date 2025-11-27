class InventoryPartsManager {
    constructor() {
        this.parts = [];
        this.filteredParts = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortField = 'name';
        this.sortDirection = 'asc';
        this.editingPart = null;
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.showLoading(true);
            await this.loadParts();
            this.showLoading(false);
        } catch (error) {
            console.error('Failed to initialize inventory manager:', error);
            this.showError('Failed to load inventory data');
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        // Add Part Button
        document.getElementById('addPartBtn')?.addEventListener('click', () => {
            this.openAddModal();
        });

        // Modal Controls
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Form Submission
        document.getElementById('partForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Search and Filters
        document.getElementById('searchParts')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.handleCategoryFilter(e.target.value);
        });

        document.getElementById('stockFilter')?.addEventListener('change', (e) => {
            this.handleStockFilter(e.target.value);
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderParts();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredParts.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderParts();
            }
        });

        // Table Sorting
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                this.handleSort(field);
            });
        });

        // Export functionality
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportToCSV();
        });

        // Modal close on outside click
        document.getElementById('partModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'partModal') {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openAddModal();
            }
        });
    }

    async loadParts() {
        try {
            const response = await fetch('/api/parts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Accept either an array (legacy) or a diagnostic object { count, rows }
            let rows = [];
            if (Array.isArray(data)) {
                rows = data;
            } else if (data && Array.isArray(data.rows)) {
                rows = data.rows;
            }
            this.parts = Array.isArray(rows) ? rows : [];
            this.filteredParts = Array.isArray(this.parts) ? [...this.parts] : [];
            this.renderParts();
            this.updateStatistics();
            this.showSuccess(`Loaded ${this.parts.length} printer parts`);
        } catch (error) {
            console.error('Error loading parts:', error);
            this.showError('Failed to load printer parts. Please check your connection.');
            this.parts = [];
            this.filteredParts = [];
            this.renderParts();
        }
    }

    renderParts() {
        this.renderDesktopTable();
        this.renderMobileCards();
        this.updatePagination();
    }

    renderDesktopTable() {
        const tbody = document.getElementById('partsTableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedParts = this.filteredParts.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (paginatedParts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center gap-4">
                            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-search text-slate-400 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-medium text-slate-900 mb-1">No parts found</h3>
                                <p class="text-slate-500">Try adjusting your search or filter criteria</p>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        paginatedParts.forEach(part => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 transition-colors cursor-pointer';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-slate-900">${this.escapeHtml(part.name)}</div>
                            ${part.category ? `<div class="text-sm text-slate-500">${this.formatCategory(part.category)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <div class="text-sm text-slate-900">${this.escapeHtml(part.brand || 'N/A')}</div>
                        ${part.is_universal === 1 ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200"><i class="fas fa-globe mr-1"></i>Universal</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-semibold text-slate-900">${part.quantity || 0}</span>
                        <span class="text-sm text-slate-500">units</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStatusBadge(part)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="inventoryManager.editPart(${part.id})" 
                            class="action-button action-edit" title="Edit Part">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="inventoryManager.deletePart(${part.id}, '${this.escapeHtml(part.name)}')" 
                            class="action-button action-delete" title="Delete Part">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderMobileCards() {
        const container = document.getElementById('mobileCardsContainer');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedParts = this.filteredParts.slice(startIndex, endIndex);

        container.innerHTML = '';

        if (paginatedParts.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-search text-slate-400 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-slate-900 mb-1">No parts found</h3>
                    <p class="text-slate-500">Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }

        paginatedParts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.innerHTML = `
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div>
                            <h3 class="font-semibold text-slate-900 text-sm">${this.escapeHtml(part.name)}</h3>
                            ${part.brand ? `<p class="text-xs text-slate-500">Brand: ${this.escapeHtml(part.brand)}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="inventoryManager.editPart(${part.id})" 
                            class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="inventoryManager.deletePart(${part.id}, '${this.escapeHtml(part.name)}')" 
                            class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</span>
                        <div class="mt-1">
                            <span class="text-sm text-slate-900">${this.escapeHtml(part.brand || 'N/A')}</span>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Quantity</span>
                        <div class="mt-1 flex items-center gap-2">
                            <span class="font-semibold text-slate-900">${part.quantity || 0}</span>
                            <span class="text-xs text-slate-500">units</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</span>
                    ${this.getStatusBadge(part)}
                </div>
            `;
            container.appendChild(card);
        });
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredParts.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredParts.length);

        // Update pagination info
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('showingStart').textContent = this.filteredParts.length > 0 ? startIndex + 1 : 0;
        document.getElementById('showingEnd').textContent = endIndex;
        document.getElementById('totalResults').textContent = this.filteredParts.length;

        // Update button states
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    }

    updateStatistics() {
        const totalParts = this.parts.length;
        const lowStockParts = this.parts.filter(part => {
            const stock = part.quantity || 0;
            const minStock = 5; // Default minimum stock threshold
            return stock > 0 && stock <= minStock;
        }).length;
        const outOfStockParts = this.parts.filter(part => (part.quantity || 0) === 0).length;

        document.getElementById('totalPartsCount').textContent = totalParts;
        document.getElementById('lowStockCount').textContent = lowStockParts;
        document.getElementById('outOfStockCount').textContent = outOfStockParts;
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        this.applyFilters();
    }

    handleCategoryFilter(category) {
        this.applyFilters();
    }

    handleStockFilter(stockLevel) {
        this.applyFilters();
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchParts')?.value.toLowerCase().trim() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';

        this.filteredParts = this.parts.filter(part => {
            // Search filter
            const matchesSearch = !searchTerm || 
                part.name.toLowerCase().includes(searchTerm) ||
                (part.category && part.category.toLowerCase().includes(searchTerm)) ||
                (part.brand && part.brand.toLowerCase().includes(searchTerm));

            // Category filter
            const matchesCategory = !categoryFilter || part.category === categoryFilter;

            // Stock filter
            let matchesStock = true;
            if (stockFilter) {
                const stock = part.quantity || 0;
                const minStock = 5; // Default minimum stock threshold
                
                switch (stockFilter) {
                    case 'in-stock':
                        matchesStock = stock > minStock;
                        break;
                    case 'low-stock':
                        matchesStock = stock > 0 && stock <= minStock;
                        break;
                    case 'out-of-stock':
                        matchesStock = stock === 0;
                        break;
                }
            }

            return matchesSearch && matchesCategory && matchesStock;
        });

        this.currentPage = 1;
        this.renderParts();
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this.filteredParts.sort((a, b) => {
            let aValue = a[field] || '';
            let bValue = b[field] || '';

            if (field === 'stock') {
                aValue = a.quantity || 0;
                bValue = b.quantity || 0;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderParts();
        this.updateSortIcons();
    }

    updateSortIcons() {
        document.querySelectorAll('[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort text-slate-400';
        });

        const currentSortHeader = document.querySelector(`[data-sort="${this.sortField}"] i`);
        if (currentSortHeader) {
            currentSortHeader.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} text-blue-600`;
        }
    }

    openAddModal() {
        this.editingPart = null;
        this.resetForm();
        
        // Show type selection for new parts
        const itemTypeSelectionSection = document.querySelector('#partForm > div:first-child');
        if (itemTypeSelectionSection) {
            itemTypeSelectionSection.classList.remove('hidden');
            itemTypeSelectionSection.style.opacity = '1';
            itemTypeSelectionSection.style.transform = 'translateY(0)';
        }
        
        // Hide form sections initially
        const itemDetailsSection = document.getElementById('itemDetailsSection');
        const actionButtonsSection = document.getElementById('actionButtonsSection');
        
        if (itemDetailsSection) {
            itemDetailsSection.classList.add('hidden');
        }
        
        if (actionButtonsSection) {
            actionButtonsSection.classList.add('hidden');
        }
        
        this.updateModalForAdd();
        this.showModal();
    }

    editPart(partId) {
        const part = this.parts.find(p => p.id === partId);
        if (!part) return;

        this.editingPart = part;
        this.updateModalForEdit();
        
        // Bypass the type selection and show the form directly
        this.showFormForEdit(part);
        
        this.showModal();
    }
    
    showFormForEdit(part) {
        // Determine item type based on category
        const consumableCategories = ['toner', 'ink', 'ink-bottle', 'drum', 'drum-cartridge', 'other-consumable', 'paper', 'cleaning-supplies'];
        const itemType = consumableCategories.includes(part.category) ? 'consumable' : 'part';
        
        // Hide type selection
        const itemTypeSelectionSection = document.querySelector('#partForm > div:first-child');
        if (itemTypeSelectionSection) {
            itemTypeSelectionSection.classList.add('hidden');
        }
        
        // Show form sections
        const itemDetailsSection = document.getElementById('itemDetailsSection');
        const actionButtonsSection = document.getElementById('actionButtonsSection');
        
        if (itemDetailsSection) {
            itemDetailsSection.classList.remove('hidden');
            itemDetailsSection.style.opacity = '1';
            itemDetailsSection.style.transform = 'translateY(0)';
        }
        
        if (actionButtonsSection) {
            actionButtonsSection.classList.remove('hidden');
        }
        
        // Select the radio button (for consistency)
        const radio = document.querySelector(`input[name="itemType"][value="${itemType}"]`);
        if (radio) radio.checked = true;
        
        // Update selected item type text
        const selectedItemType = document.getElementById('selectedItemType');
        if (selectedItemType) {
            selectedItemType.textContent = itemType === 'consumable' ? 'consumable' : 'printer part';
        }
        
        // Populate the form fields
        this.populateForm(part);
    }

    async deletePart(partId, partName) {
        if (!confirm(`Are you sure you want to delete "${partName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`/api/parts/${partId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.loadParts();
            this.showSuccess(`Successfully deleted "${partName}"`);
        } catch (error) {
            console.error('Error deleting part:', error);
            this.showError('Failed to delete part. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleFormSubmit() {
        try {
            const formData = this.getFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            this.showLoading(true);
            
            const url = this.editingPart ? `/api/parts/${this.editingPart.id}` : '/api/parts';
            const method = this.editingPart ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.loadParts();
            this.closeModal();
            
            const action = this.editingPart ? 'updated' : 'added';
            this.showSuccess(`Successfully ${action} "${formData.name}"`);
            
        } catch (error) {
            console.error('Error saving part:', error);
            this.showError('Failed to save part. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    getFormData() {
        return {
            name: document.getElementById('partName')?.value.trim() || '',
            brand: document.getElementById('partBrand')?.value.trim() || '',
            category: document.getElementById('partCategory')?.value || '',
            quantity: parseInt(document.getElementById('partStock')?.value) || 0,
            is_universal: document.getElementById('partUniversal')?.checked ? 1 : 0
        };
    }

    validateForm(formData) {
        if (!formData.name) {
            this.showError('Part name is required');
            document.getElementById('partName')?.focus();
            return false;
        }

        if (!formData.category) {
            this.showError('Category is required');
            document.getElementById('partCategory')?.focus();
            return false;
        }

        if (formData.quantity < 0) {
            this.showError('Stock quantity cannot be negative');
            document.getElementById('partStock')?.focus();
            return false;
        }

        return true;
    }

    populateForm(part) {
        document.getElementById('partName').value = part.name || '';
        document.getElementById('partBrand').value = part.brand || '';
        document.getElementById('partCategory').value = part.category || '';
        document.getElementById('partStock').value = part.quantity || 0;
        document.getElementById('partUniversal').checked = part.is_universal === 1;
    }

    resetForm() {
        document.getElementById('partForm')?.reset();
    }

    updateModalForAdd() {
        document.getElementById('modalTitle').textContent = 'Add New Part';
        document.getElementById('modalIcon').className = 'fas fa-plus-circle text-white text-xl';
        document.getElementById('submitText').textContent = 'Save Part';
    }

    updateModalForEdit() {
        document.getElementById('modalTitle').textContent = 'Edit Part';
        document.getElementById('modalIcon').className = 'fas fa-edit text-white text-xl';
        document.getElementById('submitText').textContent = 'Update Part';
    }

    showModal() {
        const modal = document.getElementById('partModal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('.transform').classList.remove('scale-95');
            }, 10);
            document.getElementById('partName')?.focus();
        }
    }

    closeModal() {
        const modal = document.getElementById('partModal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.querySelector('.transform').classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full ${
            type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:opacity-80">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }

    exportToCSV() {
        if (this.filteredParts.length === 0) {
            this.showError('No data to export');
            return;
        }

        const headers = ['Name', 'Brand', 'Category', 'Quantity', 'Status', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...this.filteredParts.map(part => [
                `"${(part.name || '').replace(/"/g, '""')}"`,
                `"${(part.brand || '').replace(/"/g, '""')}"`,
                part.category || '',
                part.quantity || 0,
                this.getPartStatus(part),
                part.created_at || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `printer-parts-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showSuccess('Export completed successfully');
    }

    // Helper methods
    getPartIcon(category) {
        const icons = {
            'toner': '<i class="fas fa-print"></i>',
            'drum': '<i class="fas fa-cog"></i>',
            'fuser': '<i class="fas fa-fire"></i>',
            'roller': '<i class="fas fa-circle"></i>',
            'other': '<i class="fas fa-tools"></i>'
        };
        return icons[category] || icons['other'];
    }

    getCategoryIcon(category) {
        const icons = {
            'toner': '🖨️',
            'drum': '🔄',
            'fuser': '🔥',
            'roller': '⚙️',
            'other': '🔧'
        };
        return icons[category] || icons['other'];
    }

    formatCategory(category) {
        if (!category) return 'Other';
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    getPartStatus(part) {
        const stock = part.quantity || 0;
        const minStock = 5; // Default minimum stock threshold
        
        if (stock === 0) return 'out-of-stock';
        if (stock <= minStock) return 'low-stock';
        return 'in-stock';
    }

    getStatusBadge(part) {
        const status = this.getPartStatus(part);
        const stock = part.quantity || 0;
        
        const badges = {
            'in-stock': `<span class="status-badge status-in-stock">
                <i class="fas fa-check-circle"></i> In Stock
            </span>`,
            'low-stock': `<span class="status-badge status-low-stock">
                <i class="fas fa-exclamation-triangle"></i> Low Stock
            </span>`,
            'out-of-stock': `<span class="status-badge status-out-of-stock">
                <i class="fas fa-times-circle"></i> Out of Stock
            </span>`
        };
        
        return badges[status] || badges['out-of-stock'];
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the inventory manager when the page loads
let inventoryManager;

document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryPartsManager();
});

// Export for global access
window.inventoryManager = inventoryManager;
