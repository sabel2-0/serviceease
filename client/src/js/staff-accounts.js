document.addEventListener('DOMContentLoaded', function() {
    let allStaff = [];
    let filteredStaff = [];

    // DOM Elements
    const loadingState = document.getElementById('loadingState');
    const staffTableBody = document.getElementById('staffTableBody');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const addStaffModal = document.getElementById('addStaffModal');
    const addStaffForm = document.getElementById('addStaffForm');

    // Load staff data on page load
    loadStaffMembers();

    // Event Listeners
    searchInput.addEventListener('input', filterStaff);
    roleFilter.addEventListener('change', filterStaff);
    statusFilter.addEventListener('change', filterStaff);
    addStaffForm.addEventListener('submit', handleAddStaff);

    // Load staff members from API
    async function loadStaffMembers() {
        try {
            showLoading(true);
            
            // Load staff members
            const response = await fetch('/api/staff');
            if (!response.ok) {
                throw new Error('Failed to fetch staff members');
            }
            
            allStaff = await response.json();
            
            // Load technician assignments
            const assignmentsResponse = await fetch('/api/technician-assignments');
            const assignments = await assignmentsResponse.json();
            
            // Load institutions
            const institutionsResponse = await fetch('/api/institutions');
            const institutions = await institutionsResponse.json();
            
            // Create assignment map for quick lookup
            const assignmentMap = {};
            assignments.forEach(assignment => {
                if (!assignmentMap[assignment.technician_id]) {
                    assignmentMap[assignment.technician_id] = [];
                }
                // Find the institution details
                const institution = institutions.find(inst => inst.institution_id === assignment.institution_id);
                if (institution) {
                    assignmentMap[assignment.technician_id].push({
                        id: assignment.id,
                        institution_id: assignment.institution_id,
                        institution_name: assignment.institution_name,
                        institution_type: assignment.institution_type
                    });
                }
            });
            
            // Add assignment info to staff data
            allStaff.forEach(staff => {
                staff.assignments = assignmentMap[staff.id] || [];
            });
            
            filteredStaff = [...allStaff];
            displayStaff(filteredStaff);
        } catch (error) {
            console.error('Error loading staff members:', error);
            showError('Failed to load staff members. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // Display staff in the table
    function displayStaff(staff) {
        staffTableBody.innerHTML = '';
        
        if (staff.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users text-3xl mb-2"></i>
                            <p class="text-lg font-medium">No staff members found</p>
                            <p class="text-sm">Add your first staff member to get started.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        staff.forEach(staffMember => {
            const row = createStaffRow(staffMember);
            staffTableBody.appendChild(row);
        });
    }

    // Create individual staff row
    function createStaffRow(staff) {
        const row = document.createElement('tr');
        const isActive = staff.status === 'active';
        const roleDisplay = formatRole(staff.role);
        const formattedDate = formatDate(staff.updated_at);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                        <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <i class="fas fa-user text-gray-500"></i>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${staff.first_name} ${staff.last_name}</div>
                        <div class="text-sm text-gray-500">${staff.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${roleDisplay}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${staff.role === 'technician' ? createAssignmentsColumn(staff) : 
                    '<span class="text-sm text-gray-500">Not applicable</span>'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }">
                    ${isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                    ${staff.role === 'technician' ? `
                        <button onclick="manageAssignments(${staff.id})" class="text-purple-600 hover:text-purple-900" title="Manage Client Assignments">
                            <i class="fas fa-tasks"></i>
                        </button>
                    ` : ''}
                    <button onclick="editStaff(${staff.id})" class="text-blue-600 hover:text-blue-900" title="Edit Staff">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleStaffStatus(${staff.id}, '${staff.status}')" 
                            class="${isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}" 
                            title="${isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas fa-${isActive ? 'ban' : 'check'}"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    // Filter staff based on search and filters
    function filterStaff() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const roleFilterValue = roleFilter.value;
        const statusFilterValue = statusFilter.value;

        filteredStaff = allStaff.filter(staff => {
            // Search filter
            const matchesSearch = !searchTerm || 
                staff.first_name.toLowerCase().includes(searchTerm) ||
                staff.last_name.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm);

            // Role filter
            const matchesRole = !roleFilterValue || staff.role === roleFilterValue;

            // Status filter
            const matchesStatus = !statusFilterValue || staff.status === statusFilterValue;

            return matchesSearch && matchesRole && matchesStatus;
        });

        displayStaff(filteredStaff);
    }

    // Handle add staff form submission
    async function handleAddStaff(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitStaffBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnLoader = document.getElementById('submitBtnLoader');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtnText.textContent = 'Adding...';
            submitBtnLoader.classList.remove('hidden');
            
            const formData = new FormData(addStaffForm);
            const staffData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role')
            };

            const response = await fetch('/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(staffData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add staff member');
            }

            // Show success message
            showSuccessMessage('Staff member added successfully!');
            
            // Close modal and reset form
            closeAddStaffModal();
            addStaffForm.reset();
            
            // Reload staff list
            loadStaffMembers();

        } catch (error) {
            console.error('Error adding staff member:', error);
            showError(error.message || 'Failed to add staff member. Please try again.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Add Staff';
            submitBtnLoader.classList.add('hidden');
        }
    }

    // Utility functions
    function formatRole(role) {
        const roleMap = {
            'operations_officer': 'Operations Officer',
            'technician': 'Technician'
        };
        return roleMap[role] || role;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours} hours ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    function createAssignmentsColumn(staff) {
        if (!staff.assignments || staff.assignments.length === 0) {
            return `
                <div class="flex items-center">
                    <span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        No assignments
                    </span>
                </div>
            `;
        }

        const displayLimit = 2;
        const displayed = staff.assignments.slice(0, displayLimit);
        const remaining = staff.assignments.length - displayLimit;

        return `
            <div class="space-y-1">
                ${displayed.map(assignment => `
                    <div class="flex items-center text-xs">
                        <div class="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                            <i class="fas fa-building text-blue-600" style="font-size: 8px;"></i>
                        </div>
                        <span class="text-gray-900 font-medium" title="${assignment.institution_name}">
                            ${assignment.institution_name.length > 20 ? 
                                assignment.institution_name.substring(0, 20) + '...' : 
                                assignment.institution_name}
                        </span>
                    </div>
                `).join('')}
                ${remaining > 0 ? `
                    <div class="text-xs text-gray-500 font-medium">
                        +${remaining} more
                    </div>
                ` : ''}
            </div>
        `;
    }

    function showLoading(show) {
        if (show) {
            loadingState.classList.remove('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }

    function showError(message) {
        const errorModal = document.createElement('div');
        errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        errorModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i class="fas fa-exclamation-triangle text-xl text-red-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p class="text-sm text-gray-500 mb-6">${message}</p>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorModal);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorModal.parentNode) {
                errorModal.remove();
            }
        }, 5000);
    }

    function showSuccessMessage(message) {
        const successModal = document.createElement('div');
        successModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        successModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <i class="fas fa-check text-xl text-green-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Success</h3>
                    <p class="text-sm text-gray-500 mb-6">${message}</p>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(successModal);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successModal.parentNode) {
                successModal.remove();
            }
        }, 3000);
    }

    // Global functions for modal and actions
    window.openAddStaffModal = function() {
        addStaffModal.classList.remove('hidden');
        // Focus on first input
        setTimeout(() => {
            const firstInput = addStaffForm.querySelector('input[name="firstName"]');
            if (firstInput) firstInput.focus();
        }, 100);
    };

    window.closeAddStaffModal = function() {
        addStaffModal.classList.add('hidden');
        addStaffForm.reset();
        
        // Reset button state
        const submitBtn = document.getElementById('submitStaffBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnLoader = document.getElementById('submitBtnLoader');
        
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Add Staff';
        submitBtnLoader.classList.add('hidden');
    };

    window.editStaff = function(staffId) {
        // TODO: Implement edit functionality
        console.log('Edit staff with ID:', staffId);
        showError('Edit functionality will be implemented soon.');
    };

    window.toggleStaffStatus = async function(staffId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'deactivate';
        
        if (!confirm(`Are you sure you want to ${action} this staff member?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/staff/${staffId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${action} staff member`);
            }

            showSuccessMessage(`Staff member ${action}d successfully!`);
            loadStaffMembers(); // Reload the list

        } catch (error) {
            console.error(`Error ${action}ing staff member:`, error);
            showError(error.message || `Failed to ${action} staff member. Please try again.`);
        }
    };

    // Assignment Management Functions
    let currentTechnicianId = null;
    let availableInstitutions = [];

    window.manageAssignments = async function(technicianId) {
        currentTechnicianId = technicianId;
        
        try {
            // Find the technician data
            const technician = allStaff.find(staff => staff.id === technicianId);
            if (!technician) {
                throw new Error('Technician not found');
            }

            // Update modal content
            document.getElementById('selectedTechnicianName').textContent = 
                `${technician.first_name} ${technician.last_name}`;
            document.getElementById('selectedTechnicianEmail').textContent = technician.email;

            // Load current assignments
            await loadCurrentAssignments(technicianId);
            
            // Load available institutions for assignment
            await loadAvailableInstitutions(technicianId);

            // Show modal
            document.getElementById('assignmentsModal').classList.remove('hidden');

        } catch (error) {
            console.error('Error opening assignments modal:', error);
            showError('Failed to load assignment data. Please try again.');
        }
    };

    async function loadCurrentAssignments(technicianId) {
        const technician = allStaff.find(staff => staff.id === technicianId);
        const assignments = technician.assignments || [];
        const container = document.getElementById('currentAssignmentsList');

        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-3xl mb-2"></i>
                    <p>No client assignments yet</p>
                    <p class="text-sm">Click "Add Assignment" to assign clients to this technician</p>
                </div>
            `;
            return;
        }

        container.innerHTML = assignments.map(assignment => `
            <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-building text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${assignment.institution_name}</div>
                        <div class="text-sm text-gray-500">ID: ${assignment.institution_id}</div>
                        <div class="text-xs text-gray-400">${formatInstitutionType(assignment.institution_type)}</div>
                    </div>
                </div>
                <button onclick="removeAssignment(${assignment.id})" 
                        class="text-red-600 hover:text-red-800 p-2 rounded" 
                        title="Remove Assignment">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    async function loadAvailableInstitutions(technicianId) {
        try {
            // Load all institutions
            const response = await fetch('/api/institutions');
            const institutions = await response.json();
            
            // Load current assignments to filter out already assigned ones
            const assignmentsResponse = await fetch('/api/technician-assignments');
            const assignments = await assignmentsResponse.json();
            
            // Filter out institutions already assigned to this or other technicians
            const assignedInstitutionIds = assignments.map(a => a.institution_id);
            availableInstitutions = institutions.filter(inst => 
                !assignedInstitutionIds.includes(inst.institution_id)
            );

            // Update dropdown
            const select = document.getElementById('availableClients');
            if (availableInstitutions.length === 0) {
                select.innerHTML = '<option value="">All clients are already assigned</option>';
            } else {
                select.innerHTML = '<option value="">Select a client to assign...</option>' +
                    availableInstitutions.map(inst => 
                        `<option value="${inst.institution_id}">${inst.name} (${inst.institution_id})</option>`
                    ).join('');
            }

        } catch (error) {
            console.error('Error loading available institutions:', error);
            document.getElementById('availableClients').innerHTML = 
                '<option value="">Error loading clients</option>';
        }
    }

    function formatInstitutionType(type) {
        const typeMap = {
            'public_school': 'Public School',
            'private_school': 'Private School',
            'private_company': 'Private Company',
            'lgu': 'Local Government Unit'
        };
        return typeMap[type] || type;
    }

    window.showAddAssignmentForm = function() {
        document.getElementById('addAssignmentForm').classList.remove('hidden');
    };

    window.hideAddAssignmentForm = function() {
        document.getElementById('addAssignmentForm').classList.add('hidden');
        document.getElementById('availableClients').value = '';
    };

    window.confirmAddAssignment = async function() {
        const selectedInstitutionId = document.getElementById('availableClients').value;
        
        if (!selectedInstitutionId) {
            alert('Please select a client to assign');
            return;
        }

        try {
            const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            if (!currentUser || currentUser.role !== 'admin') {
                throw new Error('Only admins can assign clients. Please log in as an admin.');
            }

            const response = await fetch('/api/technician-assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    technician_id: currentTechnicianId,
                    institution_id: selectedInstitutionId,
                    assigned_by: currentUser.id
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to assign client');
            }

            showSuccessMessage('Client assigned successfully!');
            hideAddAssignmentForm();
            
            // Reload data
            await loadStaffMembers();
            await loadCurrentAssignments(currentTechnicianId);
            await loadAvailableInstitutions(currentTechnicianId);

        } catch (error) {
            console.error('Error assigning client:', error);
            showError(error.message || 'Failed to assign client. Please try again.');
        }
    };

    window.removeAssignment = async function(assignmentId) {
        if (!confirm('Are you sure you want to remove this client assignment? Future service requests from this client will not be auto-assigned to this technician.')) {
            return;
        }

        try {
            const response = await fetch(`/api/technician-assignments/${assignmentId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove assignment');
            }

            showSuccessMessage('Assignment removed successfully!');
            
            // Reload data
            await loadStaffMembers();
            await loadCurrentAssignments(currentTechnicianId);
            await loadAvailableInstitutions(currentTechnicianId);

        } catch (error) {
            console.error('Error removing assignment:', error);
            showError(error.message || 'Failed to remove assignment. Please try again.');
        }
    };

    window.closeAssignmentsModal = function() {
        document.getElementById('assignmentsModal').classList.add('hidden');
        hideAddAssignmentForm();
        currentTechnicianId = null;
    };

    // Close modal when clicking outside
    addStaffModal.addEventListener('click', function(e) {
        if (e.target === addStaffModal) {
            closeAddStaffModal();
        }
    });

    // Close assignments modal when clicking outside
    document.getElementById('assignmentsModal').addEventListener('click', function(e) {
        if (e.target === document.getElementById('assignmentsModal')) {
            closeAssignmentsModal();
        }
    });
});
