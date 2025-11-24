// Requester mobile app JS - loads components, handles simple hash routing, and provides request form UX
document.addEventListener('DOMContentLoaded', () => {
  initRequesterApp();
});

async function initRequesterApp() {
  await loadTopnav();
  await loadBottomnav();
  // Handle hash routing
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

async function loadTopnav() {
  const c = document.getElementById('requester-topnav-container');
  if (!c) return;
  try {
    const r = await fetch('/components/requester-topnav.html');
    c.innerHTML = await r.text();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    const _reqUserInitials = document.getElementById('req-user-initials');
    if (_reqUserInitials) {
      const initials = (firstName.charAt(0) || 'U') + (lastName.charAt(0) || '');
      _reqUserInitials.textContent = initials;
    }
    
    // Fetch and display requester profile (institution name)
    await loadRequesterProfile();
    
    // Setup notification system
    setupNotifications();
  } catch (e) { console.error('loadTopnav', e); }
}

async function loadRequesterProfile() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, skipping profile fetch');
      return;
    }
    
    const response = await fetch('/api/requester/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const profile = await response.json();
      console.log('Requester profile loaded:', profile);
      
      // Update institution name in banner
      const institutionNameEl = document.getElementById('req-institution-name');
      if (institutionNameEl) {
        institutionNameEl.textContent = profile.institution_name || 'No Institution';
      }
      
      // Update requester name in banner
      const requesterNameEl = document.getElementById('req-requester-name');
      if (requesterNameEl) {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';
        requesterNameEl.textContent = fullName;
      }
    } else {
      console.error('Failed to load requester profile:', response.status);
      // Use fallback from localStorage
      useFallbackProfileData();
    }
  } catch (error) {
    console.error('Error loading requester profile:', error);
    // Use fallback from localStorage
    useFallbackProfileData();
  }
}

function useFallbackProfileData() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const institutionNameEl = document.getElementById('req-institution-name');
  if (institutionNameEl) {
    institutionNameEl.textContent = user.institution_name || 'No Institution';
  }
  
  const requesterNameEl = document.getElementById('req-requester-name');
  if (requesterNameEl) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    requesterNameEl.textContent = fullName;
  }
}

function setupNotifications() {
  const notificationBtn = document.getElementById('req-notifications-btn');
  const notificationModal = document.getElementById('req-notification-modal');
  const notificationModalContent = document.getElementById('req-notification-modal-content');
  const closeNotificationModal = document.getElementById('req-close-notification-modal');
  
  if (!notificationBtn || !notificationModal) {
    console.warn('[REQUESTER] Notification elements not found');
    return;
  }
  
  let notificationsLoaded = false;
  
  // Load notification JS module if not already loaded
  if (!window.RequesterNotifications) {
    console.log('🔔 [REQUESTER] Loading notification module...');
    const script = document.createElement('script');
    script.src = '/js/requester-notifications.js';
    script.onload = () => console.log('🔔 [REQUESTER] Notification module loaded');
    script.onerror = () => console.error('🔔 [REQUESTER] Failed to load notification module');
    document.head.appendChild(script);
  }
  
  notificationBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    console.log('🔔 [REQUESTER] Notification button clicked');
    
    // Open modal
    notificationModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    if (!notificationsLoaded) {
      // First time - load the HTML
      console.log('🔔 [REQUESTER] Loading notifications component...');
      fetch('/components/requester-notifications.html')
        .then(res => res.text())
        .then(html => {
          notificationModalContent.innerHTML = html;
          notificationsLoaded = true;
          
          // Initialize notifications module
          setTimeout(() => {
            if (window.RequesterNotifications) {
              console.log('🔔 [REQUESTER] Initializing RequesterNotifications module...');
              window.RequesterNotifications.init();
            } else {
              console.error('🔔 [REQUESTER] RequesterNotifications module not loaded!');
            }
          }, 100);
        })
        .catch(err => {
          console.error('🔔 [REQUESTER] Failed to load notifications component', err);
          notificationModalContent.innerHTML = '<div class="p-4 text-center text-gray-500">Unable to load notifications.</div>';
        });
    } else {
      // Already loaded - just refresh the data
      console.log('🔔 [REQUESTER] Refreshing notifications...');
      if (window.RequesterNotifications) {
        window.RequesterNotifications.refresh();
      }
    }
  });
  
  if (closeNotificationModal) {
    closeNotificationModal.addEventListener('click', function() {
      notificationModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });
  }
  
  // Allow ESC to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && notificationModal && !notificationModal.classList.contains('hidden')) {
      notificationModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  });
}

