// institutionAdmin Dashboard Application
// This file manages the institutionAdmin dashboard functionality and interactions

document.addEventListener('DOMContentLoaded', async function() {
    // Auth.js handles authentication and role verification
    // This script assumes the user is already authenticated and authorized
    
    // Initialize dashboard
    await initializeDashboard();
    
    // Set up real-time notifications
    setupNotifications();
    
    // Bind action handlers
    bindActionHandlers();
    
    // Handle page navigation
    handleNavigation();
});

// Authentication and user management
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        if (!userData) return null;
        return JSON.parse(userData);
    } catch (error) {
        console.error('Failed to retrieve user data', error);
        return null;
    }
}

async function initializeDashboard() {
    try {
        // Update user info in UI
        const user = getCurrentUser();
        if (user) {
            const welcomeName = document.getElementById('welcome-name');
            const userInitials = document.getElementById('user-initials');
            
            if (welcomeName) welcomeName.textContent = user.first_name;
            if (userInitials) userInitials.textContent = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`;
        }
        
        // Load dashboard statistics
        await loadDashboardStats();
        
        // Initialize service requests section
        await initializeServiceRequests();
        
        // Initialize printer management
        await initializePrinterManagement();
        
        // Initialize user management
        await initializeUserManagement();
        
        // Initialize service approvals
        await initializeServiceApprovals();
        
        // Initialize service history
        await initializeServiceHistory();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error', 'Failed to initialize dashboard. Please refresh the page.', 'error');
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/institution_admin/dashboard-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }
        
        const stats = await response.json();
        
        // Update stats in UI
        const totalPrintersElement = document.getElementById('total-printers-count');
        const totalUsersElement = document.getElementById('total-users-count');
        
        if (totalPrintersElement) {
            totalPrintersElement.innerHTML = stats.totalPrinters || 0;
        }
        
        if (totalUsersElement) {
            totalUsersElement.innerHTML = stats.totalUsers || 0;
        }
        
        // Optional: Update other stats if they exist
        const activeRequestsElement = document.getElementById('active-requests-count');
        const pendingApprovalsElement = document.getElementById('pending-approvals-count');
        
        if (activeRequestsElement) {
            activeRequestsElement.textContent = stats.activeRequests || 0;
        }
        
        if (pendingApprovalsElement) {
            pendingApprovalsElement.textContent = stats.pendingApprovals || 0;
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        
        // Show error in UI
        const totalPrintersElement = document.getElementById('total-printers-count');
        const totalUsersElement = document.getElementById('total-users-count');
        
        if (totalPrintersElement) {
            totalPrintersElement.innerHTML = '<span class="text-red-500 text-sm">Error</span>';
        }
        
        if (totalUsersElement) {
            totalUsersElement.innerHTML = '<span class="text-red-500 text-sm">Error</span>';
        }
        
        showNotification('Error', 'Failed to load dashboard statistics. Please refresh the page.', 'error');
    }
}

async function loadRecentActivity() {
    try {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;
        
        // Show loading state
        activityContainer.innerHTML = `
            <div class="flex items-center justify-center h-full py-8">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500">Loading activity...</p>
                </div>
            </div>
        `;
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response
        const response = await fetch('/api/institution_admin/recent-activity', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 1,
                        type: 'request',
                        message: 'New service request submitted for HP LaserJet Pro MFP',
                        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
                        actionable: true,
                        actionLink: '#service-requests'
                    },
                    {
                        id: 2,
                        type: 'approval',
                        message: 'Service completion awaiting your approval',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                        actionable: true,
                        actionLink: '#service-approvals'
                    },
                    {
                        id: 3,
                        type: 'completion',
                        message: 'Printer maintenance completed for Canon ImageClass',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
                        actionable: false
                    },
                    {
                        id: 4,
                        type: 'warning',
                        message: 'Toner level low for Epson WorkForce Pro',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
                        actionable: true,
                        actionLink: '#printer-management'
                    },
                    {
                        id: 5,
                        type: 'request',
                        message: 'New printer added to your inventory',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
                        actionable: false
                    }
                ])
            };
        });
        
        const activities = await response.json();
        
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
            <div class="flex items-start p-4 bg-gray-50 rounded-lg mb-4 hover:bg-gray-100 transition-colors">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-${getActivityColor(activity.type)}-100 flex items-center justify-center">
                    <i class="fas ${getActivityIcon(activity.type)} text-${getActivityColor(activity.type)}-600"></i>
                </div>
                <div class="ml-4 flex-1">
                    <p class="text-sm font-medium text-gray-900">${activity.message}</p>
                    <p class="text-xs text-gray-500 mt-1">${formatTimeAgo(activity.timestamp)}</p>
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
        document.getElementById('recent-activity').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-4xl mb-2 text-red-400"></i>
                <p>Failed to load activities</p>
                <button id="retry-activity" class="mt-2 text-blue-600 hover:text-blue-800">
                    <i class="fas fa-redo mr-1"></i> Retry
                </button>
            </div>
        `;
        document.getElementById('retry-activity')?.addEventListener('click', loadRecentActivity);
    }
}

// Service Requests Section
async function initializeServiceRequests() {
    try {
        // Initialize form elements and listeners for service requests
        const newRequestBtn = document.getElementById('new-service-request-btn');
        const submitRequestBtn = document.getElementById('submitNewRequest');
        const cancelRequestBtn = document.getElementById('cancelNewRequest');
        const servicePrinterSelect = document.getElementById('servicePrinterSelect');
        
        if (newRequestBtn && !newRequestBtn.dataset.listenerSet) {
            newRequestBtn.addEventListener('click', () => {
                document.getElementById('newRequestModal').classList.remove('hidden');
                loadPrintersForServiceRequest();
            });
            newRequestBtn.dataset.listenerSet = 'true';
        }
        
        if (submitRequestBtn && !submitRequestBtn.dataset.listenerSet) {
            submitRequestBtn.addEventListener('click', submitServiceRequest);
            submitRequestBtn.dataset.listenerSet = 'true';
        }
        
        if (cancelRequestBtn) {
            cancelRequestBtn.addEventListener('click', () => {
                document.getElementById('newRequestModal').classList.add('hidden');
            });
        }
        
        // Load existing service requests
        await loadServiceRequests();
        
    } catch (error) {
        console.error('Error initializing service requests:', error);
    }
}

async function loadPrintersForServiceRequest() {
    try {
        const select = document.getElementById('servicePrinterSelect');
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response
        const response = await fetch('/api/institution_admin/printers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    { id: 1, name: 'HP LaserJet Pro MFP', model: 'M428fdw', serial: 'SN123456789' },
                    { id: 2, name: 'Canon ImageClass', model: 'MF445dw', serial: 'SN987654321' },
                    { id: 3, name: 'Epson WorkForce Pro', model: 'WF-4830', serial: 'SN456789123' },
                    { id: 4, name: 'Brother MFC', model: 'L8900CDW', serial: 'SN789123456' }
                ])
            };
        });
        
        const printers = await response.json();
        
        // Add printers to select
        printers.forEach(printer => {
            const option = document.createElement('option');
            option.value = printer.id;
            option.textContent = `${printer.name} (${printer.model} - ${printer.serial})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading printers for service request:', error);
        showNotification('Error', 'Failed to load printers. Please try again.', 'error');
    }
}

async function submitServiceRequest() {
    try {
        // Get form data
        const printerSelect = document.getElementById('servicePrinterSelect');
        const serviceType = document.getElementById('serviceType');
        const priority = document.getElementById('priority');
        const description = document.getElementById('issueDescription');
        const contactName = document.getElementById('contactName');
        const contactInfo = document.getElementById('contactInfo');
        
        // Validate form data
        if (!printerSelect.value || !serviceType.value || !description.value || !contactName.value || !contactInfo.value) {
            showNotification('Error', 'Please fill in all required fields', 'error');
            return;
        }
        
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch('/api/service-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                printerId: printerSelect.value,
                serviceType: serviceType.value,
                priority: priority.value,
                description: description.value,
                contactName: contactName.value,
                contactInfo: contactInfo.value
            })
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            // Hide modal
            document.getElementById('newRequestModal').classList.add('hidden');
            
            // Reset form
            document.getElementById('newRequestForm').reset();
            
            // Show success notification
            showNotification('Success', 'Service request submitted successfully', 'success');
            
            // Reload service requests
            await loadServiceRequests();
        } else {
            showNotification('Error', 'Failed to submit service request. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error submitting service request:', error);
        showNotification('Error', 'Failed to submit service request. Please try again.', 'error');
    }
}

async function loadServiceRequests() {
    // This functionality is handled by client-service-management.js
    // We could extend it here if needed
}

// Printer Management Section
async function initializePrinterManagement() {
    // This functionality is handled by client-printers.js
    // We could extend it here if needed
}

// User Management Section
async function initializeUserManagement() {
    try {
        // Initialize form elements and listeners for user management
        const addUserBtn = document.getElementById('add-user-btn');
        const submitUserBtn = document.getElementById('submitAddUser');
        const cancelUserBtn = document.getElementById('cancelAddUser');
        
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                document.getElementById('addUserModal').classList.remove('hidden');
            });
        }
        
        if (submitUserBtn) {
            submitUserBtn.addEventListener('click', submitNewUser);
        }
        
        if (cancelUserBtn) {
            cancelUserBtn.addEventListener('click', () => {
                document.getElementById('addUserModal').classList.add('hidden');
            });
        }
        
        // Load existing users
        await loadUsers();
        
    } catch (error) {
        console.error('Error initializing user management:', error);
    }
}

async function submitNewUser() {
    try {
        // Get form data
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        
        // Validate form data
        if (!firstName || !lastName || !email) {
            showNotification('Error', 'Please fill in all required fields', 'error');
            return;
        }
        
        // Get current user to add to their institution
        const user = getCurrentUser();
        if (!user) {
            showNotification('Error', 'User not authenticated', 'error');
            return;
        }
        
        // Send request to add user to institution_admin's institution
        const response = await fetch(`/api/institution_admins/${user.id}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                role
            })
        });
        
        if (response.ok) {
            // Hide modal
            document.getElementById('addUserModal').classList.add('hidden');
            
            // Reset form
            document.getElementById('addUserForm').reset();
            
            // Show success notification
            showNotification('Success', 'User added successfully', 'success');
            
            // Reload users
            await loadUsers();
        } else {
            showNotification('Error', 'Failed to add user. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification('Error', 'Failed to add user. Please try again.', 'error');
    }
}

