
// Account Management Page Logic
document.addEventListener('DOMContentLoaded', function() {
    // Load current user profile into the form
    loadProfile();

    // Profile form submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const data = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                department: formData.get('department')
            };
            try {
                const res = await fetch('/api/account/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Profile updated successfully.');
                    loadProfile();
                } else {
                    const err = await res.json();
                    alert('Error updating profile: ' + (err.message || 'Unknown error'));
                }
            } catch (err) {
                alert('Error updating profile: ' + err.message);
            }
        });
    }

    // Security form submit (password change)
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(securityForm);
            const data = {
                currentPassword: formData.get('currentPassword'),
                newPassword: formData.get('newPassword'),
                confirmPassword: formData.get('confirmPassword')
            };
            if (data.newPassword !== data.confirmPassword) {
                alert('New passwords do not match.');
                return;
            }
            try {
                const res = await fetch('/api/account/password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Password updated successfully.');
                    securityForm.reset();
                } else {
                    const err = await res.json();
                    alert('Error updating password: ' + (err.message || 'Unknown error'));
                }
            } catch (err) {
                alert('Error updating password: ' + err.message);
            }
        });
    }

    // Notification preferences form
    const notificationsForm = document.getElementById('notifications-form');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(notificationsForm);
            const data = {
                email_notifications: !!formData.get('email_notifications'),
                browser_notifications: !!formData.get('browser_notifications')
            };
            try {
                const res = await fetch('/api/account/notifications', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Notification preferences updated.');
                } else {
                    const err = await res.json();
                    alert('Error updating notification preferences: ' + (err.message || 'Unknown error'));
                }
            } catch (err) {
                alert('Error updating notification preferences: ' + err.message);
            }
        });
    }
});

// Load current user profile and fill form
async function loadProfile() {
    try {
        const res = await fetch('/api/account/profile');
        if (res.ok) {
            const user = await res.json();
            document.getElementById('firstName').value = user.firstName || '';
            document.getElementById('lastName').value = user.lastName || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('department').value = user.department || '';
            // Optionally load notification preferences if present
            if (user.notifications) {
                document.getElementById('email_notifications').checked = !!user.notifications.email;
                document.getElementById('browser_notifications').checked = !!user.notifications.browser;
            }
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// Form Submission Handlers
document.getElementById('createUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User created successfully');
            closeCreateUserModal();
        } else {
            const error = await response.json();
            alert('Error creating user: ' + error.message);
        }
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
});

document.getElementById('updateUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const email = formData.get('searchEmail');
    
    try {
        const response = await fetch('/api/users/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User updated successfully');
            closeUpdateUserModal();
        } else {
            const error = await response.json();
            alert('Error updating user: ' + error.message);
        }
    } catch (error) {
        alert('Error updating user: ' + error.message);
    }
});

document.getElementById('deactivateUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
        const response = await fetch('/api/users/deactivate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User deactivated successfully');
            closeDeactivateUserModal();
        } else {
            const error = await response.json();
            alert('Error deactivating user: ' + error.message);
        }
    } catch (error) {
        alert('Error deactivating user: ' + error.message);
    }
});

// Coordinator Registration Management
async function loadPendingCoordinators() {
    try {
        const response = await fetch('/api/coordinators/pending');
        if (response.ok) {
            const coordinators = await response.json();
            const tableBody = document.getElementById('coordinatorRequestsTable');
            tableBody.innerHTML = '';
            
            coordinators.forEach(coordinator => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${coordinator.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${coordinator.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${coordinator.department}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button onclick="approveCoordinator('${coordinator.id}')" class="text-green-600 hover:text-green-900 mr-3">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="rejectCoordinator('${coordinator.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading pending coordinators:', error);
    }
}

async function approveCoordinator(id) {
    try {
        const response = await fetch(`/api/coordinators/${id}/approve`, {
            method: 'POST',
        });

        if (response.ok) {
            alert('Coordinator approved successfully');
            loadPendingCoordinators();
        } else {
            const error = await response.json();
            alert('Error approving coordinator: ' + error.message);
        }
    } catch (error) {
        alert('Error approving coordinator: ' + error.message);
    }
}

async function rejectCoordinator(id) {
    try {
        const response = await fetch(`/api/coordinators/${id}/reject`, {
            method: 'POST',
        });

        if (response.ok) {
            alert('Coordinator rejected successfully');
            loadPendingCoordinators();
        } else {
            const error = await response.json();
            alert('Error rejecting coordinator: ' + error.message);
        }
    } catch (error) {
        alert('Error rejecting coordinator: ' + error.message);
    }
}

// Helper function to format role
function formatRole(role) {
    // Split by underscore and capitalize each word
    return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Load user list
async function loadUserList() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            const tableBody = document.getElementById('userListTable');
            tableBody.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${user.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatRole(user.role)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.department}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${user.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="openUpdateUserModalWithData('${user.email}')" class="text-green-600 hover:text-green-900 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.active ? `
                            <button onclick="openDeactivateUserModalWithData('${user.email}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-user-slash"></i>
                            </button>
                        ` : ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Function to pre-fill update modal with user data
async function openUpdateUserModalWithData(email) {
    try {
        const response = await fetch(`/api/users/${email}`);
        if (response.ok) {
            const user = await response.json();
            const form = document.getElementById('updateUserForm');
            form.searchEmail.value = user.email;
            form.name.value = user.name;
            form.department.value = user.department;
            form.role.value = user.role;
            openUpdateUserModal();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// Function to pre-fill deactivate modal
function openDeactivateUserModalWithData(email) {
    const form = document.getElementById('deactivateUserForm');
    form.email.value = email;
    openDeactivateUserModal();
}

// Refresh user list after actions
function refreshUserList() {
    loadUserList();
    loadPendingCoordinators();
}

// Update form submission to refresh list
document.getElementById('createUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User created successfully');
            closeCreateUserModal();
            refreshUserList();
        } else {
            const error = await response.json();
            alert('Error creating user: ' + error.message);
        }
    } catch (error) {
        alert('Error creating user: ' + error.message);
    }
});

document.getElementById('updateUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const email = formData.get('searchEmail');
    
    try {
        const response = await fetch('/api/users/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User updated successfully');
            closeUpdateUserModal();
            refreshUserList();
        } else {
            const error = await response.json();
            alert('Error updating user: ' + error.message);
        }
    } catch (error) {
        alert('Error updating user: ' + error.message);
    }
});

document.getElementById('deactivateUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
        const response = await fetch('/api/users/deactivate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (response.ok) {
            alert('User deactivated successfully');
            closeDeactivateUserModal();
            refreshUserList();
        } else {
            const error = await response.json();
            alert('Error deactivating user: ' + error.message);
        }
    } catch (error) {
        alert('Error deactivating user: ' + error.message);
    }
});
