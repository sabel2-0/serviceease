/**
 * Technician Parts Request System
 * Handles inventory viewing, search, filtering, and parts requests
 */

class TechnicianPartsManager {
    constructor() {
        this.allParts = [];
        this.filteredParts = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.selectedPart = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadPartsInventory();
    }
    
    setupEventListeners() {
        // Search and filter events
        document.getElementById('searchInput')?.addEventListener('input', 
            this.debounce(this.handleSearch.bind(this), 300));
        document.getElementById('categoryFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('stockFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('refreshBtn')?.addEventListener('click', this.loadPartsInventory.bind(this));
        
        // Modal events
        document.getElementById('closeModal')?.addEventListener('click', this.closeModal.bind(this));
        document.getElementById('cancelRequest')?.addEventListener('click', this.closeModal.bind(this));
        document.getElementById('submitRequest')?.addEventListener('click', this.handleSubmitRequest.bind(this));
        
        // Quantity controls
        document.getElementById('increaseQty')?.addEventListener('click', this.increaseQuantity.bind(this));
        document.getElementById('decreaseQty')?.addEventListener('click', this.decreaseQuantity.bind(this));
        document.getElementById('requestQuantity')?.addEventListener('input', this.updateQuantityDisplay.bind(this));
        
        // Close modal on backdrop click
        document.getElementById('requestModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'requestModal') {
                this.closeModal();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    async loadPartsInventory() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/parts', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const parts = await response.json();
            console.log('Loaded parts:', parts);
            
            this.allParts = parts;
            this.filteredParts = [...parts];
            this.renderParts();
            
            this.hideLoading();
            
            // Show success toast
            this.showToast('success', 'Inventory Loaded', `Found ${parts.length} parts in inventory`);
            
        } catch (error) {
            console.error('Error loading parts:', error);
            this.hideLoading();
            this.showEmptyState();
            this.showToast('error', 'Loading Failed', 'Could not load parts inventory. Please try again.');
        }
    }
    
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        this.filterParts(searchTerm);
    }
    
