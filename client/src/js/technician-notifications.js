// Technician Notifications Module
console.log('[NOTIF-JS] Module loaded');

window.TechnicianNotifications = {
    initialized: false,
    listEl: null,
    emptyEl: null,
    loadingEl: null,
    pollHandle: null,
    POLL_INTERVAL: 30000,
    cachedData: null, // Cache for instant display

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
        const title = (notif.title || '').toLowerCase();
        let icon = '<svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"/></svg>';
        let colorClass = 'text-gray-600';

        // Check both type and title for better matching
        const content = `${type} ${title}`;

        // Institution assigned (purple building)
        if (content.includes('institution') && content.includes('assigned')) {
            icon = '<svg class="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 10V8l9-5 9 5v2"/><rect x="3" y="10" width="18" height="8" rx="2" stroke-width="2.2"/><path stroke-linecap="round" stroke-width="2.2" d="M7 18V12M12 18V12M17 18V12"/></svg>';
            colorClass = 'text-purple-600';
        }
        // Approved services (green checkmark in circle)
        else if (content.includes('approved') || content.includes('service_approved')) {
            icon = '<svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
            colorClass = 'text-green-600';
        }
        // New service request assigned (blue document/clipboard icon)
        else if (content.includes('assigned') || content.includes('service_request') || content.includes('new service')) {
            icon = '<svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>';
            colorClass = 'text-blue-600';
        }
        // Parts approved (green checkmark)
        else if (content.includes('parts') && content.includes('approved')) {
            icon = '<svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="2.2"/></svg>';
            colorClass = 'text-green-600';
        }
        // Service revision needed (orange warning)
        else if (content.includes('revision') || content.includes('needs work')) {
            icon = '<svg class="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
            colorClass = 'text-orange-600';
        }
        // Institution assigned (purple building)
        else if (content.includes('institution') && content.includes('assigned')) {
            icon = '<svg class="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
            colorClass = 'text-purple-600';
        }
        // Institution unassigned (orange building with X)
        else if (content.includes('institution') && content.includes('unassigned')) {
            icon = '<svg class="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/><path stroke-linecap="round" stroke-width="2.5" d="M6 8 L18 16 M18 8 L6 16"/></svg>';
            colorClass = 'text-orange-600';
        }
        // Denied/Rejected (red X)
        else if (content.includes('denied') || content.includes('rejected')) {
            icon = '<svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
            colorClass = 'text-red-600';
        }

        const displayTitle = notif.title || (notif.type ? notif.type.replace(/_/g, ' ') : 'Notification');
        const message = notif.message || '';
        const time = this.formatDate(notif.created_at || notif.submitted_at || notif.read_at);

        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow border border-gray-100 p-4 flex items-start gap-4 transition hover:shadow-lg notification-item';
        div.dataset.id = notif.id || '';
        
        div.innerHTML = `
            <div class="flex-shrink-0">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-slate-800">${displayTitle}</span>
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
            console.log('[NOTIF-JS] Full notification data:', JSON.stringify(data.notifications, null, 2));
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

    async refresh(skipCache = false) {
        console.log('[NOTIF-JS] Starting refresh... skipCache:', skipCache);
        
        // Always get fresh references to DOM elements (force re-query)
        this.listEl = document.getElementById('technician-notifications-list');
        this.emptyEl = document.getElementById('empty-technician-notifications');
        this.loadingEl = document.getElementById('notifications-loading');
        
        console.log('[NOTIF-JS] Fresh DOM refs:', {
            listEl: !!this.listEl,
            emptyEl: !!this.emptyEl,
            loadingEl: !!this.loadingEl
        });
        
        // If we have cached data and not skipping cache, show it immediately
        if (!skipCache && this.cachedData) {
            console.log('[NOTIF-JS] Using cached data for instant display');
            this.renderItems(this.cachedData);
            // Fetch fresh data in background
            setTimeout(() => this.refresh(true), 100);
            return;
        }
        
        // Show loading state, hide others
        if (this.loadingEl) {
            this.loadingEl.style.display = 'block';
            console.log('[NOTIF-JS] Loading displayed');
        } else {
            console.error('[NOTIF-JS] Loading element not found!');
        }
        if (this.listEl) {
            this.listEl.style.display = 'none';
        }
        if (this.emptyEl) {
            this.emptyEl.style.display = 'none';
        }
        
        const [notifications, parts, assigned] = await Promise.all([
            this.fetchNotifications(),
            this.fetchPartsRequests(),
            this.fetchAssignedRequests()
        ]);

        console.log('[NOTIF-JS] Data fetched - notifications:', notifications.length, 'parts:', parts.length, 'assigned:', assigned.length);
        console.log('[NOTIF-JS] Notification types in response:', notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));

        const items = [];

        // Service approvals / notifications
        notifications.slice(0, 30).forEach(n => {
            console.log('[NOTIF-JS] Adding notification to items:', { id: n.id, type: n.type, title: n.title, user_id: n.user_id });
            items.push(n);
        });

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
        
        // Cache the data for next time
        this.cachedData = items;

        this.renderItems(items);
    },

    renderItems(items) {
        console.log('[NOTIF-JS] Rendering', items.length, 'items');
        console.log('[NOTIF-JS] Items to render:', items.map(i => ({ id: i.id, type: i.type, title: i.title })));

        // Clear the list element first
        if (this.listEl) {
            this.listEl.innerHTML = '';
            console.log('[NOTIF-JS] List element cleared');
        }
        
        if (items.length === 0) {
            console.log('[NOTIF-JS] No items - showing empty state');
            if (this.loadingEl) this.loadingEl.style.display = 'none';
            if (this.listEl) this.listEl.style.display = 'none';
            if (this.emptyEl) this.emptyEl.style.display = 'block';
            return;
        }

        // Render items into list
        const displayItems = items.slice(0, 30);
        console.log('[NOTIF-JS] Actually rendering', displayItems.length, 'items to DOM');
        
        const fragment = document.createDocumentFragment();
        displayItems.forEach((item, idx) => {
            try {
                console.log('[NOTIF-JS] Creating element for item', idx, ':', { id: item.id, type: item.type, title: item.title });
                const elem = this.createNotificationElement(item);
                fragment.appendChild(elem);
                console.log('[NOTIF-JS] Element created and added to fragment');
            } catch (e) {
                console.error('[NOTIF-JS] Error rendering item', idx, e);
            }
        });
        
        if (this.listEl) {
            this.listEl.appendChild(fragment);
            console.log('[NOTIF-JS] Items appended to list');
        }

        // Now switch displays - hide loading, show list
        if (this.loadingEl) {
            this.loadingEl.style.display = 'none';
            console.log('[NOTIF-JS] Loading hidden');
        }
        if (this.emptyEl) {
            this.emptyEl.style.display = 'none';
        }
        if (this.listEl) {
            this.listEl.style.display = 'block';
            this.listEl.style.visibility = 'visible';
            this.listEl.style.opacity = '1';
            console.log('[NOTIF-JS] List element shown');
        }

        console.log('[NOTIF-JS] Render complete -', this.listEl ? this.listEl.children.length : 0, 'notification cards');
    },

    init() {
        console.log('[NOTIF-JS] init() called, initialized flag:', this.initialized);
        
        // Always get fresh references to DOM elements
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

        if (this.initialized) {
            console.log('[NOTIF-JS] Already initialized, calling refresh only');
            this.refresh();
            return;
        }

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




