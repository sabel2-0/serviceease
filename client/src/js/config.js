// API Configuration
// Automatically detects if running on localhost or production

const getApiUrl = () => {
    // Check if we're on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production backend URL
    return 'https://serviceease-mkie.onrender.com';
};

const getWebSocketUrl = () => {
    // Check if we're on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:3000';
    }
    // Production WebSocket URL (wss for secure)
    return 'wss://serviceease-mkie.onrender.com';
};

// Export the API base URL (with and without /api suffix)
const API_BASE_URL = getApiUrl() + '/api';  // For files that expect /api in the base URL
const API_URL = getApiUrl();  // For files that add /api in their fetch calls
const WS_BASE_URL = getWebSocketUrl();

console.log('API Configuration:', { API_BASE_URL, API_URL, WS_BASE_URL, hostname: window.location.hostname });








