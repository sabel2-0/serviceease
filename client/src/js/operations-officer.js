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
        welcomeMessage.textContent = `Welcome, ${user.firstName}! Manage service operations and coordinator approvals here.`;
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
function setupDashboardMetrics() {
    // This would typically fetch data from an API
    console.log('Setting up dashboard metrics');
    
    // Example of how you might update metrics dynamically
    // In a real application, these would come from API calls
    /*
    fetch('/api/operations/metrics')
        .then(response => response.json())
        .then(data => {
            // Update metrics with real data
            document.querySelector('.pending-approvals').textContent = data.pendingApprovals;
            document.querySelector('.service-requests').textContent = data.serviceRequests;
            document.querySelector('.parts-requests').textContent = data.partsRequests;
            document.querySelector('.pending-completions').textContent = data.pendingCompletions;
        })
        .catch(error => {
            console.error('Error fetching metrics:', error);
        });
    */
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