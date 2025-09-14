document.addEventListener('DOMContentLoaded', function() {
    let pendingUsers = [];

    // DOM Elements
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const registrationsContainer = document.getElementById('registrationsContainer');
    const searchInput = document.getElementById('searchInput');
    const institutionFilter = document.getElementById('institutionFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const secureDocumentModal = document.getElementById('secureDocumentModal');
    const secureDocumentContainer = document.getElementById('secureDocumentContainer');
    const closeSecureModal = document.getElementById('closeSecureModal');
    const closeSecureModalBtn = document.getElementById('closeSecureModalBtn');

    // Load pending registrations on page load
    loadPendingRegistrations();

    // Event Listeners
    refreshBtn.addEventListener('click', loadPendingRegistrations);
    searchInput.addEventListener('input', filterRegistrations);
    institutionFilter.addEventListener('change', filterRegistrations);

    // Secure modal event listeners
    closeSecureModal.addEventListener('click', hideSecureDocumentModal);
    closeSecureModalBtn.addEventListener('click', hideSecureDocumentModal);
    secureDocumentModal.addEventListener('click', (e) => {
        if (e.target === secureDocumentModal) {
            hideSecureDocumentModal();
        }
    });

    async function loadPendingRegistrations() {
        try {
            showLoadingState();
            
            const response = await fetch('http://localhost:3000/api/pending-users');
            if (!response.ok) {
                throw new Error('Failed to fetch pending registrations');
            }
            
            pendingUsers = await response.json();
            
            if (pendingUsers.length === 0) {
                showEmptyState();
            } else {
                displayRegistrations(pendingUsers);
            }
        } catch (error) {
            console.error('Error loading pending registrations:', error);
            showEmptyState();
        }
    }

    function showLoadingState() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        registrationsContainer.classList.add('hidden');
    }

    function showEmptyState() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        registrationsContainer.classList.add('hidden');
    }

    function displayRegistrations(users) {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
        registrationsContainer.classList.remove('hidden');
        
        registrationsContainer.innerHTML = '';
        
        // Sort users by institution match status first (matches first), then by date
        const sortedUsers = users.sort((a, b) => {
            // First, sort by institution match (matched first)
            const aMatch = a.has_institution_match == 1 || a.has_institution_match === true;
            const bMatch = b.has_institution_match == 1 || b.has_institution_match === true;
            if (aMatch !== bMatch) {
                return bMatch - aMatch;
            }
            // Then sort by date (newest first)
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        sortedUsers.forEach(user => {
            const registrationCard = createRegistrationCard(user);
            registrationsContainer.appendChild(registrationCard);
        });
    }

    function createRegistrationCard(user) {
        const card = document.createElement('div');
        const hasMatch = user.has_institution_match == 1 || user.has_institution_match === true;
        
        // Debug logging
        console.log(`Creating card for ${user.first_name} ${user.last_name}:`);
        console.log(`  has_institution_match value: ${user.has_institution_match} (type: ${typeof user.has_institution_match})`);
        console.log(`  hasMatch result: ${hasMatch}`);
        
        // Different styling based on institution match
        if (hasMatch) {
            card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500';
        } else {
            card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-yellow-500';
        }
        
        const formattedDate = new Date(user.created_at).toLocaleDateString();
        const institutionTypeDisplay = formatInstitutionType(user.institution_type);
        
        // Create institution info section based on match status
        const institutionSection = hasMatch ? `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-check-circle text-green-600 mt-1"></i>
                    </div>
                    <div class="ml-3">
                        <h4 class="text-sm font-medium text-green-900 flex items-center">
                            <i class="fas fa-building mr-2"></i>Institution Match Found
                        </h4>
                        <div class="mt-2 text-sm">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="font-medium text-green-800">Admin Institution (${user.institution_id}):</p>
                                    <p class="text-green-700">${user.matched_institution_name}</p>
                                    <p class="text-green-700">${formatInstitutionType(user.matched_institution_type)}</p>
                                    <p class="text-green-700">${user.matched_institution_address}</p>
                                </div>
                                <div>
                                    <p class="font-medium text-green-800">User Registration:</p>
                                    <p class="text-green-700">${user.institution_name}</p>
                                    <p class="text-green-700">${institutionTypeDisplay}</p>
                                    <p class="text-green-700">${user.institution_address}</p>
                                    <p class="text-green-700">Role: ${formatRole(user.role)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                    </div>
                    <div class="ml-3">
                        <h4 class="text-sm font-medium text-yellow-900 flex items-center">
                            <i class="fas fa-building mr-2"></i>No Institution Match
                        </h4>
                        <div class="mt-2 text-sm">
                            <p class="text-yellow-800 font-medium">User's Institution:</p>
                            <p class="text-yellow-700">${user.institution_name}</p>
                            <p class="text-yellow-700">${institutionTypeDisplay}</p>
                            <p class="text-yellow-700">${user.institution_address}</p>
                            <p class="text-yellow-700">Role: ${formatRole(user.role)}</p>
                            <p class="text-yellow-600 text-xs mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                This institution is not in the admin's client database
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        card.innerHTML = `
            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-1">
                            ${user.first_name} ${user.last_name}
                        </h3>
                        <p class="text-sm text-gray-600">${user.email}</p>
                        <p class="text-sm text-gray-500">Registered: ${formattedDate}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            Pending
                        </span>
                        ${hasMatch ? 
                            '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Institution Match</span>' :
                            '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">New Institution</span>'
                        }
                    </div>
                </div>

                ${institutionSection}

                <div class="flex justify-end mb-4">
                    <button onclick="viewSecureDocuments('${user.id}', '${user.first_name}', '${user.last_name}', '${user.front_id_photo}', '${user.back_id_photo}', '${user.selfie_photo}')"
                        class="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        <i class="fas fa-id-card mr-2"></i>View ID Verification
                    </button>
                </div>

                <div class="pt-4 border-t flex justify-end space-x-2">
                    <button onclick="rejectUser(${user.id})" 
                        class="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <i class="fas fa-times mr-1"></i>Reject
                    </button>
                    <button onclick="approveUser(${user.id})" 
                        class="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                        <i class="fas fa-check mr-1"></i>Approve
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }



    function formatRole(role) {
    // Split by underscore and capitalize each word
    return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    function formatInstitutionType(type) {
        const types = {
            'public_school': 'Public School',
            'private_school': 'Private School',
            'private_company': 'Private Company',
            'lgu': 'Local Government Unit'
        };
        return types[type] || type;
    }

    function filterRegistrations() {
        const searchTerm = searchInput.value.toLowerCase();
        const institutionType = institutionFilter.value;
        
        const filteredUsers = pendingUsers.filter(user => {
            const matchesSearch = !searchTerm || 
                user.first_name.toLowerCase().includes(searchTerm) ||
                user.last_name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.institution_name.toLowerCase().includes(searchTerm);
                
            const matchesInstitution = !institutionType || user.institution_type === institutionType;
            
            return matchesSearch && matchesInstitution;
        });
        
        if (filteredUsers.length === 0) {
            showEmptyState();
        } else {
            displayRegistrations(filteredUsers);
        }
    }

    // Global functions for button clicks
    window.viewSecureDocuments = async function(userId, firstName, lastName, frontId, backId, selfie) {
        try {
            // Show confirmation dialog first
            const confirmed = await showConfirmationDialog(
                'View Sensitive Documents',
                `You are about to view sensitive verification documents for ${firstName} ${lastName}. This action will be logged. Do you want to proceed?`
            );

            if (!confirmed) return;

            // Log the viewing action (you should implement this on your backend)
            try {
                await fetch('/api/log-document-view', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        action: 'view_documents',
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (error) {
                console.error('Failed to log document view:', error);
                // Continue showing documents even if logging fails
            }

            // Prepare the secure document viewer
            secureDocumentContainer.innerHTML = `
                <div class="document-preview">
                    <h4 class="font-medium text-gray-900 mb-2">Front ID</h4>
                    ${frontId ? `<img src="/temp-photos/${frontId}" alt="Front ID" class="w-full h-auto rounded-lg">` : 
                    '<div class="bg-gray-100 rounded-lg p-4 text-center text-gray-500">Not provided</div>'}
                </div>
                <div class="document-preview">
                    <h4 class="font-medium text-gray-900 mb-2">Back ID</h4>
                    ${backId ? `<img src="/temp-photos/${backId}" alt="Back ID" class="w-full h-auto rounded-lg">` : 
                    '<div class="bg-gray-100 rounded-lg p-4 text-center text-gray-500">Not provided</div>'}
                </div>
                <div class="document-preview">
                    <h4 class="font-medium text-gray-900 mb-2">Selfie with ID</h4>
                    ${selfie ? `<img src="/temp-photos/${selfie}" alt="Selfie with ID" class="w-full h-auto rounded-lg">` : 
                    '<div class="bg-gray-100 rounded-lg p-4 text-center text-gray-500">Not provided</div>'}
                </div>
            `;

            // Show the modal
            secureDocumentModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing secure documents:', error);
            alert('Failed to load documents. Please try again.');
        }
    };

    function hideSecureDocumentModal() {
        secureDocumentModal.classList.add('hidden');
        // Clear the container for security
        secureDocumentContainer.innerHTML = '';
    }

    async function showConfirmationDialog(title, message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            dialog.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                    <h3 class="text-lg font-medium text-gray-900 mb-2">${title}</h3>
                    <p class="text-sm text-gray-500 mb-6">${message}</p>
                    <div class="flex justify-end space-x-4">
                        <button id="cancelBtn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                            Cancel
                        </button>
                        <button id="confirmBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Proceed
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            const confirmBtn = dialog.querySelector('#confirmBtn');
            const cancelBtn = dialog.querySelector('#cancelBtn');

            confirmBtn.addEventListener('click', () => {
                dialog.remove();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                dialog.remove();
                resolve(false);
            });

            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    dialog.remove();
                    resolve(false);
                }
            });
        });
    }

    window.approveUser = async function(userId) {
        // Create and show confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        confirmModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 transform transition-all animate-fade-in-up">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <i class="fas fa-user-check text-xl text-green-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Approve Registration</h3>
                    <p class="text-sm text-gray-500 mb-6">
                        Are you sure you want to approve this user registration? This will grant them access to the system.
                    </p>
                    <div class="flex justify-center space-x-4">
                        <button id="confirmApprove" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                            Approve
                        </button>
                        <button id="cancelApprove" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        // Handle modal actions
        return new Promise((resolve) => {
            const confirmBtn = confirmModal.querySelector('#confirmApprove');
            const cancelBtn = confirmModal.querySelector('#cancelApprove');

            const closeModal = () => {
                confirmModal.remove();
            };

            cancelBtn.addEventListener('click', () => {
                closeModal();
                resolve(false);
            });

            confirmBtn.addEventListener('click', async () => {
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Approving...';

                    const response = await fetch(`/api/approve-user/${userId}`, {
                method: 'POST'
            });
                    
                    const data = await response.json();
            
            if (!response.ok) {
                        throw new Error(data.error || 'Failed to approve user');
                    }
                    
                    // Show success message
                    closeModal();
                    const successModal = document.createElement('div');
                    successModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    successModal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                            <div class="text-center">
                                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <i class="fas fa-check text-xl text-green-600"></i>
                                </div>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">Registration Approved</h3>
                                <p class="text-sm text-gray-500 mb-6">
                                    The user has been successfully approved and can now access the system.
                                </p>
                                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    OK
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(successModal);

                    // Auto-close success message after 2 seconds
                    setTimeout(() => {
                        successModal.remove();
                    }, 2000);

            loadPendingRegistrations(); // Refresh the list
                    resolve(true);
        } catch (error) {
            console.error('Error approving user:', error);
                    closeModal();
                    
                    // Show error modal
                    const errorModal = document.createElement('div');
                    errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    errorModal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                            <div class="text-center">
                                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <i class="fas fa-times text-xl text-red-600"></i>
                                </div>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                                <p class="text-sm text-gray-500 mb-6">
                                    ${error.message || 'Failed to approve user. Please try again.'}
                                </p>
                                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    OK
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(errorModal);

                    // Close error modal on button click
                    errorModal.querySelector('button').addEventListener('click', () => {
                        errorModal.remove();
                    });
                    resolve(false);
                }
            });
        });
    };

    window.rejectUser = async function(userId) {
        // Create and show confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        confirmModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i class="fas fa-exclamation-triangle text-xl text-red-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Reject Registration</h3>
                    <p class="text-sm text-gray-500 mb-6">
                        Are you sure you want to reject this user registration? This action cannot be undone.
                    </p>
                    <div class="flex justify-center space-x-4">
                        <button id="confirmReject" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                            Reject
                        </button>
                        <button id="cancelReject" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        // Handle modal actions
        return new Promise((resolve) => {
            const confirmBtn = confirmModal.querySelector('#confirmReject');
            const cancelBtn = confirmModal.querySelector('#cancelReject');

            const closeModal = () => {
                confirmModal.remove();
            };

            cancelBtn.addEventListener('click', () => {
                closeModal();
                resolve(false);
            });

            confirmBtn.addEventListener('click', async () => {
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Rejecting...';

                    const response = await fetch(`/api/reject-user/${userId}`, {
                method: 'POST'
            });
                    
                    const data = await response.json();
            
            if (!response.ok) {
                        throw new Error(data.error || 'Failed to reject user');
                    }
                    
                    // Show success message
                    closeModal();
                    const successModal = document.createElement('div');
                    successModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    successModal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                            <div class="text-center">
                                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <i class="fas fa-check text-xl text-green-600"></i>
                                </div>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">Registration Rejected</h3>
                                <p class="text-sm text-gray-500 mb-6">
                                    The user registration has been successfully rejected.
                                </p>
                                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    OK
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(successModal);

                    // Auto-close success message after 2 seconds
                    setTimeout(() => {
                        successModal.remove();
                    }, 2000);

            loadPendingRegistrations(); // Refresh the list
                    resolve(true);
        } catch (error) {
            console.error('Error rejecting user:', error);
                    closeModal();
                    
                    // Show error modal
                    const errorModal = document.createElement('div');
                    errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    errorModal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                            <div class="text-center">
                                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <i class="fas fa-times text-xl text-red-600"></i>
                                </div>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                                <p class="text-sm text-gray-500 mb-6">
                                    ${error.message || 'Failed to reject user. Please try again.'}
                                </p>
                                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    OK
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(errorModal);

                    // Close error modal on button click
                    errorModal.querySelector('button').addEventListener('click', () => {
                        errorModal.remove();
                    });
                    resolve(false);
                }
            });
        });
    };
    
    // Add filtering functionality
    function filterRegistrations() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const institutionType = document.getElementById('institutionFilter').value;
        const matchFilter = document.getElementById('matchFilter').value;
        
        let filteredUsers = pendingUsers.filter(user => {
            // Search filter
            const nameMatch = (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchTerm);
            const emailMatch = user.email.toLowerCase().includes(searchTerm);
            if (searchTerm && !nameMatch && !emailMatch) return false;
            
            // Institution type filter
            if (institutionType && user.institution_type !== institutionType) return false;
            
            // Match filter
            const userHasMatch = user.has_institution_match == 1 || user.has_institution_match === true;
            if (matchFilter === 'matched' && !userHasMatch) return false;
            if (matchFilter === 'unmatched' && userHasMatch) return false;
            
            return true;
        });
        
        displayRegistrations(filteredUsers);
    }
    
    // Add event listeners for filtering
    document.getElementById('searchInput').addEventListener('input', filterRegistrations);
    document.getElementById('institutionFilter').addEventListener('change', filterRegistrations);
    document.getElementById('matchFilter').addEventListener('change', filterRegistrations);
});