// Quick fix for search freeze issue - just replace the input listener
// This should be added after the main requests.js loads

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            // Remove existing listeners by cloning the element
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            
            // Add the new improved listener
            let searchTimeout;
            newSearchInput.addEventListener('input', e => {
                const query = e.target.value;
                
                // Clear existing timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                // Update search count immediately
                const searchCount = document.getElementById('search-count');
                if (searchCount) {
                    if (!query.trim()) {
                        searchCount.textContent = 'Type to search...';
                    } else {
                        searchCount.textContent = 'Searching...';
                    }
                }
                
                // Debounce with shorter delay for better responsiveness
                searchTimeout = setTimeout(() => {
                    if (window.filterServiceRequests) {
                        window.filterServiceRequests(query);
                    }
                }, 100); // Shorter debounce
            });
            
            // Trigger initial display when search opens
            newSearchInput.addEventListener('focus', () => {
                // If there's data but no current results shown, show initial results
                if (window._allServiceRequests && window._allServiceRequests.length > 0) {
                    const currentQuery = newSearchInput.value.trim();
                    if (!currentQuery) {
                        // Show initial limited results
                        const limitedResults = window._allServiceRequests.slice(0, 10);
                        if (window.renderFilteredServiceRequests) {
                            window.renderFilteredServiceRequests(limitedResults);
                        }
                    }
                }
            });
        }
    }, 1000);
});