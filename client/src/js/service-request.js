// This file should only contain frontend logic for service requests.
// Remove backend (Express, DB) code. Use fetch to interact with backend API.

// Example: Submit a service request from the frontend
async function submitServiceRequest(data) {
    try {
        // Validate required fields
        if (!data.printer_id || !data.priority || !data.description) {
            throw new Error('Missing required fields');
        }

        // Send request to backend API
        const token = localStorage.getItem('token');
        const response = await fetch('/api/service-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || result.message || 'Failed to create service request');
        }
        return result;
    } catch (error) {
        // Provide specific error feedback
        console.error('Service request error:', error);
        throw error;
    }
}