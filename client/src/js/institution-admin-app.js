// institutionAdmin Application Logic

document.addEventListener('DOMContentLoaded', async function() {
    // Check auth first
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/src/pages/login.html';
        return;
    }

    // Load dashboard data
    await loadDashboardStats();
    await loadRecentActivity();
});

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        
        let activeRequests = 0;
        let pendingApprovals = 0;
        let totalPrinters = 0;
        let activeUsers = 0;
        
        // Try to get maintenance services - this endpoint exists
        try {
            const maintenanceResponse = await fetch('http://localhost:3000/api/maintenance-services/institution_admin/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (maintenanceResponse.ok) {
                const maintenanceData = await maintenanceResponse.json();
                pendingApprovals = maintenanceData.services?.length || 0;
            }
        } catch (e) {
            console.log('Could not load maintenance services:', e);
        }
        
        // Try to get service requests
        try {
            const serviceRequestsResponse = await fetch('http://localhost:3000/api/service-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (serviceRequestsResponse.ok) {
                const serviceData = await serviceRequestsResponse.json();
                activeRequests = serviceData.length || 0;
            }
        } catch (e) {
            console.log('Could not load service requests:', e);
        }
        
        // Get auth info to get institution details
        try {
            const authResponse = await fetch('http://localhost:3000/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (authResponse.ok) {
                const userData = await authResponse.json();
                
                // Get institutions for this admin
                const institutionsResponse = await fetch('http://localhost:3000/api/institutions/search', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (institutionsResponse.ok) {
                    const institutions = await institutionsResponse.json();
                    // Count printers across all institutions
                    for (const inst of institutions) {
                        try {
                            const printerResponse = await fetch(`http://localhost:3000/api/institutions/${inst.institution_id}/printers`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (printerResponse.ok) {
                                const printers = await printerResponse.json();
                                totalPrinters += printers.length || 0;
                            }
                        } catch (e) {
                            console.log('Could not load printers for institution:', e);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('Could not load auth/institution data:', e);
        }
        
        // Update stats displays with whatever data we got
        document.getElementById('active-requests-count').textContent = activeRequests;
        document.getElementById('pending-approvals-count').textContent = pendingApprovals;
        document.getElementById('total-printers-count').textContent = totalPrinters;
        document.getElementById('active-users-count').textContent = activeUsers;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Set defaults
        document.getElementById('active-requests-count').textContent = '0';
        document.getElementById('pending-approvals-count').textContent = '0';
        document.getElementById('total-printers-count').textContent = '0';
        document.getElementById('active-users-count').textContent = '0';
    }
}

async function loadRecentActivity() {
    try {
        const token = localStorage.getItem('token');
        const activityContainer = document.getElementById('recent-activity');
        
        // Get recent maintenance services
        const maintenanceResponse = await fetch('http://localhost:3000/api/maintenance-services/institution_admin/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!maintenanceResponse.ok) {
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        const data = await maintenanceResponse.json();
        const activities = data.services?.slice(0, 5) || [];
        
        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        activityContainer.innerHTML = activities.map(service => `
            <div class="flex items-start p-4 bg-gray-50 rounded-lg">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-${service.status === 'completed' ? 'green' : 'red'}-100 flex items-center justify-center">
                    <i class="fas ${service.status === 'completed' ? 'fa-check-circle' : 'fa-times-circle'} text-${service.status === 'completed' ? 'green' : 'red'}-600"></i>
                </div>
                <div class="ml-4 flex-1">
                    <p class="text-sm font-medium text-gray-900">
                        Maintenance service ${service.status} for ${service.printer_name}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${service.technician_name} • ${new Date(service.created_at).toLocaleDateString()}
                    </p>
                </div>
                <a href="/pages/institution-admin/maintenance-services.html" class="ml-4 text-sm font-medium text-blue-600 hover:text-blue-800">
                    View
                </a>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recent activity:', error);
        const activityContainer = document.getElementById('recent-activity');
        activityContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p>No recent activity</p>
            </div>
        `;
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





