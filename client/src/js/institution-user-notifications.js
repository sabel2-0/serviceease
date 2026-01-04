// institution_user Notifications Module
(function() {
  console.log('[INSTITUTION-USER-NOTIFICATIONS] Module loading...');

  const institution_userNotifications = {
    initialized: false,
    
    init() {
      if (this.initialized) {
        console.log('[INSTITUTION-USER-NOTIFICATIONS] Already initialized, refreshing...');
        this.refresh();
        return;
      }
      
      console.log('[INSTITUTION-USER-NOTIFICATIONS] Initializing...');
      this.initialized = true;
      this.fetchNotifications();
      
      // Setup retry button
      const retryBtn = document.getElementById('retry-notifications');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.fetchNotifications());
      }
    },
    
    refresh() {
      console.log('[INSTITUTION-USER-NOTIFICATIONS] Refreshing notifications...');
      this.fetchNotifications();
    },
    
    async fetchNotifications() {
      const loadingEl = document.getElementById('notifications-loading');
      const contentEl = document.getElementById('notifications-content');
      const errorEl = document.getElementById('notifications-error');
      
      // Show loading
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');
      if (errorEl) errorEl.classList.add('hidden');
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token');
        }
        
        console.log('[INSTITUTION-USER-NOTIFICATIONS] Fetching from API...');
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const notifications = data.notifications || [];
        console.log('[INSTITUTION-USER-NOTIFICATIONS] Received:', notifications.length, 'notifications');
        
        this.renderNotifications(notifications);
      } catch (error) {
        console.error('[INSTITUTION-USER-NOTIFICATIONS] Error:', error);
        this.showError();
      }
    },
    
    renderNotifications(notifications) {
      const loadingEl = document.getElementById('notifications-loading');
      const contentEl = document.getElementById('notifications-content');
      const errorEl = document.getElementById('notifications-error');
      
      // Hide loading/error, show content
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl) errorEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');
      
      if (!notifications || notifications.length === 0) {
        contentEl.innerHTML = `
          <div class="p-8 text-center">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <p class="text-gray-500 font-medium mb-1">No notifications yet</p>
            <p class="text-gray-400 text-sm">You'll be notified when there are updates</p>
          </div>
        `;
        return;
      }
      
      const html = notifications.map(n => this.createNotificationElement(n)).join('');
      contentEl.innerHTML = html;
    },
    
    createNotificationElement(notification) {
      const typeIcons = {
        'info': `<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        'success': `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        'warning': `<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>`,
        'error': `<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`
      };
      
      const icon = typeIcons[notification.type] || typeIcons['info'];
      const isUnread = !notification.is_read;
      
      const date = new Date(notification.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let timeAgo = '';
      if (diffMinutes < 1) {
        timeAgo = 'Just now';
      } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
      } else if (diffDays < 7) {
        timeAgo = `${diffDays}d ago`;
      } else {
        timeAgo = date.toLocaleDateString();
      }
      
      return `
        <div class="border-b border-gray-100 p-4 hover:bg-gray-50 transition ${isUnread ? 'bg-blue-50' : ''}">
          <div class="flex gap-3">
            <div class="flex-shrink-0 mt-1">
              ${icon}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between mb-1">
                <h4 class="font-medium text-gray-900 text-sm">${this.escapeHtml(notification.title)}</h4>
                ${isUnread ? '<span class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>' : ''}
              </div>
              <p class="text-sm text-gray-600 mb-2">${this.escapeHtml(notification.message)}</p>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>${timeAgo}</span>
                ${notification.sender_name ? `<span class="text-gray-400"> ${this.escapeHtml(notification.sender_name)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    },
    
    showError() {
      const loadingEl = document.getElementById('notifications-loading');
      const contentEl = document.getElementById('notifications-content');
      const errorEl = document.getElementById('notifications-error');
      
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.add('hidden');
      if (errorEl) errorEl.classList.remove('hidden');
    },
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };
  
  // Expose globally
  window.institution_userNotifications = institution_userNotifications;
  console.log('[INSTITUTION-USER-NOTIFICATIONS] Module loaded');
})();










