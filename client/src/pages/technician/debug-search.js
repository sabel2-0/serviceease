// Debug search functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Debug-search.js loaded, waiting for search elements...');
    
    // Wait for the custom event that indicates search elements are ready
    document.addEventListener('searchElementsReady', function() {
        console.log('🎉 Search elements ready event received!');
        setupSearchFunctionality();
    });
    
    // Also try after a delay as fallback
    setTimeout(() => {
        console.log('⏱️ Fallback: Attempting to setup search after delay');
        setupSearchFunctionality();
    }, 2000);
});

function setupSearchFunctionality() {
    console.log('🔧 Setting up search functionality...');
    
    const searchBarContainer = document.getElementById('search-bar-container');
    const searchInput = document.getElementById('search-input');
    const searchBtnMobile = document.getElementById('search-requests-btn');
    const searchBtnDesktop = document.getElementById('search-requests-btn-desktop');
    const clearBtn = document.getElementById('clear-search-btn');
    
    console.log('Elements check:');
    console.log('- Search bar container:', !!searchBarContainer);
    console.log('- Search input:', !!searchInput);
    console.log('- Mobile search btn:', !!searchBtnMobile);
    console.log('- Desktop search btn:', !!searchBtnDesktop);
    console.log('- Clear btn:', !!clearBtn);
    
    if (!searchInput) {
        console.error('❌ Search input not found, cannot setup search');
        return;
    }
    
    // Check if already initialized
    if (searchInput.dataset.searchInitialized === 'true') {
        console.log('⚠️ Search already initialized, skipping');
        return;
    }
    
    // Mark as initialized
    searchInput.dataset.searchInitialized = 'true';
    console.log('✅ Marking search as initialized');
    // Mark as initialized
    searchInput.dataset.searchInitialized = 'true';
    console.log('✅ Marking search as initialized');
    
    // Fix the missing initialization variables to stop retry loop
    window.requestsPageLoaded = true;
    window.refreshRequestsPage = function() {
        console.log('✓ refreshRequestsPage called - loading search data');
        if (window.loadServiceRequestsForSearch && typeof window.loadServiceRequestsForSearch === 'function') {
            window.loadServiceRequestsForSearch().catch(err => {
                console.error('Error loading service requests:', err);
            });
        }
    };
    
    // Focus search input when buttons are clicked (search bar is now always visible)
    const searchButtons = [searchBtnMobile, searchBtnDesktop].filter(Boolean);
    searchButtons.forEach((btn, index) => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`🔍 Search focus button ${index + 1} clicked`);
                if (searchInput) {
                    searchInput.focus();
                    console.log('✅ Search input focused');
                }
            });
            console.log(`✅ Added focus handler to search button ${index + 1}`);
        }
    });
    
    // Add search input filtering functionality
    console.log('✅ Search input found, adding event listener');
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        const searchCount = document.getElementById('search-count');
        
        console.log('🔍 [debug-search] Searching for:', query);
        
        // Get current service requests from the page's global variable
        const currentRequests = window.currentServiceRequests || [];
        console.log('📋 [debug-search] Total requests:', currentRequests.length);
        
        if (!query) {
            // Show all if empty
            if (searchCount) {
                searchCount.textContent = 'Type to filter requests...';
            }
            console.log('✅ [debug-search] Showing all requests');
            if (window.displayServiceRequests) {
                window.displayServiceRequests(currentRequests);
            }
            return;
        }
        
        // Filter requests
        const filtered = currentRequests.filter(request => {
            const searchFields = [
                request.request_number,
                request.issue,
                request.institution_name,
                request.location,
                request.walk_in_customer_name,
                request.printer_brand
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchFields.includes(query);
        });
        
        console.log('🎯 [debug-search] Found', filtered.length, 'matches');
        
        // Update count
        if (searchCount) {
            searchCount.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found`;
        }
        
        // Update display
        if (window.displayServiceRequests) {
            console.log('🎨 [debug-search] Updating display with filtered results');
            window.displayServiceRequests(filtered);
        } else {
            console.error('❌ [debug-search] displayServiceRequests function not found!');
        }
    });
    console.log('✅ Search input listener attached successfully');
    
    // Add clear button handler
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('❌ Clear button clicked');
            searchInput.value = '';
            
            // Trigger input event to reset the display
            searchInput.dispatchEvent(new Event('input'));
        });
        console.log('✅ Clear button handler attached');
    }
    
    // ESC key to clear search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchInput && searchInput.value) {
            console.log('⌨️ ESC pressed');
            searchInput.value = '';
            
            // Trigger input event to reset the display
            searchInput.dispatchEvent(new Event('input'));
        }
    });
    
    console.log('✅✅✅ Search functionality fully initialized!');
}