async function loadBottomnav() {
  const c = document.getElementById('requester-bottomnav-container');
  if (!c) return;
  try {
    const r = await fetch('/components/requester-bottomnav.html');
    c.innerHTML = await r.text();
    // bind nav links
    document.getElementById('nav-home')?.addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('home'); });
    document.getElementById('nav-request')?.addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('request'); });
    document.getElementById('nav-settings')?.addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('settings'); });
    document.getElementById('nav-history')?.addEventListener('click', (ev) => { ev.preventDefault(); navigateTo('history'); });
  } catch (e) { console.error('loadBottomnav', e); }
}

function navigateTo(route) {
  window.location.hash = `#${route}`;
}

async function renderRoute() {
  const hash = (window.location.hash || '#home').replace('#','');
  const container = document.getElementById('requester-service-component');
  if (!container) return;
  
  // Update bottom nav active state
  updateBottomNavActiveState(hash);
  
  try {
    let path = '/pages/requester/requester-home.html';
    if (hash === 'request') path = '/pages/requester/requester-request.html';
    if (hash === 'settings') path = '/pages/requester/requester-settings.html';
    if (hash === 'history') path = '/pages/requester/requester-history.html';
    if (hash === 'voluntary') path = '/pages/requester/requester-voluntary.html';

    const res = await fetch(path);
    container.innerHTML = await res.text();

    // After loading the page fragment, wire page-specific behavior
    if (hash === 'home') {
      await initHomePage();
    } else if (hash === 'request') {
      await initRequestForm();
    } else if (hash === 'settings') {
      const logoutBtn = document.getElementById('req-logout');
      logoutBtn?.addEventListener('click', () => {
        logout();
      });
    } else if (hash === 'history') {
      await initHistoryPage();
    } else if (hash === 'voluntary') {
      await initVoluntaryPage();
    }
  } catch (e) {
    console.error('renderRoute', e);
    container.innerHTML = '<div class="p-4 text-red-500">Failed to load</div>';
  }
}

function updateBottomNavActiveState(currentRoute) {
  // Remove active classes from all nav items
  const navItems = document.querySelectorAll('#requester-bottomnav-container a');
  navItems.forEach(item => {
    item.classList.remove('bg-blue-50', 'text-blue-600');
    item.classList.add('text-gray-700');
  });
  
  // Add active class to current route
  const activeItem = document.getElementById(`nav-${currentRoute}`);
  if (activeItem) {
    activeItem.classList.add('bg-blue-50', 'text-blue-600');
    activeItem.classList.remove('text-gray-700');
  }
}