async function loadUsers() {
    try {
        const usersTbody = document.getElementById('usersTbody');
        const usersEmptyState = document.getElementById('usersEmptyState');
        
        if (!usersTbody || !usersEmptyState) return;
        
        // Show loading
        usersTbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center">
                    <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500">Loading users...</p>
                </td>
            </tr>
        `;
        
        // Get current user to fetch their institution's users
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        // Fetch users from institution_admin's institution
        const response = await fetch(`/api/institution_admins/${user.id}/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }
        
        const users = await response.json();
        
        if (users.length === 0) {
            usersTbody.innerHTML = '';
            usersEmptyState.classList.remove('hidden');
            return;
        }
        
        usersEmptyState.classList.add('hidden');
        
        usersTbody.innerHTML = users.map(user => `
            <tr data-id="${user.id}" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span class="text-sm font-medium">${user.first_name.charAt(0)}${user.last_name.charAt(0)}</span>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.first_name} ${user.last_name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">${user.role}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-user-btn">Edit</button>
                    <button class="text-blue-600 hover:text-blue-900 mr-3 change-password-btn">Change Password</button>
                    <button class="text-red-600 hover:text-red-900 delete-user-btn">
                        ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners for edit and delete buttons
        usersTbody.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.closest('tr').dataset.id;
                editUser(userId);
            });
        });
        
        usersTbody.querySelectorAll('.change-password-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.closest('tr').dataset.id;
                showChangePasswordModal(userId);
            });
        });
        
        usersTbody.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.closest('tr').dataset.id;
                const isActive = this.textContent.trim() === 'Deactivate';
                toggleUserStatus(userId, !isActive);
            });
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        const usersTbody = document.getElementById('usersTbody');
        if (usersTbody) {
            usersTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center">
                        <i class="fas fa-exclamation-circle text-3xl text-red-400 mb-3"></i>
                        <p class="text-gray-500">Failed to load users</p>
                        <button id="retry-users" class="mt-2 text-blue-600 hover:text-blue-800">
                            <i class="fas fa-redo mr-1"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
            document.getElementById('retry-users')?.addEventListener('click', loadUsers);
        }
    }
}

function editUser(userId) {
    // This would show a modal to edit user details
    showNotification('Info', 'Edit user functionality not implemented yet', 'info');
}

async function toggleUserStatus(userId, activate) {
    try {
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                active: activate
            })
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            // Show success notification
            showNotification('Success', `User ${activate ? 'activated' : 'deactivated'} successfully`, 'success');
            
            // Reload users
            await loadUsers();
        } else {
            showNotification('Error', 'Failed to update user status. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showNotification('Error', 'Failed to update user status. Please try again.', 'error');
    }
}

// Change Password Functions
let currentPasswordChangeUserId = null;
let currentPasswordChangeUserName = null;

function showChangePasswordModal(userId) {
    // Get user info from the table row
    const userRow = document.querySelector(`tr[data-id="${userId}"]`);
    if (!userRow) return;
    
    const userName = userRow.querySelector('.text-sm.font-medium.text-gray-900').textContent;
    
    currentPasswordChangeUserId = userId;
    currentPasswordChangeUserName = userName;
    
    // Update modal with user info
    document.getElementById('passwordChangeUserName').textContent = userName;
    
    // Clear form
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordError').classList.add('hidden');
    
    // Show modal
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

function hideChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('hidden');
    currentPasswordChangeUserId = null;
    currentPasswordChangeUserName = null;
}

async function submitPasswordChange() {
    try {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('passwordError');
        const errorText = errorDiv.querySelector('p');
        
        // Validate passwords
        if (!newPassword || newPassword.length < 6) {
            errorText.textContent = 'Password must be at least 6 characters long';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            errorText.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Hide error
        errorDiv.classList.add('hidden');
        
        // Get current user (institutionAdmin)
        const user = getCurrentUser();
        if (!user) {
            showNotification('Error', 'Authentication required', 'error');
            return;
        }
        
        // Send request to change password
        const response = await fetch(`/api/institution_admins/${user.id}/users/${currentPasswordChangeUserId}/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Success', `Password changed successfully for ${currentPasswordChangeUserName}`, 'success');
            hideChangePasswordModal();
        } else {
            errorText.textContent = data.error || 'Failed to change password';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        const errorDiv = document.getElementById('passwordError');
        const errorText = errorDiv.querySelector('p');
        errorText.textContent = 'Failed to change password. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Service Approvals Section
async function initializeServiceApprovals() {
    try {
        await loadServiceApprovals();
    } catch (error) {
        console.error('Error initializing service approvals:', error);
    }
}

async function loadServiceApprovals() {
    try {
        const approvalsContainer = document.getElementById('approvals-container');
        const approvalsLoading = document.getElementById('approvals-loading');
        const approvalsEmpty = document.getElementById('approvals-empty');
        
        if (!approvalsContainer || !approvalsLoading || !approvalsEmpty) return;
        
        // Show loading
        approvalsLoading.classList.remove('hidden');
        approvalsContainer.classList.add('hidden');
        approvalsEmpty.classList.add('hidden');
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response
        const response = await fetch('/api/institution_admin/pending-approvals', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 1,
                        request_id: 101,
                        printer_name: 'HP LaserJet Pro MFP',
                        printer_model: 'M428fdw',
                        service_type: 'Repair',
                        completion_date: new Date().toISOString(),
                        technician_name: 'Robert Smith',
                        parts_replaced: ['Fuser Unit', 'Transfer Roller'],
                        notes: 'Replaced fuser unit and transfer roller. Performed full calibration and test prints confirm proper operation.'
                    },
                    {
                        id: 2,
                        request_id: 102,
                        printer_name: 'Canon ImageClass',
                        printer_model: 'MF445dw',
                        service_type: 'Maintenance',
                        completion_date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
                        technician_name: 'Alice Johnson',
                        parts_replaced: [],
                        notes: 'Performed scheduled maintenance. Cleaned all sensors, rollers and internal components. Calibrated color output.'
                    }
                ])
            };
        });
        
        const approvals = await response.json();
        
        // Hide loading
        approvalsLoading.classList.add('hidden');
        
        if (approvals.length === 0) {
            approvalsEmpty.classList.remove('hidden');
            return;
        }
        
        approvalsContainer.classList.remove('hidden');
        approvalsContainer.innerHTML = approvals.map(approval => `
            <div class="bg-white border rounded-lg shadow-sm p-6" data-id="${approval.id}">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">Service Request #${approval.request_id}</h3>
                        <p class="text-sm text-gray-600">Completed on ${new Date(approval.completion_date).toLocaleDateString()}</p>
                    </div>
                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Pending Approval</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-900">Printer Details</h4>
                        <p class="text-sm text-gray-600">${approval.printer_name}</p>
                        <p class="text-sm text-gray-600">Model: ${approval.printer_model}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-900">Service Details</h4>
                        <p class="text-sm text-gray-600">Type: ${approval.service_type}</p>
                        <p class="text-sm text-gray-600">Technician: ${approval.technician_name}</p>
                    </div>
                </div>
                
                ${approval.parts_replaced.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="text-sm font-medium text-gray-900">Parts Replaced</h4>
                        <ul class="mt-1 text-sm text-gray-600 list-disc pl-5">
                            ${approval.parts_replaced.map(part => `<li>${part}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-900">Service Notes</h4>
                    <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-1">${approval.notes}</p>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button class="reject-btn px-4 py-2 bg-white border border-red-600 text-red-600 rounded hover:bg-red-50">
                        Reject
                    </button>
                    <button class="approve-btn px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Approve
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for approval buttons
        approvalsContainer.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const approvalId = this.closest('[data-id]').dataset.id;
                approveServiceCompletion(approvalId);
            });
        });
        
        approvalsContainer.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const approvalId = this.closest('[data-id]').dataset.id;
                rejectServiceCompletion(approvalId);
            });
        });
        
    } catch (error) {
        console.error('Error loading service approvals:', error);
        const approvalsLoading = document.getElementById('approvals-loading');
        const approvalsContainer = document.getElementById('approvals-container');
        if (approvalsLoading) approvalsLoading.classList.add('hidden');
        if (approvalsContainer) {
            approvalsContainer.classList.remove('hidden');
            approvalsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-3xl text-red-400 mb-3"></i>
                    <p class="text-gray-700">Failed to load service approvals</p>
                    <button id="retry-approvals" class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-redo mr-1"></i> Retry
                    </button>
                </div>
            `;
            document.getElementById('retry-approvals')?.addEventListener('click', loadServiceApprovals);
        }
    }
}

async function approveServiceCompletion(approvalId) {
    try {
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch(`/api/service-completions/${approvalId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            showNotification('Success', 'Service completion approved successfully', 'success');
            await loadServiceApprovals();
            // Also update dashboard stats
            await loadDashboardStats();
        } else {
            showNotification('Error', 'Failed to approve service completion. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error approving service completion:', error);
        showNotification('Error', 'Failed to approve service completion. Please try again.', 'error');
    }
}

async function rejectServiceCompletion(approvalId) {
    // Show a prompt for rejection reason
    const reason = prompt('Please provide a reason for rejecting this service completion:');
    if (reason === null) return; // User cancelled
    
    try {
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch(`/api/service-completions/${approvalId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ reason })
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            showNotification('Success', 'Service completion rejected successfully', 'success');
            await loadServiceApprovals();
            // Also update dashboard stats
            await loadDashboardStats();
        } else {
            showNotification('Error', 'Failed to reject service completion. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error rejecting service completion:', error);
        showNotification('Error', 'Failed to reject service completion. Please try again.', 'error');
    }
}

// Service History Section
async function initializeServiceHistory() {
    try {
        const printerSelect = document.getElementById('printerSelect');
        const historyTypeFilter = document.getElementById('historyTypeFilter');
        
        if (printerSelect) {
            // Load printers for the dropdown
            await loadPrintersForHistory();
            
            // Add event listener for printer selection change
            printerSelect.addEventListener('change', loadServiceHistory);
        }
        
        if (historyTypeFilter) {
            historyTypeFilter.addEventListener('change', loadServiceHistory);
        }
        
        // Load initial service history
        await loadServiceHistory();
    } catch (error) {
        console.error('Error initializing service history:', error);
    }
}

async function loadPrintersForHistory() {
    try {
        const select = document.getElementById('printerSelect');
        if (!select) return;
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response
        const response = await fetch('/api/institution_admin/printers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    { id: 1, name: 'HP LaserJet Pro MFP', model: 'M428fdw', serial: 'SN123456789' },
                    { id: 2, name: 'Canon ImageClass', model: 'MF445dw', serial: 'SN987654321' },
                    { id: 3, name: 'Epson WorkForce Pro', model: 'WF-4830', serial: 'SN456789123' },
                    { id: 4, name: 'Brother MFC', model: 'L8900CDW', serial: 'SN789123456' }
                ])
            };
        });
        
        const printers = await response.json();
        
        // Add printers to select
        printers.forEach(printer => {
            const option = document.createElement('option');
            option.value = printer.id;
            option.textContent = `${printer.name} (${printer.model})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading printers for history:', error);
    }
}

async function loadServiceHistory() {
    try {
        const historyContainer = document.getElementById('history-timeline');
        if (!historyContainer) return;
        
        const printerSelect = document.getElementById('printerSelect');
        const historyTypeFilter = document.getElementById('historyTypeFilter');
        
        const printerId = printerSelect ? printerSelect.value : '';
        const serviceType = historyTypeFilter ? historyTypeFilter.value : '';
        
        // Show loading
        historyContainer.innerHTML = `
            <div class="flex items-center justify-center h-full py-16">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500">Loading service history...</p>
                </div>
            </div>
        `;
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response with query params
        const response = await fetch(`/api/service-history?printerId=${printerId}&type=${serviceType}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 1,
                        request_id: 101,
                        printer_name: 'HP LaserJet Pro MFP',
                        printer_model: 'M428fdw',
                        service_type: 'Repair',
                        status: 'Completed',
                        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
                        technician_name: 'Robert Smith',
                        notes: 'Replaced fuser unit and transfer roller. Performed full calibration and test prints confirm proper operation.'
                    },
                    {
                        id: 2,
                        request_id: 102,
                        printer_name: 'Canon ImageClass',
                        printer_model: 'MF445dw',
                        service_type: 'Maintenance',
                        status: 'Completed',
                        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
                        technician_name: 'Alice Johnson',
                        notes: 'Performed scheduled maintenance. Cleaned all sensors, rollers and internal components. Calibrated color output.'
                    },
                    {
                        id: 3,
                        request_id: 103,
                        printer_name: 'HP LaserJet Pro MFP',
                        printer_model: 'M428fdw',
                        service_type: 'Repair',
                        status: 'Completed',
                        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
                        technician_name: 'David Wilson',
                        notes: 'Replaced toner cartridge and drum unit. Printer is now functioning properly.'
                    }
                ].filter(item => {
                    if (printerId && item.printer_name !== 'HP LaserJet Pro MFP') return false;
                    if (serviceType && item.service_type.toLowerCase() !== serviceType.toLowerCase()) return false;
                    return true;
                }))
            };
        });
        
        const history = await response.json();
        
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center py-16">
                    <i class="fas fa-history text-5xl text-gray-300 mb-3"></i>
                    <p class="text-lg text-gray-500">No service history found</p>
                    <p class="text-gray-400">Try adjusting your filters</p>
                </div>
            `;
            return;
        }
        
        // Create timeline HTML
        historyContainer.innerHTML = `
            <div class="border-l-2 border-blue-500 ml-6">
                ${history.map((item, index) => `
                    <div class="relative mb-8">
                        <div class="absolute -left-6 mt-2">
                            <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <i class="fas ${getServiceIcon(item.service_type)} text-white"></i>
                            </div>
                        </div>
                        <div class="ml-8">
                            <div class="bg-white rounded-lg shadow p-4 border-l-4 ${getServiceBorderColor(item.service_type)}">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 class="text-md font-medium text-gray-900">${item.service_type} - ${item.printer_name}</h3>
                                        <p class="text-sm text-gray-600">Request #${item.request_id}</p>
                                    </div>
                                    <span class="px-2 py-1 ${getStatusColor(item.status)} text-xs font-semibold rounded-full">
                                        ${item.status}
                                    </span>
                                </div>
                                
                                <div class="text-sm text-gray-600 mb-2">
                                    <p><span class="font-medium">Date:</span> ${new Date(item.date).toLocaleDateString()}</p>
                                    <p><span class="font-medium">Technician:</span> ${item.technician_name}</p>
                                </div>
                                
                                <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    ${item.notes}
                                </div>
                                
                                <div class="mt-4 text-right">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm view-history-details" data-id="${item.id}">
                                        View Full Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners for view details buttons
        historyContainer.querySelectorAll('.view-history-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const historyId = this.dataset.id;
                viewHistoryDetails(historyId);
            });
        });
        
    } catch (error) {
        console.error('Error loading service history:', error);
        const historyContainer = document.getElementById('history-timeline');
        if (historyContainer) {
            historyContainer.innerHTML = `
                <div class="text-center py-16">
                    <i class="fas fa-exclamation-circle text-5xl text-red-400 mb-3"></i>
                    <p class="text-lg text-gray-700">Failed to load service history</p>
                    <button id="retry-history" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-redo mr-1"></i> Try Again
                    </button>
                </div>
            `;
            document.getElementById('retry-history')?.addEventListener('click', loadServiceHistory);
        }
    }
}

