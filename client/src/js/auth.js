// Global fetch interceptor to handle token expiration and forbidden access
(function() {
    const originalFetch = window.fetch;
    let isLoggingOut = false; // Prevent multiple logout attempts
    
    function performLogout(message) {
        // Prevent multiple simultaneous logouts
        if (isLoggingOut) return;
        isLoggingOut = true;
        
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        
        // Show message
        alert(message);
        
        // Redirect to login
        window.location.href = '/pages/login.html';
    }
    
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Skip if already logging out
            if (isLoggingOut) return response;
            
            // Check if response is 401 Unauthorized or 403 Forbidden
            if (response.status === 401 || response.status === 403) {
                // Clone the response to read it
                const clonedResponse = response.clone();
                
                try {
                    const data = await clonedResponse.json();
                    
                    if (response.status === 401) {
                        // Check if it's a token expiration or session invalidation
                        if (data.code === 'TOKEN_INVALIDATED' || 
                            data.code === 'ACCOUNT_INACTIVE' || 
                            data.code === 'INSTITUTION_DEACTIVATED' ||
                            data.message?.includes('token') || 
                            data.message?.includes('Session expired')) {
                            
                            performLogout(data.message || 'Your session has expired. Please log in again.');
                        }
                    } else if (response.status === 403) {
                        // Handle 403 Forbidden - auto logout
                        performLogout(data.error || data.message || 'Access denied. You do not have permission. Logging out...');
                    }
                } catch (jsonError) {
                    // If we can't parse the response, still logout on 401/403
                    const message = response.status === 403 
                        ? 'Access denied. Logging out...' 
                        : 'Session expired. Please log in again.';
                    performLogout(message);
                }
            }
            
            return response;
        } catch (error) {
            // Handle network errors
            throw error;
        }
    };
})();

// Function to verify user role and redirect if unauthorized
function verifyRole(allowedRoles) {
    const user = getCurrentUser();
    
    // If no user is logged in, redirect to login
    if (!user || !isLoggedIn()) {
        window.location.href = '/pages/login.html';
        return false;
    }

    // If user's role is not in the allowed roles, redirect to their appropriate dashboard
    if (!allowedRoles.includes(user.role)) {
        // Get current path
        const currentPath = window.location.pathname;
        let targetPath = '';
        switch (user.role) {
            case 'admin':
                targetPath = '/pages/admin/admin.html';
                break;
            case 'operations_officer':
                targetPath = '/pages/operations-officer/operations-officer.html';
                break;
            case 'technician':
                targetPath = '/pages/technician/technician.html';
                break;
            case 'institution_user':
                targetPath = '/pages/institution_user/institution_user.html';
                break;
            case 'institution_admin':
                targetPath = '/pages/institution-admin/institution-admin.html';
                break;
            default:
                targetPath = '/pages/login.html'; // fallback to login for unknown roles
        }
        // Only redirect if not already on the correct dashboard
        if (currentPath !== targetPath) {
            window.location.href = targetPath;
        }
        return false;
    }

    return true;
}

// Function to get current path information
function getCurrentPathInfo() {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(Boolean);
    
    if (pathParts.length >= 2 && pathParts[0] === 'pages') {
        return {
            section: pathParts[1], // e.g., 'operations-officer', 'admin', etc.
            page: pathParts[2] // The specific page name
        };
    }
    return null;
}

// Function to check if user is accessing the correct section
function verifySectionAccess() {
    const user = getCurrentUser();
    if (!user || !isLoggedIn()) {
        window.location.href = '/pages/login.html';
        return false;
    }

    const pathInfo = getCurrentPathInfo();
    if (!pathInfo) return true; // Skip check if not in a section

    // Define shared pages that operations officers can access from admin section
    const sharedAdminPages = [
        'walk-in-service-requests.html',
        'parts-requests.html',
        'service-history.html',
        'client-management.html',
        'client-printers.html',
        'inventory-items.html',
        'inventory-parts.html',
        'institution_admin-accounts.html',
        'institution_admin-approvals.html'
    ];

    // Allow operations officers to access certain admin pages
    if (user.role === 'operations_officer' && 
        pathInfo.section === 'admin' && 
        sharedAdminPages.includes(pathInfo.page)) {
        return true; // Allow access to shared pages
    }

    const allowedSection = (() => {
        switch (user.role) {
            case 'admin': return 'admin';
            case 'operations_officer': return 'operations-officer';
            case 'technician': return 'technician';
            case 'institution_user': return 'institution_user';
            case 'institutionAdmin': return 'institutionAdmin';
            default: return null; // fallback for unknown roles
        }
    })();

    if (allowedSection && pathInfo.section !== allowedSection) {
        const targetPath = `/pages/${allowedSection}/${allowedSection}.html`;
        // Only redirect if not already on the correct dashboard
        if (window.location.pathname !== targetPath) {
            window.location.href = targetPath;
        }
        return false;
    }

    return true;
}

