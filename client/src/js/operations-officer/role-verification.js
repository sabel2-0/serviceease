// Operations Officer Role Verification
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has operations officer role
    if (!verifyRole(['operations_officer'])) {
        return; // Stop execution if role check fails
    }

    // Verify user is in the correct section
    if (!verifySectionAccess()) {
        return; // Stop execution if section check fails
    }

    // Add click event listeners to all navigation links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.includes('/pages/')) {
                // If it's an internal link, verify it's within the operations officer section
                if (!href.includes('/pages/operations-officer/')) {
                    e.preventDefault();
                    alert('Access denied. You can only access Operations Officer pages.');
                }
            }
        });
    });
});
