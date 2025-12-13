/**
 * Operations Officer Dashboard Functionality
 * This script handles specific functionality for the Operations Officer dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Operations Officer Dashboard loaded');
    
    // Check authentication first
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        console.error('User not logged in, redirecting to login page');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Check if user has the correct role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'operations_officer') {
        console.error('Unauthorized access - Not an operations officer');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // User is authenticated and has correct role, initialize dashboard
    initializeDashboard();
    
    // Update UI with user information
    updateUserInfo(user);
});

/**
 * Update user information in the UI
 * @param {Object} user - The user object from localStorage
 */
function updateUserInfo(user) {
    // Add the user's name to the dashboard greeting if available
    const welcomeMessage = document.querySelector('main p.text-gray-600');
    if (welcomeMessage && user.firstName) {
        welcomeMessage.textContent = `Welcome, ${user.firstName}! Manage service operations and institutionAdmin approvals here.`;
    }
}

/**
 * Initialize dashboard with data
 */
function initializeDashboard() {
    // Set up dashboard metrics
    setupDashboardMetrics();
    
    // Setup event handlers
    setupEventHandlers();
}

/**
 * Set up dashboard metrics
 */
async function setupDashboardMetrics() {
    console.log('Setting up dashboard metrics');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // Fetch dashboard stats from API
        const response = await fetch('/api/admin/dashboard-stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dashboard stats received:', data);

        // Update the dashboard cards with real data using IDs
        document.getElementById('pending-approvals-count').textContent = data.pendingInstitutionAdmins || 0;
        document.getElementById('service-requests-count').textContent = data.totalServiceRequests || 0;
        document.getElementById('parts-requests-count').textContent = data.pendingPartsRequests || 0;
        document.getElementById('pending-completions-count').textContent = data.pendingCompletions || 0;

    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        // Keep the hard-coded values as fallback
    }
}

/**
 * Update a dashboard card with new value
 * @param {string} cardTitle - The title of the card to update
 * @param {number} value - The new value to display
 */
function updateDashboardCard(cardTitle, value) {
    const cards = document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-md');
    
    cards.forEach(card => {
        const title = card.querySelector('.text-sm.text-gray-500');
        if (title && title.textContent.trim() === cardTitle) {
            const valueElement = card.querySelector('.text-2xl.font-bold');
            if (valueElement) {
                valueElement.textContent = value;
            }
        }
    });
}

/**
 * Set up event handlers for dashboard elements
 */
function setupEventHandlers() {
    // Example: Setup handlers for dashboard cards
    const dashboardCards = document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow-md');
    
    dashboardCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('transform', 'scale-105', 'transition-transform');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('transform', 'scale-105', 'transition-transform');
        });
    });
}




