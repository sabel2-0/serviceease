// institutionAdmin Application Logic

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user || user.role !== 'institutionAdmin') {
        window.location.href = '/pages/login.html';
        return;
    }

    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = `${user.first_name}`;
    }

    // Load dashboard data
    await loadDashboardStats();
    await loadRecentActivity();
});

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/institutionAdmin/dashboard-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard statistics');
        }

        const stats = await response.json();
        
        // Update stats displays
        document.getElementById('active-requests-count').textContent = stats.activeRequests;
        document.getElementById('pending-approvals-count').textContent = stats.pendingApprovals;
        document.getElementById('total-printers-count').textContent = stats.totalPrinters;
        document.getElementById('active-users-count').textContent = stats.activeUsers;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showErrorNotification('Failed to load dashboard statistics');
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/institutionAdmin/recent-activity', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load recent activity');
        }

        const activities = await response.json();
        const activityContainer = document.getElementById('recent-activity');
        
        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        activityContainer.innerHTML = activities.map(activity => `
            <div class="flex items-start p-4 bg-gray-50 rounded-lg">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-${getActivityColor(activity.type)}-100 flex items-center justify-center">
                    <i class="fas ${getActivityIcon(activity.type)} text-${getActivityColor(activity.type)}-600"></i>
                </div>
                <div class="ml-4 flex-1">
                    <p class="text-sm font-medium text-gray-900">${activity.message}</p>
                    <p class="text-xs text-gray-500 mt-1">${formatDate(activity.timestamp)}</p>
                </div>
                ${activity.actionable ? `
                    <a href="${activity.actionLink}" class="ml-4 text-sm font-medium text-blue-600 hover:text-blue-800">
                        View Details
                    </a>
                ` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recent activity:', error);
        showErrorNotification('Failed to load recent activity');
    }
}

function getActivityColor(type) {
    switch (type) {
        case 'request': return 'blue';
        case 'approval': return 'yellow';
        case 'completion': return 'green';
        case 'warning': return 'red';
        default: return 'gray';
    }
}

function getActivityIcon(type) {
    switch (type) {
        case 'request': return 'fa-clipboard-list';
        case 'approval': return 'fa-check-circle';
        case 'completion': return 'fa-check-double';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-bell';
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg';
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}