    handleFilter() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        this.filterParts(searchTerm);
    }
    
    filterParts(searchTerm = '') {
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';
        
        this.filteredParts = this.allParts.filter(part => {
            // Search filter
            const matchesSearch = !searchTerm || 
                part.name.toLowerCase().includes(searchTerm) ||
                part.category?.toLowerCase().includes(searchTerm) ||
                part.part_number?.toLowerCase().includes(searchTerm) ||
                part.description?.toLowerCase().includes(searchTerm);
            
            // Category filter
            const matchesCategory = !categoryFilter || part.category === categoryFilter;
            
            // Stock filter
            const matchesStock = !stockFilter || this.getStockStatus(part.stock) === stockFilter;
            
            return matchesSearch && matchesCategory && matchesStock;
        });
        
        this.currentPage = 1;
        this.renderParts();
    }
    
    getStockStatus(quantity) {
        if (quantity === 0) return 'out_of_stock';
        if (quantity <= 10) return 'low_stock';
        return 'in_stock';
    }
    
    getStockStatusText(quantity) {
        const status = this.getStockStatus(quantity);
        switch (status) {
            case 'in_stock': return 'In Stock';
            case 'low_stock': return 'Low Stock';
            case 'out_of_stock': return 'Out of Stock';
            default: return 'Unknown';
        }
    }
    
    getStockStatusClass(quantity) {
        const status = this.getStockStatus(quantity);
        switch (status) {
            case 'in_stock': return 'stock-in';
            case 'low_stock': return 'stock-low';
            case 'out_of_stock': return 'stock-out';
            default: return 'stock-out';
        }
    }
    
    renderParts() {
        const container = document.getElementById('partsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;
        
        if (this.filteredParts.length === 0) {
            container.classList.add('hidden');
            emptyState?.classList.remove('hidden');
            return;
        }
        
        emptyState?.classList.add('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = this.filteredParts.map(part => this.createPartCard(part)).join('');
        
        // Attach event listeners to request buttons
        this.attachPartEventListeners();
    }
    
    createPartCard(part) {
        const stockStatus = this.getStockStatus(part.stock);
        const stockClass = this.getStockStatusClass(part.stock);
        const stockText = this.getStockStatusText(part.stock);
        const canRequest = part.stock > 0;
        
        return `
            <div class="parts-card" data-part-id="${part.id}">
                <div class="part-header">
                    <div>
                        <h3 class="part-title">${this.escapeHtml(part.name)}</h3>
                        ${part.part_number ? `<span class="part-number">${this.escapeHtml(part.part_number)}</span>` : ''}
                    </div>
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </div>
                
                <div class="part-details">
                    <div class="detail-row">
                        <span class="detail-label">Category</span>
                        <span class="detail-value">
                            ${part.category ? `<span class="category-tag">${this.escapeHtml(part.category)}</span>` : 'N/A'}
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Available Quantity</span>
                        <span class="detail-value quantity-display">${part.stock} units</span>
                    </div>
                    
                    ${part.minimum_stock ? `
                    <div class="detail-row">
                        <span class="detail-label">Minimum Stock</span>
                        <span class="detail-value">${part.minimum_stock} units</span>
                    </div>
                    ` : ''}
                    
                    ${part.description ? `
                    <div class="detail-row">
                        <span class="detail-label">Description</span>
                        <span class="detail-value">${this.escapeHtml(part.description)}</span>
                    </div>
                    ` : ''}
                    
                    ${part.compatible_printers ? `
                    <div class="detail-row">
                        <span class="detail-label">Compatible</span>
                        <span class="detail-value">${this.escapeHtml(part.compatible_printers)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="part-actions">
                    <button class="request-btn" data-part-id="${part.id}" ${!canRequest ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                        ${canRequest ? 'Request Part' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `;
    }
    
    attachPartEventListeners() {
        document.querySelectorAll('.request-btn').forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', (e) => {
                    const partId = parseInt(e.target.closest('[data-part-id]').dataset.partId);
                    this.openRequestModal(partId);
                });
            }
        });
    }
    
    openRequestModal(partId) {
        const part = this.allParts.find(p => p.id === partId);
        if (!part) {
            this.showToast('error', 'Error', 'Part not found');
            return;
        }
        
        this.selectedPart = part;
        
        // Populate modal
        document.getElementById('partName').value = part.name;
        document.getElementById('requestQuantity').value = 1;
        document.getElementById('qtyDisplay').textContent = '1';
        document.getElementById('requestReason').value = '';
        document.getElementById('requestPriority').value = 'medium';
        
        // Show modal
        document.getElementById('requestModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        document.getElementById('requestModal').classList.remove('active');
        document.body.style.overflow = '';
        this.selectedPart = null;
    }
    
    increaseQuantity() {
        const input = document.getElementById('requestQuantity');
        const display = document.getElementById('qtyDisplay');
        const currentValue = parseInt(input.value) || 1;
        const maxValue = Math.min(this.selectedPart?.stock || 100, 100);
        
        if (currentValue < maxValue) {
            const newValue = currentValue + 1;
            input.value = newValue;
            display.textContent = newValue;
        }
    }
    
    decreaseQuantity() {
        const input = document.getElementById('requestQuantity');
        const display = document.getElementById('qtyDisplay');
        const currentValue = parseInt(input.value) || 1;
        
        if (currentValue > 1) {
            const newValue = currentValue - 1;
            input.value = newValue;
            display.textContent = newValue;
        }
    }
    
    updateQuantityDisplay() {
        const input = document.getElementById('requestQuantity');
        const display = document.getElementById('qtyDisplay');
        const value = Math.max(1, Math.min(parseInt(input.value) || 1, this.selectedPart?.stock || 100));
        
        input.value = value;
        display.textContent = value;
    }
    
    async handleSubmitRequest() {
        if (!this.selectedPart) {
            this.showToast('error', 'Error', 'No part selected');
            return;
        }
        
        const quantity = parseInt(document.getElementById('requestQuantity').value);
        const reason = document.getElementById('requestReason').value.trim();
        const priority = document.getElementById('requestPriority').value;
        
        // Validation
        if (quantity < 1 || quantity > this.selectedPart.stock) {
            this.showToast('error', 'Invalid Quantity', `Please request between 1 and ${this.selectedPart.stock} units`);
            return;
        }
        
        if (!reason) {
            this.showToast('error', 'Reason Required', 'Please provide a reason for this request');
            return;
        }
        
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }
            
            const requestData = {
                part_id: this.selectedPart.id,
                technician_id: user.id,
                quantity_requested: quantity,
                reason: reason,
                priority: priority,
                status: 'pending'
            };
            
            console.log('Submitting parts request:', requestData);
            
            const response = await fetch('/api/parts-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Parts request submitted:', result);
            
            this.showToast('success', 'Request Submitted', 
                `Your request for ${quantity} ${this.selectedPart.name} has been submitted successfully`);
            
            this.closeModal();
            
            // Optionally refresh the inventory to show updated stock
            // this.loadPartsInventory();
            
        } catch (error) {
            console.error('Error submitting parts request:', error);
            this.showToast('error', 'Submission Failed', 
                error.message || 'Could not submit your request. Please try again.');
        }
    }
    
    showLoading() {
        document.getElementById('loadingState')?.classList.remove('hidden');
        document.getElementById('partsGrid')?.classList.add('hidden');
        document.getElementById('emptyState')?.classList.add('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingState')?.classList.add('hidden');
    }
    
    showEmptyState() {
        document.getElementById('partsGrid')?.classList.add('hidden');
        document.getElementById('emptyState')?.classList.remove('hidden');
    }
    
    showToast(type, title, message) {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-title">${this.escapeHtml(title)}</div>
            <div class="toast-message">${this.escapeHtml(message)}</div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Allow manual close on click
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
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

// Global functions for page initialization
window.loadPartsInventory = function() {
    if (window.partsManager) {
        window.partsManager.loadPartsInventory();
    }
};

window.setupEventListeners = function() {
    // This function is called from the HTML
    // The actual setup is done in the constructor
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Initialize the parts manager
    window.partsManager = new TechnicianPartsManager();
});