async function initHomePage() {
  try {
    const token = localStorage.getItem('token') || '';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update welcome message with user's name
    const welcomeEl = document.getElementById('home-welcome-name');
    if (welcomeEl && user.first_name) {
      welcomeEl.textContent = `Welcome Back, ${user.first_name}!`;
    }
    
    // Fetch printers
    const printersRes = await fetch('/api/users/me/printers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Fetch service requests for stats and recent
    const requestsRes = await fetch('/api/users/me/service-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (printersRes.ok) {
      const printers = await printersRes.json();
      displayHomePrinters(printers);
    }
    
    if (requestsRes.ok) {
      const requests = await requestsRes.json();
      displayHomeStats(requests);
      displayRecentRequests(requests.slice(0, 5));
    }
    
  } catch (e) {
    console.error('initHomePage', e);
  }
}

function displayHomePrinters(printers) {
  const container = document.getElementById('home-printers-list');
  const countEl = document.getElementById('home-printers-count');
  
  if (countEl) countEl.textContent = printers.length;
  
  if (!container) return;
  
  if (!printers || printers.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center">
        <div class="text-4xl mb-2">🖨️</div>
        <div class="text-gray-500 text-sm">No printers assigned yet</div>
        <p class="text-xs text-gray-400 mt-1">Contact your coordinator to assign a printer</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = printers.map(p => {
    const printerName = [p.brand, p.model].filter(Boolean).join(' ') || p.name || 'Printer';
    const serialNumber = p.serial_number ? `SN: ${p.serial_number}` : '';
    const department = p.department ? p.department : '';
    
    return `
      <div class="p-4 hover:bg-gray-50 cursor-pointer transition" onclick="navigateTo('request')">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="font-medium text-gray-800">${printerName}</div>
            <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
              ${serialNumber ? `<span>${serialNumber}</span>` : ''}
              ${department ? `<span>• ${department}</span>` : ''}
            </div>
          </div>
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    `;
  }).join('');
}

function displayHomeStats(requests) {
  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'approved').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  
  const pendingEl = document.getElementById('home-pending-count');
  const completedEl = document.getElementById('home-completed-count');
  
  if (pendingEl) pendingEl.textContent = pendingCount;
  if (completedEl) completedEl.textContent = completedCount;
}

function displayRecentRequests(requests) {
  const container = document.getElementById('home-recent-requests-list');
  if (!container) return;
  
  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center">
        <div class="text-4xl mb-2">📝</div>
        <div class="text-gray-500 text-sm">No service requests yet</div>
        <button onclick="navigateTo('request')" class="mt-3 text-blue-600 text-sm hover:underline">Create your first request</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = requests.map(req => {
    const statusBadge = getStatusBadge(req.status);
    const printerName = [req.printer_brand, req.printer_model].filter(Boolean).join(' ') || req.printer_name || 'Unknown Printer';
    const date = new Date(req.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    let timeAgo = '';
    if (diffDays === 0) {
      if (diffHours === 0) {
        timeAgo = 'Just now';
      } else if (diffHours === 1) {
        timeAgo = '1 hour ago';
      } else {
        timeAgo = `${diffHours} hours ago`;
      }
    } else if (diffDays === 1) {
      timeAgo = 'Yesterday';
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} days ago`;
    } else {
      timeAgo = date.toLocaleDateString();
    }
    
    return `
      <div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="navigateTo('history')">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between mb-1">
              <div class="font-medium text-gray-800 text-sm truncate">${printerName}</div>
              ${statusBadge}
            </div>
            <div class="text-xs text-gray-600 mb-2 line-clamp-2">${req.description}</div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span>📅 ${timeAgo}</span>
              ${req.priority ? `<span class="px-2 py-0.5 rounded ${getPriorityColorCompact(req.priority)}">${req.priority.toUpperCase()}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getPriorityColorCompact(priority) {
  const colors = {
    'urgent': 'bg-red-100 text-red-700',
    'high': 'bg-orange-100 text-orange-700',
    'medium': 'bg-yellow-100 text-yellow-700',
    'low': 'bg-green-100 text-green-700',
  };
  return colors[priority] || colors['medium'];
}

async function initHistoryPage() {
  try {
    const token = localStorage.getItem('token') || '';
    const res = await fetch('/api/users/me/service-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const requests = await res.json();
      displayHistoryRequests(requests);
      
      // Wire filter buttons
      const filterBtns = document.querySelectorAll('.history-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Update active state
          filterBtns.forEach(b => {
            b.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-700', 'text-white', 'shadow-md');
            b.classList.add('text-gray-700', 'bg-gray-50', 'hover:bg-gray-100');
          });
          btn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-blue-700', 'text-white', 'shadow-md');
          btn.classList.remove('text-gray-700', 'bg-gray-50', 'hover:bg-gray-100');
          
          // Filter requests
          const filter = btn.dataset.filter;
          if (filter === 'all') {
            displayHistoryRequests(requests);
          } else {
            const filtered = requests.filter(r => r.status === filter);
            displayHistoryRequests(filtered);
          }
        });
      });
      
      // Wire empty state button
      document.getElementById('history-new-request-btn')?.addEventListener('click', () => navigateTo('request'));
    }
  } catch (e) {
    console.error('initHistoryPage', e);
  }
}

function displayHistoryRequests(requests) {
  const container = document.getElementById('history-requests-list');
  const emptyState = document.getElementById('history-empty-state');
  
  if (!container) return;
  
  if (!requests || requests.length === 0) {
    container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  
  container.innerHTML = requests.map(req => {
    const statusBadge = getStatusBadge(req.status);
    const printerName = [req.printer_brand, req.printer_model].filter(Boolean).join(' ') || req.printer_name || 'Unknown Printer';
    const date = new Date(req.created_at).toLocaleDateString();
    const time = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Show requester name (the person who created the request)
    const requesterName = req.requester_first_name && req.requester_last_name 
      ? `${req.requester_first_name} ${req.requester_last_name}`
      : 'Unknown';
      
    // Show technician name if assigned
    const technicianName = req.technician_first_name && req.technician_last_name
      ? `${req.technician_first_name} ${req.technician_last_name}`
      : null;
    
    // Show approval button for pending_approval status
    const needsApproval = req.status === 'pending_approval';
    
    return `
      <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition ${needsApproval ? 'border-2 border-orange-300' : ''}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="font-semibold text-gray-800">${printerName}</div>
            <div class="text-xs text-gray-500 mt-1">Request #${req.id}</div>
          </div>
          ${statusBadge}
        </div>
        
        ${needsApproval ? `
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
            <p class="text-sm text-orange-800 font-medium mb-2">
              ⚠️ Work completed - Please review and approve
            </p>
            ${technicianName ? `<p class="text-xs text-orange-700">Technician: ${technicianName}</p>` : ''}
          </div>
        ` : ''}
        
        <div class="space-y-2 mb-3">
          <div class="text-sm text-gray-700">${req.description}</div>
          ${req.location ? `<div class="text-xs text-gray-500">📍 ${req.location}</div>` : ''}
          ${technicianName && !needsApproval ? `<div class="text-xs text-gray-500">👷 ${technicianName}</div>` : ''}
        </div>
        
        <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
          <div>👤 ${requesterName}</div>
          <div>${date} ${time}</div>
        </div>
        
        ${req.priority ? `
          <div class="mt-2">
            <span class="inline-block px-2 py-1 text-xs rounded ${getPriorityColor(req.priority)}">
              ${req.priority.toUpperCase()}
            </span>
          </div>
        ` : ''}
        
        ${needsApproval ? `
          <div class="mt-4">
            <button 
              onclick="openApprovalModal(${req.id}, '${req.request_number}', '${technicianName || 'Unknown'}')" 
              class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition shadow-md">
              Review & Approve
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">Pending</span>',
    'approved': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Approved</span>',
    'in_progress': '<span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">In Progress</span>',
    'pending_approval': '<span class="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">Needs Your Approval</span>',
    'completed': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">Completed</span>',
    'rejected': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">Rejected</span>',
  };
  return badges[status] || badges['pending'];
}

function getPriorityColor(priority) {
  const colors = {
    'urgent': 'bg-red-100 text-red-700',
    'high': 'bg-orange-100 text-orange-700',
    'medium': 'bg-yellow-100 text-yellow-700',
    'low': 'bg-green-100 text-green-700',
  };
  return colors[priority] || colors['medium'];
}

async function initRequestForm() {
  try {
    // populate printers assigned to this user (user_printer_assignments)
    const select = document.getElementById('rq-printer');
    if (select) {
      select.innerHTML = '<option value="">Select a printer</option>';
      try {
        const res = await fetch('/api/users/me/printers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        console.debug('[requester] GET /api/users/me/printers status=', res.status);
        if (res.status === 401) {
          // Not authenticated or token expired
          console.warn('[requester] printers fetch unauthorized (401) - token may be missing/expired');
          const container = document.getElementById('requestForm');
          if (container) {
            const note = document.createElement('p');
            note.className = 'text-sm text-red-600 mt-2';
            note.id = 'rq-no-printers-note';
            note.innerHTML = 'Authentication required. Please <a href="/pages/login.html" class="underline">log in</a> again.';
            container.insertBefore(note, container.firstChild);
          }
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[requester] printers fetch failed:', res.status, err);
          const container = document.getElementById('requestForm');
          if (container) {
            const note = document.createElement('p');
            note.className = 'text-sm text-red-600 mt-2';
            note.id = 'rq-no-printers-note';
            note.textContent = err.error || 'Failed to load printers. Please try again later.';
            container.insertBefore(note, container.firstChild);
          }
          return;
        }

        const printers = await res.json();
        console.debug('[requester] printers response', printers);
        if (!printers || printers.length === 0) {
          // No printers assigned to this requester - show message and disable submit
          const container = document.getElementById('requestForm');
          const submitBtn = document.getElementById('rq-submit');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'No assigned printers'; }
          if (container) {
            const note = document.createElement('p');
            note.className = 'text-sm text-yellow-700 mt-2';
            note.id = 'rq-no-printers-note';
            note.textContent = 'You have no assigned printers. Please contact your coordinator to assign a printer before submitting a request.';
            container.insertBefore(note, container.firstChild);
          }
          return;
        }

        printers.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.inventory_item_id || p.inventory_item || p.id || '';
          const nameParts = [];
          if (p.name) nameParts.push(p.name);
          if (p.brand) nameParts.push(p.brand);
          if (p.model) nameParts.push(p.model);
          if (p.serial_number) nameParts.push('SN:' + p.serial_number);
          opt.textContent = nameParts.join(' ') || `Printer ${p.inventory_item_id || p.inventory_item || p.id}`;
          select.appendChild(opt);
        });
      } catch (e) {
        console.error('populate assigned printers', e);
        const container = document.getElementById('requestForm');
        if (container) {
          const note = document.createElement('p');
          note.className = 'text-sm text-red-600 mt-2';
          note.id = 'rq-no-printers-note';
          note.textContent = 'Failed to load printers due to a network error. Please try again.';
          container.insertBefore(note, container.firstChild);
        }
      }
    }

    document.getElementById('rq-submit')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await submitRequestForm();
    });
  } catch (e) { console.error('initRequestForm', e); }
}

async function submitRequestForm() {
  const printer = document.getElementById('rq-printer');
  const location = document.getElementById('rq-location');
  const priority = document.getElementById('rq-priority');
  const description = document.getElementById('rq-description');
  const printerErr = document.getElementById('rq-printer-error');
  const descErr = document.getElementById('rq-description-error');

  // simple validation
  let ok = true;
  if (printer && printer.value === '') { printerErr?.classList.remove('hidden'); ok = false; } else { printerErr?.classList.add('hidden'); }
  if (!description || !description.value.trim()) { descErr?.classList.remove('hidden'); ok = false; } else { descErr?.classList.add('hidden'); }
  if (!ok) return;

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Server will derive institution_id, requested_by_user_id, and assigned technician from authenticated user
    const payload = {
      inventory_item_id: printer?.value || null,
      location: location?.value || null,
      priority: priority?.value || 'medium',
      description: description?.value || ''
    };

    const submitBtn = document.getElementById('rq-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const res = await fetch('/api/service-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if (res.ok) {
      alert('Request submitted');
      // go to history
      navigateTo('history');
    } else {
      alert(data.error || 'Failed to submit request');
    }
  } catch (e) {
    console.error('submitRequestForm', e);
    alert('Failed to submit request');
  } finally {
    const submitBtn = document.getElementById('rq-submit');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Request'; }
  }
}

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('isLoggedIn');
  // redirect to login page (relative to pages folder)
  window.location.href = '/pages/login.html';
}

// Approval Modal Functions
let currentApprovalRequestId = null;

function openApprovalModal(requestId, requestNumber, technicianName) {
  currentApprovalRequestId = requestId;
  
  const modal = document.getElementById('approval-modal');
  const requestNumberEl = document.getElementById('approval-request-number');
  const technicianNameEl = document.getElementById('approval-technician-name');
  const feedbackEl = document.getElementById('approval-feedback');
  
  if (requestNumberEl) requestNumberEl.textContent = requestNumber;
  if (technicianNameEl) technicianNameEl.textContent = technicianName;
  if (feedbackEl) feedbackEl.value = '';
  
  if (modal) modal.classList.remove('hidden');
  
  // Setup event listeners
  document.getElementById('approval-approve-btn')?.addEventListener('click', () => handleApproval(true), { once: true });
  document.getElementById('approval-reject-btn')?.addEventListener('click', () => handleApproval(false), { once: true });
  document.getElementById('approval-cancel-btn')?.addEventListener('click', closeApprovalModal, { once: true });
}

function closeApprovalModal() {
  const modal = document.getElementById('approval-modal');
  if (modal) modal.classList.add('hidden');
  currentApprovalRequestId = null;
}

async function handleApproval(approved) {
  if (!currentApprovalRequestId) return;
  
  const feedbackEl = document.getElementById('approval-feedback');
  const feedback = feedbackEl ? feedbackEl.value.trim() : '';
  
  const approveBtn = document.getElementById('approval-approve-btn');
  const rejectBtn = document.getElementById('approval-reject-btn');
  
  // Disable buttons
  if (approveBtn) { approveBtn.disabled = true; approveBtn.textContent = approved ? 'Approving...' : 'Approve'; }
  if (rejectBtn) { rejectBtn.disabled = true; rejectBtn.textContent = approved ? 'Reject' : 'Rejecting...'; }
  
  try {
    const response = await fetch(`/api/users/me/service-requests/${currentApprovalRequestId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ approved, feedback })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(approved ? '✅ Service request approved!' : '❌ Service request rejected. Technician will be notified.');
      closeApprovalModal();
      // Reload the history page
      await initHistoryPage();
    } else {
      alert(data.error || 'Failed to process approval');
    }
  } catch (error) {
    console.error('Error processing approval:', error);
    alert('Failed to process approval');
  } finally {
    // Re-enable buttons
    if (approveBtn) { approveBtn.disabled = false; approveBtn.textContent = '✅ Approve'; }
    if (rejectBtn) { rejectBtn.disabled = false; rejectBtn.textContent = '❌ Reject'; }
  }
}

// Make functions globally available
window.openApprovalModal = openApprovalModal;
window.closeApprovalModal = closeApprovalModal;

// ==================== VOLUNTARY SERVICES PAGE ====================

let voluntaryServices = [];
let voluntaryHistory = [];
let currentVoluntaryTab = 'pending';

async function initVoluntaryPage() {
  await loadVoluntaryServices();
}

async function loadVoluntaryServices() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/voluntary-services/requester/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      voluntaryServices = data.services || [];
      updateVoluntaryStats();
      displayVoluntaryServices();
    } else {
      showVoluntaryError('Failed to load voluntary services');
    }
  } catch (error) {
    console.error('Error loading voluntary services:', error);
    showVoluntaryError('Error loading voluntary services');
  }
}