function viewHistoryDetails(historyId) {
    // This would show a modal with detailed history
    showNotification('Info', 'History details view not implemented yet', 'info');
}

// Real-time Notifications
function setupNotifications() {
    try {
        // For real-time WebSocket notifications, refer to the institution_admin-sidebar.js
        // Here we'll just setup notification center toggle
        
        const notificationButton = document.getElementById('notifications-button');
        const closeNotificationsBtn = document.getElementById('close-notifications');
        const notificationCenter = document.getElementById('notification-center');
        
        if (notificationButton && notificationCenter) {
            notificationButton.addEventListener('click', () => {
                notificationCenter.classList.toggle('translate-x-full');
                loadNotifications();
            });
        }
        
        if (closeNotificationsBtn) {
            closeNotificationsBtn.addEventListener('click', () => {
                notificationCenter.classList.add('translate-x-full');
            });
        }
    } catch (error) {
        console.error('Error setting up notifications:', error);
    }
}

async function loadNotifications() {
    try {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;
        
        // Show loading
        notificationList.innerHTML = `
            <div class="flex items-center justify-center h-full py-8">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-500">Loading notifications...</p>
                </div>
            </div>
        `;
        
        // In a real implementation, this would fetch from your API
        // For now, we'll simulate API response
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, return mock data
            return {
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: 1,
                        type: 'request',
                        title: 'New Service Request',
                        message: 'New service request submitted for HP LaserJet Pro MFP',
                        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                        read: false
                    },
                    {
                        id: 2,
                        type: 'approval',
                        title: 'Awaiting Approval',
                        message: 'Service completion awaiting your approval',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                        read: false
                    },
                    {
                        id: 3,
                        type: 'completion',
                        title: 'Service Completed',
                        message: 'Printer maintenance completed for Canon ImageClass',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                        read: true
                    },
                    {
                        id: 4,
                        type: 'warning',
                        title: 'Toner Low',
                        message: 'Toner level low for Epson WorkForce Pro',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                        read: true
                    }
                ])
            };
        });
        
        const notifications = await response.json();
        
        // Update notification badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const unreadCount = notifications.filter(n => !n.read).length;
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }
        
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-bell-slash text-4xl mb-3"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }
        
        notificationList.innerHTML = `
            <div class="space-y-4">
                ${notifications.map(notification => `
                    <div class="notification-item p-4 rounded-lg border ${notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}" data-id="${notification.id}">
                        <div class="flex items-start">
                            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-${getActivityColor(notification.type)}-100 flex items-center justify-center">
                                <i class="fas ${getActivityIcon(notification.type)} text-${getActivityColor(notification.type)}-600"></i>
                            </div>
                            <div class="ml-3 flex-1">
                                <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                                <p class="text-sm text-gray-600">${notification.message}</p>
                                <p class="text-xs text-gray-500 mt-1">${formatTimeAgo(notification.timestamp)}</p>
                            </div>
                            ${!notification.read ? `
                                <button class="mark-read-btn ml-2 text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 text-center">
                <button id="mark-all-read" class="text-sm text-blue-600 hover:text-blue-800">
                    Mark all as read
                </button>
            </div>
        `;
        
        // Add event listeners for mark read buttons
        notificationList.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const notificationId = this.closest('.notification-item').dataset.id;
                markNotificationRead(notificationId);
            });
        });
        
        document.getElementById('mark-all-read')?.addEventListener('click', markAllNotificationsRead);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        const notificationList = document.getElementById('notification-list');
        if (notificationList) {
            notificationList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-3xl text-red-400 mb-3"></i>
                    <p class="text-gray-700">Failed to load notifications</p>
                    <button id="retry-notifications" class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-redo mr-1"></i> Retry
                    </button>
                </div>
            `;
            document.getElementById('retry-notifications')?.addEventListener('click', loadNotifications);
        }
    }
}

async function markNotificationRead(id) {
    try {
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            // Reload notifications
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        // In a real implementation, this would send data to your API
        // For now, we'll simulate API call
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(() => {
            // If API is not available, simulate success
            return { ok: true };
        });
        
        if (response.ok) {
            // Reload notifications
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// Helper functions for page navigation
function handleNavigation() {
    // If URL has a hash, navigate to that section
    if (window.location.hash) {
        const hash = window.location.hash;
        const pageId = {
            '#service-requests': 'service-requests-page',
            '#printer-management': 'printer-management-page',
            '#user-management': 'user-management-page',
            '#service-approvals': 'service-approvals-page',
            '#service-history': 'service-history-page'
        }[hash];
        
        if (pageId) {
            showPage(pageId);
        }
    }

    // Listen for hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash;
        const pageId = {
            '#service-requests': 'service-requests-page',
            '#printer-management': 'printer-management-page',
            '#user-management': 'user-management-page',
            '#service-approvals': 'service-approvals-page',
            '#service-history': 'service-history-page'
        }[hash];
        
        if (pageId) {
            showPage(pageId);
        }
    });
}

function showPage(pageId) {
    const pageContainer = document.getElementById('page-container');
    pageContainer.classList.remove('hidden');
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show requested page
    document.getElementById(pageId).classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function bindActionHandlers() {
    // Action handlers can be added here if needed
    // Currently, most actions are handled in their respective sections
}

// Utility functions
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

function getServiceIcon(type) {
    switch (type.toLowerCase()) {
        case 'repair': return 'fa-tools';
        case 'maintenance': return 'fa-sync-alt';
        case 'installation': return 'fa-box-open';
        case 'relocation': return 'fa-truck';
        default: return 'fa-print';
    }
}

function getServiceBorderColor(type) {
    switch (type.toLowerCase()) {
        case 'repair': return 'border-red-500';
        case 'maintenance': return 'border-blue-500';
        case 'installation': return 'border-green-500';
        case 'relocation': return 'border-purple-500';
        default: return 'border-gray-500';
    }
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'new': return 'bg-blue-100 text-blue-800';
        case 'in progress': return 'bg-yellow-100 text-yellow-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'issue': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) {
        return 'Just now';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function showNotification(title, message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-100 border-green-500' : 
                   type === 'error' ? 'bg-red-100 border-red-500' : 
                   'bg-blue-100 border-blue-500';
    const textColor = type === 'success' ? 'text-green-700' : 
                     type === 'error' ? 'text-red-700' : 
                     'text-blue-700';
    const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 
               'fa-info-circle';
    
    toast.className = `fixed bottom-4 right-4 ${bgColor} border-l-4 p-4 rounded shadow-lg max-w-md z-50`;
    toast.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <i class="fas ${icon} ${textColor}"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium ${textColor}">${title}</p>
                <p class="text-sm ${textColor} opacity-90">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 ${textColor}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 5000);
}

// Make functions globally accessible
window.submitPasswordChange = submitPasswordChange;
window.showChangePasswordModal = showChangePasswordModal;
window.hideChangePasswordModal = hideChangePasswordModal;





