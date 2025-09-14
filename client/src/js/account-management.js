// Modal Management Functions
function openCreateUserModal() {
    document.getElementById('createUserModal').classList.remove('hidden');
}

function closeCreateUserModal() {
    document.getElementById('createUserModal').classList.add('hidden');
    document.getElementById('createUserForm').reset();
}

function openUpdateUserModal() {
    document.getElementById('updateUserModal').classList.remove('hidden');
}

function closeUpdateUserModal() {
    document.getElementById('updateUserModal').classList.add('hidden');
    document.getElementById('updateUserForm').reset();
}

function openDeactivateUserModal() {
    document.getElementById('deactivateUserModal').classList.remove('hidden');
}

function closeDeactivateUserModal() {
    document.getElementById('deactivateUserModal').classList.add('hidden');
    document.getElementById('deactivateUserForm').reset();
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
