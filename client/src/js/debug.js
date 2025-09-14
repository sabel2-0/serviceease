/**
 * Debug Script
 * This script helps troubleshoot page loading issues
 */

console.log('Debug script loaded successfully!');
console.log('Current URL:', window.location.href);
console.log('Current path:', window.location.pathname);

// Check if required scripts are loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Check if auth.js is loaded properly
    if (typeof isLoggedIn === 'function') {
        console.log('✅ auth.js loaded successfully');
        console.log('User logged in:', isLoggedIn());
        
        const user = getCurrentUser();
        if (user) {
            console.log('Current user role:', user.role);
        } else {
            console.log('❌ No user found in localStorage');
        }
    } else {
        console.log('❌ auth.js not loaded properly - isLoggedIn function not found');
    }
    
    // Check if unified-sidebar.js is loaded
    if (typeof loadUnifiedSidebar === 'function') {
        console.log('✅ unified-sidebar.js loaded successfully');
    } else {
        console.log('❌ unified-sidebar.js not loaded properly - loadUnifiedSidebar function not found');
    }
    
    // Check if operations-officer.js is loaded
    console.log('Looking for operations-officer.js functions...');
    
    // Check DOM elements
    console.log('Sidebar container exists:', !!document.getElementById('sidebar-container'));
    
    // Check for script errors
    if (window.onerror) {
        console.log('Error handler is set');
    }
    
    // List all loaded scripts
    console.log('Scripts loaded on this page:');
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        console.log(`- ${scripts[i].src || 'inline script'}`);
    }
});

// Set up error handler
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.log('Error occurred:', msg);
    console.log('URL:', url);
    console.log('Line:', lineNo, 'Column:', columnNo);
    if (error) {
        console.log('Error object:', error);
    }
    return false;
};

console.log('Debug script initialization complete');
