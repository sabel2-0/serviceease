// Technician Notifications Module
console.log('[NOTIF-JS] Module loaded');

window.TechnicianNotifications = {
    initialized: false,
    listEl: null,
    emptyEl: null,
    loadingEl: null,
    pollHandle: null,
    POLL_INTERVAL: 30000,

    getAuthHeaders() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString();
        } catch (e) {
            return dateStr;
        }
    },

    createNotificationElement(notif) {
        const type = (notif.type || '').toLowerCase();
        let icon = '<svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"/></svg>';
        let colorClass = 'text-gray-600';

        if (type.includes('parts') || type.includes('parts_approved')) {
            icon = '<svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="2.2"/></svg>';
            colorClass = 'text-green-600';
        }
        if (type.includes('service') || type.includes('service_request')) {
            icon = '<svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="3" stroke-width="2.2"/></svg>';
            colorClass = 'text-blue-600';
        }
        if (type.includes('denied') || type.includes('rejected') || notif.priority === 'urgent') {
            icon = '<svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" stroke-width="2.2"/><line x1="6" y1="18" x2="18" y2="6" stroke-width="2.2"/></svg>';
            colorClass = 'text-red-600';
        }

        const title = notif.title || (notif.type ? notif.type.replace(/_/g, ' ') : 'Notification');
        const message = notif.message || '';
        const time = this.formatDate(notif.created_at || notif.submitted_at || notif.read_at);

        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow border border-gray-100 p-4 flex items-start gap-4 transition hover:shadow-lg notification-item';
        div.dataset.id = notif.id || '';
        
        div.innerHTML = `
            <div class="flex-shrink-0">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-slate-800">${title}</span>
                    ${notif.is_read ? '' : '<span class="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">New</span>'}
                </div>
                <div class="text-sm text-gray-700 mb-1">${message}</div>
                <div class="text-xs text-gray-400">${time}</div>
            </div>
        `;

        div.addEventListener('click', () => {
            if (notif.id) {
                fetch(`/api/notifications/${notif.id}/read`, {
                    method: 'PATCH',
                    headers: this.getAuthHeaders()
                }).catch(() => {});
            }
            if (typeof window.technicianNotificationClicked === 'function') {
                try {
                    window.technicianNotificationClicked(notif.reference_id || notif.id || null);
                } catch (e) {
                    console.error(e);
                }
            }
        });

        return div;
    },

    async fetchNotifications() {
        try {
            console.log('[NOTIF-JS] Fetching notifications from /api/notifications');
            const resp = await fetch('/api/notifications?limit=50', {
                headers: this.getAuthHeaders()
            });
            console.log('[NOTIF-JS] Response status:', resp.status);
            if (!resp.ok) {
                console.error('[NOTIF-JS] Failed to fetch notifications:', resp.status, resp.statusText);
                throw new Error('Failed to fetch notifications');
            }
            const data = await resp.json();
            console.log('[NOTIF-JS] Received notifications:', data.notifications ? data.notifications.length : 0);
            return data.notifications || [];
        } catch (err) {
            console.error('[NOTIF-JS] Notifications fetch error', err);
            return [];
        }
    },

    async fetchPartsRequests() {
        try {
            const resp = await fetch('/api/parts-requests?status=pending', {
                headers: this.getAuthHeaders()
            });
            if (!resp.ok) return [];
            return await resp.json();
        } catch (err) {
            console.error('[NOTIF-JS] Parts requests fetch error', err);
            return [];
        }
    },

    async fetchAssignedRequests() {
        try {
            const resp = await fetch('/api/technician/service-requests?limit=10', {
                headers: this.getAuthHeaders()
            });
            if (!resp.ok) return [];
            return await resp.json();
        } catch (err) {
            console.error('[NOTIF-JS] Assigned requests fetch error', err);
            return [];
        }
    },

    async refresh() {
        console.log('[NOTIF-JS] Starting refresh...');
        
        const [notifications, parts, assigned] = await Promise.all([
            this.fetchNotifications(),
            this.fetchPartsRequests(),
            this.fetchAssignedRequests()
        ]);

        console.log('[NOTIF-JS] Data fetched - notifications:', notifications.length, 'parts:', parts.length, 'assigned:', assigned.length);

        const items = [];

        // Service approvals / notifications
        notifications.slice(0, 30).forEach(n => items.push(n));

        // Parts requests
        parts.slice(0, 10).forEach(p => {
            items.push({
                id: `parts-${p.id}`,
                title: `Parts Request ${p.status ? p.status.replace('_', ' ') : ''}`,
                message: `${p.quantity_requested} x ${p.part_name || p.part_id} — ${p.reason || ''}`,
                type: `parts_${p.status || 'pending'}`,
                created_at: p.created_at,
                reference_id: p.id,
                is_read: p.status && p.status !== 'pending'
            });
        });

        // Assigned service requests
        assigned.slice(0, 10).forEach(r => {
            items.push({
                id: `req-${r.id}`,
                title: `Service Request Assigned`,
                message: `${r.request_number || '#' + r.id} — ${r.description || r.issue || ''}`,
                type: 'service_request',
                created_at: r.created_at || r.assigned_at || r.updated_at,
                reference_id: r.id,
                is_read: false
            });
        });

        items.sort((a, b) => new Date(b.created_at || b.submitted_at || 0) - new Date(a.created_at || a.submitted_at || 0));

        console.log('[NOTIF-JS] Total items to display:', items.length);

        // Hide loading
        if (this.loadingEl) {
            this.loadingEl.classList.add('hidden');
        }

        // Render
        this.listEl.innerHTML = '';
        if (items.length === 0) {
            console.log('[NOTIF-JS] No items - showing empty state');
            this.emptyEl.classList.remove('hidden');
            return;
        }
        this.emptyEl.classList.add('hidden');

        const displayItems = items.slice(0, 30);
        console.log('[NOTIF-JS] Rendering', displayItems.length, 'items');
        displayItems.forEach((item, idx) => {
            try {
                this.listEl.appendChild(this.createNotificationElement(item));
            } catch (e) {
                console.error('[NOTIF-JS] Error rendering item', idx, e);
            }
        });

        console.log('[NOTIF-JS] Refresh complete - rendered', this.listEl.children.length, 'notification cards');
    },

    init() {
        if (this.initialized) {
            console.log('[NOTIF-JS] Already initialized, calling refresh only');
            this.refresh();
            return;
        }

        console.log('[NOTIF-JS] Initializing...');
        
        this.listEl = document.getElementById('technician-notifications-list');
        this.emptyEl = document.getElementById('empty-technician-notifications');
        this.loadingEl = document.getElementById('notifications-loading');

        if (!this.listEl) {
            console.error('[NOTIF-JS] ERROR: technician-notifications-list element not found!');
            return;
        }
        if (!this.emptyEl) {
            console.error('[NOTIF-JS] ERROR: empty-technician-notifications element not found!');
            return;
        }

        console.log('[NOTIF-JS] DOM elements found:', {
            listEl: !!this.listEl,
            emptyEl: !!this.emptyEl,
            loadingEl: !!this.loadingEl
        });

        this.initialized = true;

        // Initial load
        console.log('[NOTIF-JS] Calling initial refresh...');
        this.refresh();

        // Polling
        if (this.pollHandle) {
            clearInterval(this.pollHandle);
        }
        this.pollHandle = setInterval(() => this.refresh(), this.POLL_INTERVAL);
        console.log('[NOTIF-JS] Polling started (interval:', this.POLL_INTERVAL, 'ms)');

        console.log('[NOTIF-JS] Initialization complete!');
    }
};

console.log('[NOTIF-JS] Module ready, use window.TechnicianNotifications.init() to start');
