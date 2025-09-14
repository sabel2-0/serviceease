// DOM Elements
const searchInput = document.getElementById('searchParts');
const addPartBtn = document.getElementById('addPartBtn');
const partModal = document.getElementById('partModal');
const closeModal = document.getElementById('closeModal');
const partForm = document.getElementById('partForm');
const cancelBtn = document.getElementById('cancelBtn');
const partsTableBody = document.getElementById('partsTableBody');

// State
let parts = [];
let editingPartId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadParts();
    setupEventListeners();
});

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    addPartBtn.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', () => closeModalHandler());
    cancelBtn.addEventListener('click', () => closeModalHandler());
    partForm.addEventListener('submit', handlePartSubmit);
}

// Modal Handlers
function openModal(part = null) {
    partModal.classList.remove('hidden');
    if (part) {
        editingPartId = part.id;
        document.getElementById('modalTitle').textContent = 'Edit Part';
        document.getElementById('partName').value = part.name;
        document.getElementById('partCategory').value = part.category;
        document.getElementById('partStock').value = part.stock;
    } else {
        editingPartId = null;
        document.getElementById('modalTitle').textContent = 'Add New Part';
        partForm.reset();
    }
}

function closeModalHandler() {
    partModal.classList.add('hidden');
    editingPartId = null;
    partForm.reset();
}

// Parts Management
async function loadParts() {
    try {
        showLoading(true);
        const response = await fetch('/api/parts');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        parts = await response.json();
        renderParts(parts);
    } catch (error) {
        console.error('Error loading parts:', error);
        showError(`Failed to load parts: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Loading state management
function showLoading(isLoading) {
    const tableBody = document.getElementById('partsTableBody');
    if (isLoading) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-slate-600">
                    <div class="flex items-center justify-center">
                        <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Loading...
                    </div>
                </td>
            </tr>
        `;
    }
}

function showError(message) {
    const tableBody = document.getElementById('partsTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-4">
                <div class="flex flex-col items-center justify-center text-red-600">
                    <i class="fas fa-exclamation-circle text-xl mb-2"></i>
                    <p>${message}</p>
                    <button onclick="loadParts()" class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-redo mr-1"></i> Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
    showNotification(message, 'error');
}

async function handlePartSubmit(e) {
    e.preventDefault();
    
    const partData = {
        name: document.getElementById('partName').value,
        category: document.getElementById('partCategory').value,
        stock: parseInt(document.getElementById('partStock').value),
    };

    try {
        const url = editingPartId 
            ? `/api/parts/${editingPartId}`
            : '/api/parts';
        
        const response = await fetch(url, {
            method: editingPartId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(partData),
        });

        if (!response.ok) throw new Error('Failed to save part');

        await loadParts();
        closeModalHandler();
        showNotification(
            `Part successfully ${editingPartId ? 'updated' : 'added'}`,
            'success'
        );
    } catch (error) {
        console.error('Error saving part:', error);
        showNotification('Failed to save part', 'error');
    }
}

async function deletePart(id) {
    if (!confirm('Are you sure you want to delete this part?')) return;

    try {
        const response = await fetch(`/api/parts/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete part');

        await loadParts();
        showNotification('Part successfully deleted', 'success');
    } catch (error) {
        console.error('Error deleting part:', error);
        showNotification('Failed to delete part', 'error');
    }
}

// UI Functions
function renderParts(partsToRender) {
    partsTableBody.innerHTML = partsToRender.map(part => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${part.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${part.category}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm ${part.stock > 10 ? 'text-green-600' : part.stock > 0 ? 'text-yellow-600' : 'text-red-600'}">
                    ${part.stock}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${part.stock > 10 ? 'bg-green-100 text-green-800' : 
                    part.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'}">
                    ${part.stock > 10 ? 'In Stock' : part.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <button onclick="openModal(${JSON.stringify(part)})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePart('${part.id}')" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredParts = parts.filter(part => 
        part.name.toLowerCase().includes(searchTerm) ||
        part.category.toLowerCase().includes(searchTerm)
    );
    renderParts(filteredParts);
}

function showNotification(message, type = 'success') {
    // You can implement a toast notification system here
    alert(message);
}