async function loadVoluntaryHistory() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/voluntary-services/requester/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      voluntaryHistory = data.services || [];
      displayVoluntaryHistory();
      updateVoluntaryStats(); // Update stats after loading history
    } else {
      showVoluntaryError('Failed to load history');
    }
  } catch (error) {
    console.error('Error loading history:', error);
    showVoluntaryError('Error loading history');
  }
}

function updateVoluntaryStats() {
  // Pending count from voluntaryServices (pending endpoint)
  const pendingCount = voluntaryServices.length;
  
  // Completed count from history
  const completedCount = voluntaryHistory.filter(s => s.status === 'completed').length;
  
  // Total is pending + history
  const totalCount = voluntaryServices.length + voluntaryHistory.length;
  
  document.getElementById('voluntary-pending-count').textContent = pendingCount;
  document.getElementById('voluntary-completed-count').textContent = completedCount;
  document.getElementById('voluntary-total-count').textContent = totalCount;
}

function displayVoluntaryServices() {
  const container = document.getElementById('pending-voluntary-list');
  if (!container) return;
  
  const pending = voluntaryServices.filter(s => s.requester_approval_status === 'pending');
  
  if (pending.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p>No pending voluntary services</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pending.map(service => `
    <div class="p-4 hover:bg-gray-50 transition">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <div class="font-medium text-gray-900">${service.printer_name}</div>
          <div class="text-xs text-gray-500">${service.institution_name}</div>
        </div>
        <span class="px-2 py-1 text-xs rounded-full ${getVoluntaryStatusColor(service)} font-medium">
          ${getVoluntaryStatusText(service)}
        </span>
      </div>
      <div class="text-sm text-gray-600 mb-2">
        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        By: ${service.technician_name}
      </div>
      <div class="text-xs text-gray-500 mb-3">
        ${formatVoluntaryDate(service.created_at)}
      </div>
      <div class="flex space-x-2">
        <button onclick="viewVoluntaryDetails(${service.id})" class="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
          View Details
        </button>
        ${service.requester_approval_status === 'pending' ? `
          <button onclick="approveVoluntaryService(${service.id})" class="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
            ✓ Approve
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function displayVoluntaryHistory() {
  const container = document.getElementById('history-voluntary-list');
  if (!container) return;
  
  if (voluntaryHistory.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        <p>No history yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = voluntaryHistory.map(service => `
    <div class="p-4">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <div class="font-medium text-gray-900">${service.printer_name}</div>
          <div class="text-xs text-gray-500">${service.institution_name}</div>
        </div>
        <span class="px-2 py-1 text-xs rounded-full ${getVoluntaryStatusColor(service)} font-medium">
          ${service.status}
        </span>
      </div>
      <div class="text-sm text-gray-600 mb-2">By: ${service.technician_name}</div>
      <div class="text-xs text-gray-500 mb-2">${formatVoluntaryDate(service.created_at)}</div>
      <button onclick="viewVoluntaryDetails(${service.id})" class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition w-full">
        View Details
      </button>
    </div>
  `).join('');
}

function getVoluntaryStatusColor(service) {
  if (service.status === 'completed') return 'bg-green-100 text-green-800';
  if (service.status === 'rejected') return 'bg-red-100 text-red-800';
  if (service.requester_approval_status === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (service.coordinator_approval_status === 'approved') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

function getVoluntaryStatusText(service) {
  if (service.requester_approval_status === 'pending') return 'Your Approval Needed';
  if (service.coordinator_approval_status === 'approved') return 'Approved by Coordinator';
  if (service.status === 'completed') return 'Completed';
  if (service.status === 'rejected') return 'Rejected';
  return 'Pending';
}

function formatVoluntaryDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function switchVoluntaryTab(tab) {
  currentVoluntaryTab = tab;
  
  const pendingTab = document.getElementById('tab-pending-voluntary');
  const historyTab = document.getElementById('tab-history-voluntary');
  const pendingList = document.getElementById('pending-voluntary-list');
  const historyList = document.getElementById('history-voluntary-list');
  
  if (tab === 'pending') {
    pendingTab.classList.add('border-purple-500', 'text-purple-600');
    pendingTab.classList.remove('border-transparent', 'text-gray-500');
    historyTab.classList.remove('border-purple-500', 'text-purple-600');
    historyTab.classList.add('border-transparent', 'text-gray-500');
    pendingList.classList.remove('hidden');
    historyList.classList.add('hidden');
  } else {
    historyTab.classList.add('border-purple-500', 'text-purple-600');
    historyTab.classList.remove('border-transparent', 'text-gray-500');
    pendingTab.classList.remove('border-purple-500', 'text-purple-600');
    pendingTab.classList.add('border-transparent', 'text-gray-500');
    historyList.classList.remove('hidden');
    pendingList.classList.add('hidden');
    loadVoluntaryHistory();
  }
}

function viewVoluntaryDetails(serviceId) {
  const allServices = [...voluntaryServices, ...voluntaryHistory];
  const service = allServices.find(s => s.id === serviceId);
  if (!service) return;
  
  const partsUsed = service.parts_used || [];
  const partsHtml = partsUsed.length > 0 ? partsUsed.map(p => `
    <div class="bg-gray-50 rounded p-2 text-sm">
      <div class="font-medium">${p.name}</div>
      <div class="text-xs text-gray-600">Qty: ${p.qty} ${p.unit || 'pcs'} | Brand: ${p.brand || 'N/A'}</div>
    </div>
  `).join('') : '<p class="text-sm text-gray-500">No parts used</p>';
  
  const modalContent = `
    <div class="space-y-4">
      <div class="bg-purple-50 rounded-lg p-3">
        <div class="text-xs text-purple-600 font-medium mb-1">Printer</div>
        <div class="font-bold text-gray-900">${service.printer_name}</div>
        <div class="text-sm text-gray-600">${service.brand || ''} ${service.model || ''}</div>
        <div class="text-xs text-gray-500 mt-1">${service.location || ''}</div>
      </div>
      
      <div>
        <div class="text-xs text-gray-600 font-medium mb-1">Institution</div>
        <div class="text-sm">${service.institution_name}</div>
      </div>
      
      <div>
        <div class="text-xs text-gray-600 font-medium mb-1">Technician</div>
        <div class="text-sm">${service.technician_name}</div>
      </div>
      
      ${service.coordinator_name ? `
      <div>
        <div class="text-xs text-gray-600 font-medium mb-1">Coordinator</div>
        <div class="text-sm">${service.coordinator_name}</div>
      </div>
      ` : ''}
      
      <div>
        <div class="text-xs text-gray-600 font-medium mb-1">Service Description</div>
        <div class="text-sm bg-gray-50 rounded p-3">${service.service_description || 'No description'}</div>
      </div>
      
      <div>
        <div class="text-xs text-gray-600 font-medium mb-2">Parts Used</div>
        <div class="space-y-2">${partsHtml}</div>
      </div>
      
      <div>
        <div class="text-xs text-gray-600 font-medium mb-1">Status</div>
        <span class="inline-block px-3 py-1 text-sm rounded-full ${getVoluntaryStatusColor(service)} font-medium">
          ${getVoluntaryStatusText(service)}
        </span>
      </div>
      
      <div class="text-xs text-gray-500">
        Submitted: ${new Date(service.created_at).toLocaleString()}
      </div>
      
      ${service.status !== 'completed' && service.status !== 'rejected' && 
        service.requester_approval_status === 'pending' && 
        service.coordinator_approval_status === 'pending' ? `
      <div class="flex space-x-3 pt-4 border-t">
        <button onclick="rejectVoluntaryService(${service.id})" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
          Reject
        </button>
        <button onclick="approveVoluntaryService(${service.id})" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
          Approve
        </button>
      </div>
      ` : service.coordinator_approval_status === 'approved' ? `
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
        <i class="fas fa-check-circle mr-2"></i>Already approved by coordinator
      </div>
      ` : service.status === 'completed' ? `
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
        <i class="fas fa-check-circle mr-2"></i>Service completed
      </div>
      ` : ''}
    </div>
  `;
  
  document.getElementById('voluntary-modal-content').innerHTML = modalContent;
  document.getElementById('voluntary-details-modal').classList.remove('hidden');
}

function closeVoluntaryModal() {
  document.getElementById('voluntary-details-modal').classList.add('hidden');
}

async function approveVoluntaryService(serviceId) {
  if (!confirm('Approve this voluntary service?')) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/voluntary-services/requester/${serviceId}/approve`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Approved by requester' })
    });
    
    if (response.ok) {
      alert('✅ Service approved successfully!');
      closeVoluntaryModal();
      await loadVoluntaryServices();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to approve service');
    }
  } catch (error) {
    console.error('Error approving service:', error);
    alert('Failed to approve service');
  }
}

async function rejectVoluntaryService(serviceId) {
  const reason = prompt('Please provide a reason for rejection:');
  if (!reason) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/voluntary-services/requester/${serviceId}/reject`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    if (response.ok) {
      alert('Service rejected. Technician has been notified.');
      closeVoluntaryModal();
      await loadVoluntaryServices();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to reject service');
    }
  } catch (error) {
    console.error('Error rejecting service:', error);
    alert('Failed to reject service');
  }
}

function showVoluntaryError(message) {
  const pending = document.getElementById('pending-voluntary-list');
  const history = document.getElementById('history-voluntary-list');
  const errorHtml = `<div class="p-4 text-center text-red-500">${message}</div>`;
  if (pending) pending.innerHTML = errorHtml;
  if (history) history.innerHTML = errorHtml;
}

// Make voluntary functions globally available
window.switchVoluntaryTab = switchVoluntaryTab;
window.viewVoluntaryDetails = viewVoluntaryDetails;
window.closeVoluntaryModal = closeVoluntaryModal;
window.approveVoluntaryService = approveVoluntaryService;
window.rejectVoluntaryService = rejectVoluntaryService;
window.handleApproval = handleApproval;

