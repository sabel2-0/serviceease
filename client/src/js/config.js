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

// Export the API base URL
const API_BASE_URL = getApiUrl();
const WS_BASE_URL = getWebSocketUrl();

console.log('API Configuration:', { API_BASE_URL, WS_BASE_URL, hostname: window.location.hostname });