// Function to show email verification alert
function showEmailVerificationAlert() {
    // Create the alert container
    const alertContainer = document.createElement('div');
    alertContainer.className = 'fixed top-4 right-4 max-w-sm w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-lg rounded-lg';
    alertContainer.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-circle text-yellow-400 text-lg"></i>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">
                    Email Verification Required
                </h3>
                <div class="mt-2 text-sm text-yellow-700">
                    <p>Please verify your email address to access all features.</p>
                </div>
                <div class="mt-4">
                    <div class="-mx-2 -my-1.5 flex">
                        <button onclick="sendVerificationEmail()" class="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600">
                            Verify Email
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="ml-3 bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(alertContainer);

    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (alertContainer.parentElement) {
            alertContainer.remove();
        }
    }, 10000);
}

// Function to send verification email
async function sendVerificationEmail() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        const response = await fetch('/api/send-verification-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                email: user.email
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Verification email sent! Please check your inbox.');
        } else {
            throw new Error(data.error || 'Failed to send verification email');
        }
    } catch (error) {
        console.error('Error sending verification email:', error);
        alert('Error sending verification email. Please try again.');
    }
}

// Function to handle user login
async function loginUser({ email, password }) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Check if user must change password (temporary password)
        if (data.mustChangePassword) {
            // Store temporary user info for password change page
            localStorage.setItem('tempUserId', data.userId);
            localStorage.setItem('tempUserEmail', data.email);
            localStorage.setItem('tempUserRole', data.role);
            
            // Redirect to password change page
            window.location.href = '/client/src/pages/change-password.html';
            return data;
        }

        // Clear redirect flag - successful login
        sessionStorage.removeItem('redirecting_to_login');

        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Store token if provided
        if (data.token) {
            localStorage.setItem('token', data.token);
        }

        // Only show approval alert for pending users
        if (data.user.approvalStatus === 'pending') {
            localStorage.setItem('showApprovalAlert', 'true');
        }

        // Redirect based on role using absolute paths
        if (data.user.role === 'admin') {
            window.location.href = '/client/src/pages/admin/admin.html';
        } else if (data.user.role === 'operations_officer') {
            window.location.href = '/client/src/pages/operations-officer/operations-officer.html';
        } else if (data.user.role === 'technician') {
            window.location.href = '/client/src/pages/technician/technician.html';
        } else if (data.user.role === 'institution_user') {
            window.location.href = '/client/src/pages/institution_user/institution-user.html';
        } else if (data.user.role === 'institution_admin') {
            window.location.href = '/client/src/pages/institution-admin/institution-admin.html';
        } else {
            // Fallback for unknown roles
            window.location.href = '/pages/login.html';
        }

        return data;
    } catch (error) {
        throw new Error(error.message || 'Login failed');
    }
}

// Function to check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Function to get current user data
function getCurrentUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Function to handle user registration
async function registerUser(formData) {
    try {
        // Create FormData to handle file uploads
        const registrationData = new FormData();
        
        // Add text fields
        registrationData.append('firstName', formData.firstName);
        registrationData.append('lastName', formData.lastName);
        registrationData.append('email', formData.email);
        registrationData.append('password', formData.password);
        registrationData.append('role', formData.role || 'institution_admin'); // Use provided role or default to institution_admin
        
        // Add institutionId if provided (from the institution selection dropdown)
        if (formData.institutionId) {
            registrationData.append('institutionId', formData.institutionId);
        }
        
        // Add photo files if they exist
        const frontIdInput = document.getElementById('front-id-upload');
        const backIdInput = document.getElementById('back-id-upload');
        const selfieInput = document.getElementById('selfie-upload');
        
        if (frontIdInput && frontIdInput.files[0]) {
            registrationData.append('frontId', frontIdInput.files[0]);
        }
        if (backIdInput && backIdInput.files[0]) {
            registrationData.append('backId', backIdInput.files[0]);
        }
        if (selfieInput && selfieInput.files[0]) {
            registrationData.append('selfie', selfieInput.files[0]);
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            body: registrationData // Don't set Content-Type header, let browser set it for FormData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        return data;
    } catch (error) {
        throw new Error(error.message || 'Registration failed');
    }
}

// Function to handle logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token'); // Also remove token
    window.location.href = '/pages/login.html'; // Corrected path
}






