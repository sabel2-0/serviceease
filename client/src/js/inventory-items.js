document.addEventListener('DOMContentLoaded', () => {
    const openAdd = document.getElementById('openAddPrinter');
    const modal = document.getElementById('addPrinterModal');
    const closeAdd = document.getElementById('closeAddPrinter');
    const cancelAdd = document.getElementById('cancelAddPrinter');
    const confirmAdd = document.getElementById('confirmAddPrinter');
    const modalBrand = document.getElementById('modalBrand');
    const modalModel = document.getElementById('modalModel');
    const modalSerial = document.getElementById('modalSerial');
    const tbody = document.getElementById('invTbody');
    const empty = document.getElementById('invEmpty');
    const count = document.getElementById('invCount');
    const filterAvailable = document.getElementById('filterAvailable');

    async function fetchInventory() {
        try {
            const q = filterAvailable.checked ? '?available=true' : '';
            const res = await fetch(`/api/inventory-items${q}`);
            const items = await res.json();
            render(items);
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        }
    }

    function render(items) {
        if (!items || items.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            count.textContent = '0 items';
            return;
        }
        empty.classList.add('hidden');
        count.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
        tbody.innerHTML = items.map(i => `
            <tr data-id="${i.id}" class="border-b" data-edit-mode="false">
                <td class="px-3 py-2">
                    <span class="view-mode">${escapeHtml(i.brand || '')}</span>
                    <input class="edit-mode w-full border rounded px-2 py-1 hidden" value="${escapeHtml(i.brand || '')}" placeholder="Brand">
                </td>
                <td class="px-3 py-2">
                    <span class="view-mode">${escapeHtml(i.model || '')}</span>
                    <input class="edit-mode w-full border rounded px-2 py-1 hidden" value="${escapeHtml(i.model || '')}" placeholder="Model">
                </td>
                <td class="px-3 py-2">
                    <span class="view-mode">${escapeHtml(i.serial_number || '')}</span>
                    <input class="edit-mode w-full border rounded px-2 py-1 hidden" value="${escapeHtml(i.serial_number || '')}" placeholder="Serial Number">
                </td>
                <td class="px-3 py-2">
                    <span class="view-mode">${i.status || 'available'}</span>
                    <select class="edit-mode statusSel border rounded px-2 py-1 hidden">
                        ${['available','assigned','retired'].map(s => `<option value="${s}" ${i.status===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td class="px-3 py-2 text-right space-x-2">
                    <button class="editBtn view-mode bg-blue-600 text-white px-3 py-1 rounded">Edit</button>
                    <button class="saveBtn edit-mode bg-green-600 text-white px-3 py-1 rounded hidden">Save</button>
                    <button class="cancelBtn edit-mode bg-gray-500 text-white px-3 py-1 rounded hidden">Cancel</button>
                    <button class="deleteBtn bg-red-600 text-white px-3 py-1 rounded">Delete</button>
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

    function openModal() { modal.classList.remove('hidden'); setTimeout(() => { modalName.focus(); }, 0); }
    function closeModal() { modal.classList.add('hidden'); }

    async function addItem() {
        const payload = {
            brand: modalBrand.value.trim() || null,
            model: modalModel.value.trim() || null,
            serial_number: modalSerial.value.trim() || null,
        };
        if (!payload.brand && !payload.model) return alert('Brand or Model is required');
        try {
            const res = await fetch('/api/inventory-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create');
            modalBrand.value = '';
            modalModel.value = '';
            modalSerial.value = '';
            closeModal();
            await fetchInventory();
        } catch (e) {
            console.error(e);
            alert('Failed to add item');
        }
    }

    function setEditMode(row, isEdit) {
        row.setAttribute('data-edit-mode', isEdit);
        row.querySelectorAll('.view-mode').forEach(el => el.classList.toggle('hidden', isEdit));
        row.querySelectorAll('.edit-mode').forEach(el => el.classList.toggle('hidden', !isEdit));
    }

    tbody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        const id = row.getAttribute('data-id');
        
        if (e.target.classList.contains('editBtn')) {
            setEditMode(row, true);
            return;
        }

        if (e.target.classList.contains('cancelBtn')) {
            await fetchInventory(); // Reset to original values
            return;
        }

        if (e.target.classList.contains('saveBtn')) {
            const [brandI, modelI, serialI] = row.querySelectorAll('input');
            const statusSel = row.querySelector('select.statusSel');
            const payload = {
                brand: brandI.value.trim() || null,
                model: modelI.value.trim() || null,
                serial_number: serialI.value.trim() || null,
                status: statusSel.value
            };
            try {
                const res = await fetch(`/api/inventory-items/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to save');
                await fetchInventory();
            } catch (err) {
                console.error(err);
                alert('Failed to save');
            }
        }
        if (e.target.classList.contains('deleteBtn')) {
            if (!confirm('Delete this item?')) return;
            try {
                const res = await fetch(`/api/inventory-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to delete');
                }
                await fetchInventory();
            } catch (err) {
                console.error(err);
                alert(err.message || 'Failed to delete');
            }
        }
    });

    openAdd.addEventListener('click', openModal);
    closeAdd.addEventListener('click', closeModal);
    cancelAdd.addEventListener('click', closeModal);
    confirmAdd.addEventListener('click', addItem);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    filterAvailable.addEventListener('change', fetchInventory);
    fetchInventory();
});


