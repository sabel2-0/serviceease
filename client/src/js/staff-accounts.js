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
    // Password toggle and modal alert clearing
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const addStaffAlert = document.getElementById('addStaffAlert');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const pwd = document.getElementById('addStaffPassword');
            if (!pwd) return;
            if (pwd.type === 'password') {
                pwd.type = 'text';
                togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                togglePasswordBtn.setAttribute('aria-label', 'Hide password');
            } else {
                pwd.type = 'password';
                togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
                togglePasswordBtn.setAttribute('aria-label', 'Show password');
            }
            pwd.focus();
        });
    }

    // Password strength UI for Add Staff form
    const addStaffPassword = document.getElementById('addStaffPassword');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    const passwordStrengthLabel = document.getElementById('passwordStrengthLabel');
    const passwordHelp = document.getElementById('passwordHelp');

    function evaluatePassword(pwd) {
        const score = (() => {
            let points = 0;
            if (!pwd) return 0;
            if (pwd.length >= 8) points += 1;
            if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) points += 1; // mixed case
            if (/[0-9]/.test(pwd)) points += 1;
            if (/[^A-Za-z0-9]/.test(pwd)) points += 1; // symbol
            if (pwd.length >= 12) points += 1; // extra length
            return points;
        })();

        // Determine label and percent
        let label = 'Very weak';
        let percent = 10;
        let meets = false;
        if (score <= 1) { label = 'Very weak'; percent = 10; }
        else if (score === 2) { label = 'Weak'; percent = 35; }
        else if (score === 3) { label = 'Fair'; percent = 60; }
        else if (score === 4) { label = 'Strong'; percent = 85; meets = true; }
        else if (score >= 5) { label = 'Very strong'; percent = 100; meets = true; }

        // For this app require at least: length >=8, letters, numbers and symbols
        const meetsCriteria = pwd && pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd);

        return { score, label, percent, meetsCriteria, meets };
    }

    function updatePasswordStrengthUI() {
        if (!addStaffPassword) return;
        const pwd = addStaffPassword.value || '';
        const res = evaluatePassword(pwd);
        if (passwordStrengthBar) {
            passwordStrengthBar.style.width = res.percent + '%';
            // color based on percent
            if (res.percent < 40) passwordStrengthBar.className = 'h-full w-0 bg-red-500 transition-all';
            else if (res.percent < 70) passwordStrengthBar.className = 'h-full w-0 bg-amber-400 transition-all';
            else passwordStrengthBar.className = 'h-full w-0 bg-green-500 transition-all';
            // force width update after class change
            setTimeout(() => passwordStrengthBar.style.width = res.percent + '%', 10);
        }
        if (passwordStrengthLabel) passwordStrengthLabel.textContent = res.label;
        if (passwordHelp) {
            // keep the short guidance visible
            passwordHelp.textContent = 'Use 8+ characters with letters, numbers & symbols.';
        }
    }

    if (addStaffPassword) {
        addStaffPassword.addEventListener('input', updatePasswordStrengthUI);
        // initialize on load
        updatePasswordStrengthUI();
    }

    // Load staff members from API
    async function loadStaffMembers() {
        try {
            showLoading(true);
            
            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }
            
            // Load staff members
            const response = await fetch('/api/staff', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch staff members');
            }
            
            allStaff = await response.json();
            
            // Load technician assignments
            const assignmentsResponse = await fetch('/api/technician-assignments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const assignments = await assignmentsResponse.json();
            
            // Load institutions
            const institutionsResponse = await fetch('/api/institutions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
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
        row.className = 'row-hover';

        const isActive = staff.status === 'active';
        const roleDisplay = formatRole(staff.role);

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="text-sm text-gray-600"><span class="font-semibold mr-1">Name:</span> <span class="font-medium text-gray-900">${staff.first_name} ${staff.last_name}</span></div>
                <div class="text-sm text-gray-600"><span class="font-semibold mr-1">Email:</span> <span class="text-gray-500">${staff.email}</span></div>
            </td>
            <td class="px-6 py-4">${roleDisplay}</td>
            <td class="px-6 py-4 assignments-column" style="min-width: max-content; width: auto; white-space: nowrap;">
                ${staff.role === 'technician' ? createAssignmentsColumn(staff) : '<span class="text-sm text-gray-500">Not applicable</span>'}
            </td>
            <td class="px-6 py-4">
                <span class="status-pill ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                    ${staff.role === 'technician' ? `
                        <button onclick="manageAssignments(${staff.id})" class="action-btn" title="Manage Client Assignments">
                            <i class="fas fa-tasks"></i>
                        </button>
                    ` : ''}
                        <button onclick="viewStaff(${staff.id})" class="action-btn action-view" title="View Staff">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editStaff(${staff.id})" class="action-btn action-edit" title="Edit Staff">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="changeStaffPassword(${staff.id})" class="action-btn action-password" title="Change Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="toggleStaffStatus(${staff.id}, '${staff.status}')" class="action-btn action-toggle ${isActive ? 'deactivate' : 'activate'}" title="${isActive ? 'Deactivate' : 'Activate'}">
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

        // Detect if the 'Deactivated' tab is selected
        const activeTab = document.querySelector('.tab-btn.tab-active');
        const isDeactivatedTab = activeTab && activeTab.getAttribute('data-role') === 'deactivated';

        filteredStaff = allStaff.filter(staff => {
            // Search filter
            const matchesSearch = !searchTerm || 
                staff.first_name.toLowerCase().includes(searchTerm) ||
                staff.last_name.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm);

            // Role filter (skip for deactivated tab)
            const matchesRole = !roleFilterValue || staff.role === roleFilterValue;

            // Status filter
            let matchesStatus = !statusFilterValue || staff.status === statusFilterValue;

            if (isDeactivatedTab) {
                // Only show inactive staff for deactivated tab
                return matchesSearch && staff.status === 'inactive';
            } else {
                // For all other tabs, hide inactive staff
                return matchesSearch && matchesRole && staff.status === 'active' && matchesStatus;
            }
        });

        displayStaff(filteredStaff);
    }

    // Handle add staff form submission
    async function handleAddStaff(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitStaffBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnLoader = document.getElementById('submitBtnLoader');
        const alertEl = document.getElementById('addStaffAlert');
        // clear previous alert
        if (alertEl) { alertEl.className = 'hidden'; alertEl.textContent = ''; }
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtnText.textContent = 'Adding...';
            if (submitBtnLoader) submitBtnLoader.classList.remove('hidden');
            
            const formData = new FormData(addStaffForm);
            const staffData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role')
            };

            // Client-side password strength validation: require 8+ chars, letters, numbers and symbols
            const pwdCheck = (function(p) {
                if (!p) return { meets: false };
                const meetsCriteria = p.length >= 8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
                return { meets: meetsCriteria };
            })(staffData.password);

            if (!pwdCheck.meets) {
                if (alertEl) {
                    alertEl.className = 'bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4';
                    alertEl.textContent = 'Password must be at least 8 characters and include letters, numbers, and symbols.';
                } else {
                    showError('Password must be at least 8 characters and include letters, numbers, and symbols.');
                }
                submitBtn.disabled = false;
                submitBtn.setAttribute('aria-busy', 'false');
                if (submitBtnLoader) submitBtnLoader.classList.add('hidden');
                submitBtnText.textContent = 'Add Staff';
                return;
            }

            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            const response = await fetch('/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(staffData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add staff member');
            }

            // Show inline success inside modal briefly
            if (alertEl) {
                alertEl.className = 'bg-green-50 border border-green-200 text-green-800 rounded-md p-3 mb-4';
                alertEl.textContent = 'Staff member added successfully!';
            } else {
                showSuccessMessage('Staff member added successfully!');
            }

            // Close modal after a short delay so the user sees feedback
            setTimeout(() => {
                closeAddStaffModal();
                addStaffForm.reset();
            }, 650);

            // Reload staff list
            loadStaffMembers();

        } catch (error) {
            console.error('Error adding staff member:', error);
            // Show inline error if modal alert exists
            if (alertEl) {
                alertEl.className = 'bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4';
                alertEl.textContent = error.message || 'Failed to add staff member. Please try again.';
            } else {
                showError(error.message || 'Failed to add staff member. Please try again.');
            }
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Add Staff';
            submitBtn.setAttribute('aria-busy', 'false');
            if (submitBtnLoader) submitBtnLoader.classList.add('hidden');
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
                <div class="h-16 flex items-center"> <!-- Fixed height: 64px -->
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user-plus text-slate-400 text-sm"></i>
                        </div>
                        <span class="text-sm text-slate-500 font-medium">Available for assignment</span>
                    </div>
                </div>
            `;
        }

        // Group assignments by institution to show team information
        const institutionGroups = {};
        staff.assignments.forEach(assignment => {
            if (!institutionGroups[assignment.institution_id]) {
                institutionGroups[assignment.institution_id] = {
                    institution: assignment,
                    technicianCount: 0
                };
            }
            institutionGroups[assignment.institution_id].technicianCount++;
        });

        const assignmentCount = Object.keys(institutionGroups).length;
        const totalTeamSize = Object.values(institutionGroups).reduce((sum, group) => sum + group.technicianCount, 0);

        // Smart display logic with CONSISTENT UI for all assignment counts
        if (assignmentCount === 1) {
            // Single assignment - show same chip format as multiple for consistency
            const group = Object.values(institutionGroups)[0];
            const institution = group.institution;
            
            return `
                <div class="h-16 overflow-visible"> <!-- Fixed height container with visible overflow -->
                    <div class="flex flex-wrap gap-1 pt-1">
                        <div class="flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-green-100 transition-colors whitespace-nowrap"
                             onclick="goToInstitution('${institution.institution_id}')"
                             title="Click to view ${institution.institution_name} details"
                             style="width: fit-content; min-width: max-content;">
                            <div class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white mr-1.5 flex-shrink-0">
                                <i class="fas fa-building text-xs"></i>
                            </div>
                            <span class="font-medium text-green-900">
                                ${institution.institution_name}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        } else if (assignmentCount <= 3) {
            // Multiple assignments - show horizontal chips (FIXED HEIGHT)
            const topInstitutions = Object.values(institutionGroups).slice(0, 3);
            
            return `
                <div class="h-16 overflow-visible"> <!-- Fixed height container with visible overflow -->
                    <div class="flex flex-wrap gap-1 pt-1">
                        ${topInstitutions.map((group, index) => {
                            const institution = group.institution;
                            
                            return `
                                <div class="flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-green-100 transition-colors whitespace-nowrap"
                                     onclick="goToInstitution('${institution.institution_id}')"
                                     title="Click to view ${institution.institution_name} details"
                                     style="width: fit-content; min-width: max-content;">
                                    <div class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white mr-1.5 flex-shrink-0">
                                        <i class="fas fa-building text-xs"></i>
                                    </div>
                                    <span class="font-medium text-green-900">
                                        ${institution.institution_name}
                                    </span>
                                </div>
                            `;
                        }).join('')}
                        ${assignmentCount > 3 ? `
                            <button onclick="manageAssignments(${staff.id})" 
                                    class="flex items-center bg-gray-100 border border-gray-300 rounded-full px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 transition-colors">
                                <i class="fas fa-plus mr-1"></i>
                                +${assignmentCount - 3}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            // Many assignments - show compact summary (FIXED HEIGHT)
            const workloadLevel = getWorkloadLevel(assignmentCount);
            const topInstitutions = Object.values(institutionGroups)
                .sort((a, b) => b.technicianCount - a.technicianCount)
                .slice(0, 2);
                
            return `
                <div class="h-16 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                     onclick="showQuickAnalytics(${staff.id})"
                     title="Click to view detailed analytics">
                    
                    <div class="flex items-center justify-between h-full px-3">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="relative">
                                <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                                    <i class="fas fa-layer-group text-xs"></i>
                                </div>
                                <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                                    ${assignmentCount}
                                </span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-bold text-green-900">${assignmentCount} Institutions</div>
                                <div class="flex items-center space-x-1">
                                    <span class="px-1.5 py-0.5 bg-${workloadLevel.color}-100 text-${workloadLevel.color}-800 text-xs rounded-full font-medium">
                                        ${workloadLevel.level}
                                    </span>
                                    <span class="text-xs text-green-600">Team: ${totalTeamSize}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-1">
                            <button onclick="event.stopPropagation(); manageAssignments(${staff.id})" 
                                    class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                    title="Manage assignments">
                                <i class="fas fa-cog"></i>
                            </button>
                            <i class="fas fa-chart-bar text-green-500 text-xs"></i>
                        </div>
                    </div>
                </div>
            `;
        }
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
        // prevent background scroll while modal is open
        document.body.style.overflow = 'hidden';
        // Focus on first input
        setTimeout(() => {
            const firstInput = addStaffForm.querySelector('input[name="firstName"]');
            if (firstInput) firstInput.focus();
        }, 100);
    };

    window.closeAddStaffModal = function() {
        addStaffModal.classList.add('hidden');
        addStaffForm.reset();
        // restore body scroll
        document.body.style.overflow = '';
        
        // Reset button state
        const submitBtn = document.getElementById('submitStaffBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnLoader = document.getElementById('submitBtnLoader');
        
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Add Staff';
        submitBtnLoader.classList.add('hidden');

        // Clear any inline alerts
        const alertEl = document.getElementById('addStaffAlert');
        if (alertEl) { alertEl.className = 'hidden'; alertEl.textContent = ''; }
    };


    // Edit Staff Modal logic
    const editStaffModal = document.getElementById('editStaffModal');
    const editStaffForm = document.getElementById('editStaffForm');
    const editStaffAlert = document.getElementById('editStaffAlert');

    window.editStaff = function(staffId) {
        const staff = allStaff.find(s => s.id === staffId);
        if (!staff) return showError('Staff member not found');

        // Fill modal fields
        document.getElementById('editStaffId').value = staff.id;
        document.getElementById('editStaffFirstName').value = staff.first_name || '';
        document.getElementById('editStaffLastName').value = staff.last_name || '';
        document.getElementById('editStaffEmail').value = staff.email || '';
        document.getElementById('editStaffRole').value = staff.role || '';

        // Clear alert
        if (editStaffAlert) { editStaffAlert.className = 'hidden'; editStaffAlert.textContent = ''; }

        // Show modal
        if (editStaffModal) editStaffModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.closeEditStaffModal = function() {
        if (editStaffModal) editStaffModal.classList.add('hidden');
        document.body.style.overflow = '';
        if (editStaffForm) editStaffForm.reset();
        if (editStaffAlert) { editStaffAlert.className = 'hidden'; editStaffAlert.textContent = ''; }
    };

    if (editStaffForm) {
        editStaffForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('editStaffId').value;
            const firstName = document.getElementById('editStaffFirstName').value;
            const lastName = document.getElementById('editStaffLastName').value;
            const email = document.getElementById('editStaffEmail').value;
            const role = document.getElementById('editStaffRole').value;
            // Status is controlled via action buttons; preserve existing staff.status
            const existing = allStaff.find(s => s.id == id);
            const status = existing && existing.status ? existing.status : 'active';

            // Basic email validation
            const emailValid = email && /^\S+@\S+\.\S+$/.test(email);
            if (!emailValid) {
                if (editStaffAlert) {
                    editStaffAlert.className = 'rounded-md p-3 mb-4 text-sm bg-red-100 text-red-800';
                    editStaffAlert.textContent = 'Please enter a valid email address.';
                }
                return;
            }

            // Preserve existing department value from loaded staff record (field removed from UI)
            // (existing already retrieved above)
            const data = { first_name: firstName, last_name: lastName, email, role, status };
            if (existing && typeof existing.department !== 'undefined') data.department = existing.department;
            
            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }
            
            try {
                const res = await fetch(`/api/staff/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    if (editStaffAlert) {
                        editStaffAlert.className = 'rounded-md p-3 mb-4 text-sm bg-green-100 text-green-800';
                        editStaffAlert.textContent = 'Staff updated successfully!';
                    }
                    setTimeout(() => {
                        window.closeEditStaffModal();
                        loadStaffMembers();
                    }, 900);
                } else {
                    const err = await res.json();
                    if (editStaffAlert) {
                        editStaffAlert.className = 'rounded-md p-3 mb-4 text-sm bg-red-100 text-red-800';
                        editStaffAlert.textContent = err.message || 'Failed to update staff.';
                    }
                }
            } catch (err) {
                if (editStaffAlert) {
                    editStaffAlert.className = 'rounded-md p-3 mb-4 text-sm bg-red-100 text-red-800';
                    editStaffAlert.textContent = err.message || 'Failed to update staff.';
                }
            }
        });
    }

    // View staff details
    window.viewStaff = function(staffId) {
        const staff = allStaff.find(s => s.id === staffId);
        if (!staff) return showError('Staff member not found');

        const nameEl = document.getElementById('viewStaffName');
        const emailEl = document.getElementById('viewStaffEmail');
        const roleEl = document.getElementById('viewStaffRole');
        const statusEl = document.getElementById('viewStaffStatus');
        const dateAddedEl = document.getElementById('viewStaffDateAdded');
        const assignmentsEl = document.getElementById('viewStaffAssignments');
        
        if (nameEl) {
            nameEl.textContent = `${staff.first_name} ${staff.last_name}`;
            nameEl.dataset.staffId = staffId; // Store staff ID for potential future use
        }
        if (emailEl) emailEl.textContent = staff.email;
        if (roleEl) roleEl.textContent = formatRole(staff.role);
        if (statusEl) {
            statusEl.innerHTML = `<span class="status-pill ${staff.status === 'active' ? 'status-active' : 'status-inactive'}">${staff.status === 'active' ? 'Active' : 'Inactive'}</span>`;
        }
        if (dateAddedEl) {
            // Format the created_at date
            if (staff.created_at) {
                const dateAdded = new Date(staff.created_at);
                const formattedDate = dateAdded.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedTime = dateAdded.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                dateAddedEl.innerHTML = `
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-900">${formattedDate}</div>
                        <div class="text-xs text-gray-500">${formattedTime}</div>
                    </div>
                `;
            } else {
                dateAddedEl.innerHTML = '<span class="text-sm text-gray-500 italic">Date not available</span>';
            }
        }
        if (assignmentsEl) {
            if (staff.role === 'technician' && staff.assignments && staff.assignments.length > 0) {
                // Display assignments with full names
                assignmentsEl.innerHTML = `
                    <div class="space-y-2">
                        ${staff.assignments.map(a => `
                            <div class="flex items-center space-x-2 text-sm text-gray-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                                 onclick="goToInstitution('${a.institution_id}')"
                                 title="Click to view ${a.institution_name} details">
                                <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <i class="fas fa-building text-white text-xs"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-green-900">${a.institution_name}</div>
                                    <div class="text-xs text-green-600">${formatInstitutionType(a.institution_type)}</div>
                                </div>
                                <div class="text-green-600">
                                    <i class="fas fa-external-link-alt text-xs"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (staff.role === 'technician') {
                assignmentsEl.innerHTML = '<div class="text-center py-4 text-gray-500 italic">No institutions assigned</div>';
            } else {
                assignmentsEl.innerHTML = '<div class="text-center py-4 text-gray-500 italic">Role does not require institution assignments</div>';
            }
        }

        document.getElementById('viewStaffModal').classList.remove('hidden');
    };

    window.closeViewStaffModal = function() {
        const modal = document.getElementById('viewStaffModal');
        if (modal) modal.classList.add('hidden');
    };

    window.toggleStaffStatus = async function(staffId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'deactivate';

        if (!confirm(`Are you sure you want to ${action} this staff member?`)) {
            return;
        }

        // Get the staff object to send all required fields for update
        const staff = allStaff.find(s => s.id === staffId);
        if (!staff) {
            showError('Staff member not found.');
            return;
        }

        // Prepare the update payload (reuse current values, just change status)
        const data = {
            first_name: staff.first_name,
            last_name: staff.last_name,
            department: staff.department,
            role: staff.role,
            status: newStatus
        };

        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
        }

        try {
            const response = await fetch(`/api/staff/${staffId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
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
                        <div class="font-medium text-gray-900" title="${assignment.institution_name}">
                            ${assignment.institution_name}
                        </div>
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
            
            // Load current assignments to show team information
            const assignmentsResponse = await fetch('/api/technician-assignments');
            const assignments = await assignmentsResponse.json();
            
            // Get current technician's assignments to filter out duplicates
            const currentTechnicianAssignments = assignments
                .filter(a => a.technician_id === technicianId)
                .map(a => a.institution_id);
            
            // Count technicians per institution for team size display
            const institutionTeamCount = {};
            assignments.forEach(assignment => {
                if (!institutionTeamCount[assignment.institution_id]) {
                    institutionTeamCount[assignment.institution_id] = 0;
                }
                institutionTeamCount[assignment.institution_id]++;
            });
            
            // Filter out institutions already assigned to this specific technician
            // But allow institutions that have other technicians (unlimited team size)
            availableInstitutions = institutions.filter(inst => 
                !currentTechnicianAssignments.includes(inst.institution_id)
            );

            // Update dropdown with team size information
            const select = document.getElementById('availableClients');
            if (availableInstitutions.length === 0) {
                select.innerHTML = '<option value="">This technician is already assigned to all available clients</option>';
            } else {
                select.innerHTML = '<option value="">Select a client to assign...</option>' +
                    availableInstitutions.map(inst => {
                        const currentTeamSize = institutionTeamCount[inst.institution_id] || 0;
                        const teamInfo = currentTeamSize > 0 ? ` (Join team of ${currentTeamSize})` : ' (First technician)';
                        return `<option value="${inst.institution_id}">${inst.name}${teamInfo}</option>`;
                    }).join('');
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

    // View institution team function - shows all technicians assigned to an institution
    window.viewInstitutionTeam = function(institutionId) {
        // Find all technicians assigned to this institution
        const institutionAssignments = allStaff.filter(staff => 
            staff.assignments && staff.assignments.some(assignment => 
                assignment.institution_id === institutionId
            )
        );
        
        if (institutionAssignments.length === 0) {
            showError('No technicians found for this institution.');
            return;
        }
        
        const institution = institutionAssignments[0].assignments.find(a => a.institution_id === institutionId);
        
        // Create team view modal
        const teamModal = document.createElement('div');
        teamModal.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50';
        teamModal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-4xl w-full mx-4 p-8 transform transition-all max-h-[90vh] overflow-y-auto shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center space-x-4">
                        <div class="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
                            <i class="fas fa-building text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-gray-900">${institution.institution_name}</h3>
                            <p class="text-gray-600">${formatInstitutionType(institution.institution_type)} • Team of ${institutionAssignments.length}</p>
                        </div>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${institutionAssignments.map((staff, index) => {
                        const colors = ['blue', 'green', 'purple', 'indigo', 'pink', 'yellow'];
                        const color = colors[index % colors.length];
                        
                        return `
                            <div class="team-member-card bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                                <div class="flex items-center space-x-4">
                                    <div class="w-12 h-12 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                        ${staff.first_name.charAt(0)}${staff.last_name.charAt(0)}
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="font-bold text-${color}-900">${staff.first_name} ${staff.last_name}</h4>
                                        <p class="text-sm text-${color}-700">${staff.email}</p>
                                        <div class="flex items-center mt-2">
                                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                            <span class="text-xs text-green-600 font-medium">${staff.status === 'active' ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-${color}-200">
                                    <div class="text-xs text-${color}-700">
                                        <div class="flex justify-between">
                                            <span>Total Assignments:</span>
                                            <span class="font-bold">${staff.assignments ? staff.assignments.length : 0}</span>
                                        </div>
                                        <div class="flex justify-between mt-1">
                                            <span>Role:</span>
                                            <span class="font-bold capitalize">${staff.role.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="mt-8 bg-gray-50 rounded-xl p-6">
                    <h4 class="text-lg font-bold text-gray-900 mb-4">Team Statistics</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-white rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-blue-600">${institutionAssignments.length}</div>
                            <div class="text-sm text-gray-600">Team Members</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-green-600">${institutionAssignments.filter(s => s.status === 'active').length}</div>
                            <div class="text-sm text-gray-600">Active Technicians</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-purple-600">${Math.round(institutionAssignments.reduce((sum, s) => sum + (s.assignments ? s.assignments.length : 0), 0) / institutionAssignments.length * 10) / 10}</div>
                            <div class="text-sm text-gray-600">Avg. Assignments</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(teamModal);
    };

    // Update capacity overview dashboard
    function updateCapacityOverview(institutionCapacity) {
        const container = document.getElementById('capacityOverview');
        
        // Calculate statistics
        const totalInstitutions = Object.keys(institutionCapacity).length;
        const atCapacity = Object.values(institutionCapacity).filter(count => count >= 5).length;
        const nearCapacity = Object.values(institutionCapacity).filter(count => count >= 4 && count < 5).length;
        const lowCapacity = Object.values(institutionCapacity).filter(count => count < 3).length;
        
        container.innerHTML = `
            <div class="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold text-purple-600">${totalInstitutions}</div>
                        <div class="text-sm text-purple-700">Total Institutions</div>
                    </div>
                    <i class="fas fa-building text-purple-400 text-2xl"></i>
                </div>
            </div>
            
            <div class="bg-white rounded-xl p-4 shadow-sm border border-red-200">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold text-red-600">${atCapacity}</div>
                        <div class="text-sm text-red-700">At Capacity</div>
                    </div>
                    <i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
                </div>
            </div>
            
            <div class="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold text-amber-600">${nearCapacity}</div>
                        <div class="text-sm text-amber-700">Near Capacity</div>
                    </div>
                    <i class="fas fa-clock text-amber-400 text-2xl"></i>
                </div>
            </div>
        `;
    }

    // Quick assign institution function
    window.quickAssignInstitution = async function(institutionId) {
        if (!currentTechnicianId) return;
        
        try {
            const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            if (!currentUser) {
                throw new Error('You must be logged in to assign technicians.');
            }

            // Include auth token when calling backend
            const token = typeof getAuthToken === 'function' ? getAuthToken() : localStorage.getItem('token');
            if (!token) throw new Error('Authentication token not found. Please log in again.');

            const response = await fetch('/api/technician-assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    technician_id: currentTechnicianId,
                    institution_id: institutionId,
                    assigned_by: currentUser.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to assign technician');
            }

            // Refresh data and UI
            await loadStaffMembers();
            await loadCurrentAssignments(currentTechnicianId);
            await loadAvailableInstitutions(currentTechnicianId);
            
            // Show success message
            showSuccessMessage('Institution assigned successfully!');

        } catch (error) {
            console.error('Error assigning institution:', error);
            showError(error.message || 'Failed to assign institution. Please try again.');
        }
    };

    // View institution team function
    window.viewInstitutionTeam = function(institutionId) {
        // This would open a detailed view of all technicians assigned to this institution
        console.log('View team for institution:', institutionId);
        // Implementation would show a modal with all team members
    };

    // Refresh assignment data
    window.refreshAssignmentData = async function() {
        if (currentTechnicianId) {
            await loadCurrentAssignments(currentTechnicianId);
            await loadAvailableInstitutions(currentTechnicianId);
        }
    };

    // Success message helper
    function showSuccessMessage(message) {
        const successModal = document.createElement('div');
        successModal.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
        successModal.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        setTimeout(() => {
            successModal.style.transform = 'translateX(100%)';
            setTimeout(() => successModal.remove(), 300);
        }, 3000);
    }    window.showAddAssignmentForm = function() {
        document.getElementById('addAssignmentForm').classList.remove('hidden');
    };

    window.hideAddAssignmentForm = function() {
        document.getElementById('addAssignmentForm').classList.add('hidden');
        document.getElementById('availableClients').value = '';
    };

    window.confirmAddAssignment = async function() {
        const selectedInstitutionId = document.getElementById('availableClients').value;
        
        console.log('[ASSIGN] confirmAddAssignment called, selected institution:', selectedInstitutionId);
        
        if (!selectedInstitutionId) {
            alert('Please select a client to assign');
            return;
        }

        try {
            const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            console.log('[ASSIGN] Current user:', currentUser);
            
            if (!currentUser || currentUser.role !== 'admin') {
                throw new Error('Only admins can assign clients. Please log in as an admin.');
            }

            // Include auth token when calling backend
            const token = typeof getAuthToken === 'function' ? getAuthToken() : localStorage.getItem('token');
            console.log('[ASSIGN] Token exists:', !!token);
            
            if (!token) throw new Error('Authentication token not found. Please log in again.');

            console.log('[ASSIGN] Sending POST request to /api/technician-assignments');
            console.log('[ASSIGN] Request body:', {
                technician_id: currentTechnicianId,
                institution_id: selectedInstitutionId,
                assigned_by: currentUser.id
            });
            
            const response = await fetch('/api/technician-assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    technician_id: currentTechnicianId,
                    institution_id: selectedInstitutionId,
                    assigned_by: currentUser.id
                })
            });

            console.log('[ASSIGN] Response status:', response.status);
            console.log('[ASSIGN] Response OK:', response.ok);
            
            let result = {};
            try { result = await response.json(); } catch (e) { /* ignore parse errors */ }

            console.log('[ASSIGN] Response body:', result);
            
            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to assign client');
            }

            console.log('[ASSIGN] ✓ Assignment successful!');
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

        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Authentication token not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`/api/technician-assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    // Close modal when clicking the overlay (outside content)
    const addStaffModalOverlay = document.getElementById('addStaffModalOverlay');
    if (addStaffModalOverlay) {
        addStaffModalOverlay.addEventListener('click', function() {
            closeAddStaffModal();
        });
    }

    // Close assignments modal when clicking outside
    document.getElementById('assignmentsModal').addEventListener('click', function(e) {
        if (e.target === document.getElementById('assignmentsModal')) {
            closeAssignmentsModal();
        }
    });

    // Enhanced functions for handling unlimited assignments
    
    // Navigate to client management page and highlight specific institution
    window.goToInstitution = function(institutionId) {
        // Store the institution ID to highlight when the page loads
        sessionStorage.setItem('highlightInstitution', institutionId);
        // Navigate to client management page
        window.location.href = '/pages/admin/client-management.html';
    };
    
    // Utility function to format institution names with smart truncation
    function formatInstitutionName(name, maxLength = 30, showTooltip = true) {
        if (!name) return '';
        
        if (name.length <= maxLength) {
            return showTooltip ? `<span title="${name}">${name}</span>` : name;
        }
        
        const truncated = name.substring(0, maxLength) + '...';
        return showTooltip ? `<span title="${name}">${truncated}</span>` : truncated;
    }

    // View institution team details
    window.viewInstitutionTeam = function(institutionId) {
        // This would open a detailed view of all technicians assigned to this institution
        console.log('Viewing team for institution:', institutionId);
        // Implementation would show a modal with all team members, their roles, etc.
    };

    // Quick assignment analytics with pagination for many assignments
    window.showQuickAnalytics = function(staffId) {
        const technician = allStaff.find(staff => staff.id === staffId);
        if (!technician || !technician.assignments) return;

        const assignments = technician.assignments;
        const typeGroups = {};
        assignments.forEach(assignment => {
            const type = assignment.institution_type || 'other';
            if (!typeGroups[type]) typeGroups[type] = 0;
            typeGroups[type]++;
        });

        // Pagination settings for many assignments
        const itemsPerPage = 5;
        let currentPage = 1;
        let searchTerm = '';
        let filteredAssignments = assignments;

        function filterAssignments(searchQuery) {
            if (!searchQuery.trim()) {
                return assignments;
            }
            return assignments.filter(assignment => 
                assignment.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (assignment.institution_type && assignment.institution_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (assignment.institution_address && assignment.institution_address.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        function renderAnalyticsModal(page = 1, search = '') {
            filteredAssignments = filterAssignments(search);
            const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const pageAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

            const analyticsModal = document.createElement('div');
            analyticsModal.id = 'analyticsModal';
            analyticsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            analyticsModal.innerHTML = `
                <div class="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- Header -->
                    <div class="flex justify-between items-center p-6 border-b border-gray-200">
                        <h3 class="text-xl font-bold text-gray-900">Assignment Analytics</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-lg"></i>
                        </button>
                    </div>
                    
                    <!-- Content - Scrollable -->
                    <div class="flex-1 overflow-y-auto p-6">
                        <!-- Technician Info -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="font-semibold text-blue-900 mb-2">${technician.first_name} ${technician.last_name}</h4>
                                    <div class="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div class="text-2xl font-bold text-blue-600">${assignments.length}</div>
                                            <div class="text-sm text-blue-700">Total Assignments</div>
                                        </div>
                                        <div>
                                            <div class="text-2xl font-bold text-green-600">${Object.keys(typeGroups).length}</div>
                                            <div class="text-sm text-green-700">Institution Types</div>
                                        </div>
                                        <div>
                                            <div class="text-2xl font-bold text-purple-600">${getWorkloadLevel(assignments.length).level}</div>
                                            <div class="text-sm text-purple-700">Workload Level</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Distribution by Type -->
                        <div class="mb-6">
                            <h5 class="font-semibold text-gray-900 mb-3">Distribution by Type</h5>
                            <div class="space-y-2">
                                ${Object.entries(typeGroups).map(([type, count]) => {
                                    const percentage = Math.round((count / assignments.length) * 100);
                                    return `
                                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <span class="text-sm font-medium text-gray-900">${formatInstitutionType(type)}</span>
                                            <div class="flex items-center space-x-2">
                                                <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div class="h-full bg-blue-500 rounded-full" style="width: ${percentage}%"></div>
                                                </div>
                                                <span class="text-sm text-gray-600 w-8">${count}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <!-- Assignment List with Search and Pagination -->
                        <div class="mb-6">
                            <div class="flex items-center justify-between mb-3">
                                <h5 class="font-semibold text-gray-900">Institution Details</h5>
                                ${assignments.length > 5 ? `
                                    <div class="text-sm text-gray-600">
                                        ${filteredAssignments.length !== assignments.length ? 
                                            `Showing ${filteredAssignments.length} of ${assignments.length} (filtered)` : 
                                            `Page ${page} of ${totalPages} (${assignments.length} total)`
                                        }
                                    </div>
                                ` : ''}
                            </div>
                            
                            <!-- Search Box for Many Assignments -->
                            ${assignments.length > 5 ? `
                                <div class="mb-4">
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <i class="fas fa-search text-gray-400 text-sm"></i>
                                        </div>
                                        <input type="text" 
                                               placeholder="Search institutions..." 
                                               value="${search}"
                                               oninput="updateAnalyticsSearch(this.value)"
                                               class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="space-y-2 max-h-64 overflow-y-auto">
                                ${pageAssignments.map(assignment => `
                                    <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                                            <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                                <i class="fas fa-building text-white text-xs"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium text-gray-900" title="${assignment.institution_name}">
                                                    ${assignment.institution_name}
                                                </div>
                                                <div class="text-sm text-gray-600">${formatInstitutionType(assignment.institution_type)}</div>
                                                ${assignment.institution_address ? `<div class="text-xs text-gray-500">${assignment.institution_address}</div>` : ''}
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <button onclick="viewInstitutionTeam('${assignment.institution_id}')" 
                                                    class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors">
                                                <i class="fas fa-users mr-1"></i>Team
                                            </button>
                                            <button onclick="removeAssignment(${assignment.technician_id}, ${assignment.institution_id})" 
                                                    class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors">
                                                <i class="fas fa-times mr-1"></i>Remove
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <!-- Pagination Controls -->
                            ${totalPages > 1 ? `
                                <div class="flex items-center justify-center space-x-2 mt-4">
                                    <button onclick="updateAnalyticsPage(${page - 1})" 
                                            ${page <= 1 ? 'disabled' : ''}
                                            class="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        <i class="fas fa-chevron-left mr-1"></i>Previous
                                    </button>
                                    
                                    <div class="flex space-x-1">
                                        ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                                            const pageNum = i + 1;
                                            return `
                                                <button onclick="updateAnalyticsPage(${pageNum})" 
                                                        class="px-2 py-1 text-sm rounded ${pageNum === page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors">
                                                    ${pageNum}
                                                </button>
                                            `;
                                        }).join('')}
                                        ${totalPages > 5 ? '<span class="px-2 py-1 text-gray-500">...</span>' : ''}
                                    </div>
                                    
                                    <button onclick="updateAnalyticsPage(${page + 1})" 
                                            ${page >= totalPages ? 'disabled' : ''}
                                            class="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        Next<i class="fas fa-chevron-right ml-1"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Footer Actions -->
                    <div class="border-t border-gray-200 p-4">
                        <div class="flex space-x-2">
                            <button onclick="manageAssignments(${staffId}); this.closest('.fixed').remove();" 
                                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-cog mr-2"></i>Manage All Assignments
                            </button>
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('analyticsModal');
            if (existingModal) existingModal.remove();
            
            document.body.appendChild(analyticsModal);
        }

        // Helper functions for search and pagination
        window.updateAnalyticsSearch = function(searchValue) {
            searchTerm = searchValue;
            currentPage = 1; // Reset to first page when searching
            renderAnalyticsModal(currentPage, searchTerm);
        };

        window.updateAnalyticsPage = function(newPage) {
            const filteredAssignments = filterAssignments(searchTerm);
            const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                renderAnalyticsModal(currentPage, searchTerm);
            }
        };

        renderAnalyticsModal(currentPage, searchTerm);
    };

    // Workload assessment helper
    function getWorkloadLevel(assignmentCount) {
        if (assignmentCount === 0) return { level: 'Available', color: 'gray', description: 'No current assignments' };
        if (assignmentCount <= 2) return { level: 'Light', color: 'green', description: 'Manageable workload' };
        if (assignmentCount <= 5) return { level: 'Moderate', color: 'blue', description: 'Balanced workload' };
        if (assignmentCount <= 8) return { level: 'Heavy', color: 'orange', description: 'High workload' };
        if (assignmentCount <= 12) return { level: 'Very Heavy', color: 'red', description: 'Maximum recommended' };
        return { level: 'Overloaded', color: 'purple', description: 'Consider redistribution' };
    }

    // Smart assignment suggestions
    window.suggestOptimalAssignments = function(staffId) {
        const technician = allStaff.find(staff => staff.id === staffId);
        if (!technician) return;

        const workload = getWorkloadLevel(technician.assignments?.length || 0);
        const suggestions = [];

        if (workload.level === 'Available') {
            suggestions.push('This technician is available for new assignments');
        } else if (workload.level === 'Overloaded') {
            suggestions.push('Consider redistributing some assignments to other technicians');
            suggestions.push('Review assignment priority and complexity');
        } else if (workload.level === 'Very Heavy') {
            suggestions.push('Monitor workload closely');
            suggestions.push('Avoid adding new assignments unless critical');
        }

        // Show suggestions in a toast or modal
        console.log('Workload suggestions for', technician.first_name, technician.last_name, ':', suggestions);
    };

    // Helper function to get auth token
    function getAuthToken() {
        return localStorage.getItem('token');
    }

    // Change Staff Password Functions
    window.changeStaffPassword = function(staffId) {
        const staff = allStaff.find(s => s.id === staffId);
        if (!staff) {
            showError('Staff member not found');
            return;
        }

        // Populate modal with staff info
        document.getElementById('changePasswordStaffId').value = staff.id;
        document.getElementById('changePasswordStaffName').textContent = `${staff.first_name} ${staff.last_name}`;
        document.getElementById('changePasswordStaffEmail').textContent = staff.email;
        
        // Clear form fields
        document.getElementById('newPasswordInput').value = '';
        document.getElementById('confirmPasswordInput').value = '';
        
        // Hide any previous alerts
        const alertDiv = document.getElementById('changePasswordAlert');
        alertDiv.classList.add('hidden');
        
        // Show modal
        document.getElementById('changePasswordModal').classList.remove('hidden');
    };

    window.closeChangePasswordModal = function() {
        document.getElementById('changePasswordModal').classList.add('hidden');
        document.getElementById('changePasswordForm').reset();
    };

    // Handle password change form submission
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        // Setup change password UI: toggle and strength meter
        const newPasswordInput = document.getElementById('newPasswordInput');
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        const toggleChangePasswordBtn = document.getElementById('toggleChangePasswordBtn');
        const changePasswordStrengthBar = document.getElementById('changePasswordStrengthBar');
        const changePasswordStrengthLabel = document.getElementById('changePasswordStrengthLabel');
        const changePasswordHelp = document.getElementById('changePasswordHelp');

        // Toggle show/hide for New Password
        if (toggleChangePasswordBtn && newPasswordInput) {
            toggleChangePasswordBtn.addEventListener('click', function() {
                if (newPasswordInput.type === 'password') {
                    newPasswordInput.type = 'text';
                    toggleChangePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    toggleChangePasswordBtn.setAttribute('aria-label', 'Hide password');
                } else {
                    newPasswordInput.type = 'password';
                    toggleChangePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    toggleChangePasswordBtn.setAttribute('aria-label', 'Show password');
                }
                newPasswordInput.focus();
            });
        }

        // Toggle show/hide for Confirm Password
        const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPasswordBtn');
        if (toggleConfirmPasswordBtn && confirmPasswordInput) {
            toggleConfirmPasswordBtn.addEventListener('click', function() {
                if (confirmPasswordInput.type === 'password') {
                    confirmPasswordInput.type = 'text';
                    toggleConfirmPasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    toggleConfirmPasswordBtn.setAttribute('aria-label', 'Hide password');
                } else {
                    confirmPasswordInput.type = 'password';
                    toggleConfirmPasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    toggleConfirmPasswordBtn.setAttribute('aria-label', 'Show password');
                }
                confirmPasswordInput.focus();
            });
        }

        // Strength update for change password field
        function updateChangePasswordStrength() {
            if (!newPasswordInput) return;
            const pwd = newPasswordInput.value || '';
            const res = evaluatePassword(pwd); // reuse evaluatePassword defined earlier
            if (changePasswordStrengthBar) {
                changePasswordStrengthBar.style.width = res.percent + '%';
                if (res.percent < 40) changePasswordStrengthBar.className = 'h-full w-0 bg-red-500 transition-all';
                else if (res.percent < 70) changePasswordStrengthBar.className = 'h-full w-0 bg-amber-400 transition-all';
                else changePasswordStrengthBar.className = 'h-full w-0 bg-green-500 transition-all';
                setTimeout(() => changePasswordStrengthBar.style.width = res.percent + '%', 10);
            }
            if (changePasswordStrengthLabel) changePasswordStrengthLabel.textContent = res.label;
            if (changePasswordHelp) changePasswordHelp.textContent = 'Use 8+ characters with letters, numbers & symbols.';
        }

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', updateChangePasswordStrength);
            // init
            updateChangePasswordStrength();
        }

        // Submit handler with strength validation
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const staffId = document.getElementById('changePasswordStaffId').value;
            const newPassword = (newPasswordInput && newPasswordInput.value || '').trim();
            const confirmPassword = (confirmPasswordInput && confirmPasswordInput.value || '').trim();
            const alertDiv = document.getElementById('changePasswordAlert');
            const submitBtn = document.getElementById('submitChangePasswordBtn');
            const btnText = document.getElementById('changePasswordBtnText');
            const loader = document.getElementById('changePasswordLoader');

            // Basic checks
            if (newPassword.length < 8) {
                showAlertInModal(alertDiv, 'Password must be at least 8 characters long', 'error');
                return;
            }

            // require letters, numbers, symbols
            const meetsCriteria = /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
            if (!meetsCriteria) {
                showAlertInModal(alertDiv, 'Password must include letters, numbers, and symbols', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlertInModal(alertDiv, 'Passwords do not match', 'error');
                return;
            }

            try {
                // Show loading state
                submitBtn.disabled = true;
                btnText.textContent = 'Changing...';
                loader.classList.remove('hidden');
                alertDiv.classList.add('hidden');

                const token = getAuthToken();
                const response = await fetch(`/api/admin/staff/${staffId}/password`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ newPassword })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to change password');
                }

                // Success
                showSuccessMessage('Password changed successfully');
                window.closeChangePasswordModal();

            } catch (error) {
                console.error('Error changing password:', error);
                showAlertInModal(alertDiv, error.message || 'Failed to change password', 'error');
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                btnText.textContent = 'Change Password';
                loader.classList.add('hidden');
            }
        });
    }

    // Helper function to show alerts in modal
    function showAlertInModal(alertDiv, message, type) {
        alertDiv.className = `rounded-md p-3 mb-4 text-sm ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`;
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        alertDiv.classList.remove('hidden');
    }
});

