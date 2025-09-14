document.addEventListener('DOMContentLoaded', () => {
    const institutionSelect = document.getElementById('institutionSelect');
    const assignBtn = document.getElementById('assignPrinterBtn');
    const tbody = document.getElementById('printersTbody');
    const emptyState = document.getElementById('emptyState');
    const totalCount = document.getElementById('totalCount');

    // Removed manual input references
    let availableInventory = [];

    async function fetchInstitutions() {
        try {
            const res = await fetch('/api/institutions');
            const institutions = await res.json();
            institutionSelect.innerHTML = '<option value="">Select a client</option>' +
                institutions.map(i => `<option value="${i.institution_id}">${i.name}</option>`).join('');
        } catch (e) {
            console.error('Failed to load institutions', e);
        }
    }

    async function fetchPrinters() {
        const instId = institutionSelect.value;
        if (!instId) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            totalCount.textContent = '';
            return;
        }
        try {
            const res = await fetch(`/api/institutions/${encodeURIComponent(instId)}/printers`);
            const printers = await res.json();
            renderPrinters(printers);
        } catch (e) {
            console.error('Failed to load printers', e);
        }
    }

    function renderPrinters(printers) {
        if (!printers || printers.length === 0) {
            tbody.innerHTML = '';
            emptyState.textContent = 'No printers for this client yet.';
            emptyState.classList.remove('hidden');
            totalCount.textContent = '0 items';
            return;
        }
        emptyState.classList.add('hidden');
        totalCount.textContent = `${printers.length} item${printers.length === 1 ? '' : 's'}`;
        tbody.innerHTML = printers.map(p => `
            <tr data-id="${p.assignment_id}" class="border-b">
                <td class="px-3 py-2">${escapeHtml(p.name || '')}</td>
                <td class="px-3 py-2">${escapeHtml(p.model || '')}</td>
                <td class="px-3 py-2">${escapeHtml(p.serial_number || '')}</td>
                <td class="px-3 py-2 text-right space-x-2">
                    <button class="deleteBtn bg-red-600 text-white px-3 py-1 rounded">Unassign</button>
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
        const instId = institutionSelect.value;
        if (!instId) return alert('Select a client first');
        await loadAvailableInventory();
        if (!availableInventory.length) return alert('No available printers in inventory.');

        // Show a simple selection modal
        const selectList = document.createElement('select');
        selectList.className = 'border rounded px-3 py-2 w-full';
        availableInventory.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = `${i.brand || ''} ${i.model || ''} (${i.serial_number || ''})`;
            selectList.appendChild(opt);
        });
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center';
        modal.innerHTML = `<div class="absolute inset-0 bg-black/40"></div>`;
        const box = document.createElement('div');
        box.className = 'relative bg-white rounded-lg shadow-lg w-full max-w-md p-6';
        box.innerHTML = `<h2 class='text-xl font-semibold mb-4'>Assign Printer</h2>`;
        box.appendChild(selectList);
        const btnRow = document.createElement('div');
        btnRow.className = 'mt-6 flex justify-end gap-2';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'px-4 py-2 rounded-md border';
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Assign';
        confirmBtn.className = 'bg-blue-600 text-white px-4 py-2 rounded-md';
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);

        cancelBtn.onclick = () => document.body.removeChild(modal);
        confirmBtn.onclick = async () => {
            const inventoryId = selectList.value;
            if (!inventoryId) return alert('Select a printer');
            const payload = { inventory_item_id: inventoryId };
            try {
                const res = await fetch(`/api/institutions/${encodeURIComponent(instId)}/printers`, {
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

    tbody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        const id = row.getAttribute('data-id');
        // Removed save functionality as we no longer have location to edit
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

    assignBtn.addEventListener('click', addPrinter);
    institutionSelect.addEventListener('change', fetchPrinters);

    fetchInstitutions().then(async () => {
        await loadAvailableInventory();
        await fetchPrinters();
    });
});


