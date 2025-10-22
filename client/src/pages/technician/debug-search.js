// Debug search functionality
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('🔍 Debug: Checking search components...');
        
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
        console.log('✅ Fixed missing requestsPageLoaded and refreshRequestsPage');
        
        // Check if elements exist
        const searchOverlay = document.getElementById('search-overlay');
        const searchResults = document.getElementById('search-results');
        const searchInput = document.getElementById('search-input');
        const searchBtnMobile = document.getElementById('search-requests-btn');
        const searchBtnDesktop = document.getElementById('search-requests-btn-desktop');
        const closeBtn = document.getElementById('close-search-overlay');
        
        console.log('Search overlay:', !!searchOverlay);
        console.log('Search results container:', !!searchResults);
        console.log('Search input:', !!searchInput);
        console.log('Mobile search btn:', !!searchBtnMobile);
        console.log('Desktop search btn:', !!searchBtnDesktop);
        console.log('Close btn:', !!closeBtn);
        
        // Check if data is loaded
        console.log('Search data loaded:', !!window._allServiceRequests, window._allServiceRequests ? window._allServiceRequests.length : 'N/A');
        
        // Add click handlers for search buttons
        const searchButtons = [searchBtnMobile, searchBtnDesktop].filter(Boolean);
        searchButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                console.log(`🔍 Search button ${index + 1} clicked`);
                if (searchOverlay) {
                    searchOverlay.classList.remove('hidden');
                    console.log('✅ Search overlay opened');
                    
                    // Focus the input
                    setTimeout(() => {
                        if (searchInput) {
                            searchInput.focus();
                            console.log('✅ Search input focused');
                        }
                    }, 100);
                    
                    // Show initial results if data is available
                    if (window._allServiceRequests && window._allServiceRequests.length > 0) {
                        const limitedResults = window._allServiceRequests.slice(0, 10);
                        if (window.renderFilteredServiceRequests) {
                            window.renderFilteredServiceRequests(limitedResults);
                            console.log('✅ Initial results displayed');
                        }
                    }
                } else {
                    console.log('❌ Search overlay not found');
                }
            });
            console.log(`✅ Added click handler to search button ${index + 1}`);
        });
        
        // Add close button handler
        if (closeBtn && searchOverlay) {
            closeBtn.addEventListener('click', () => {
                console.log('🔍 Close button clicked');
                searchOverlay.classList.add('hidden');
                if (searchInput) searchInput.value = '';
                console.log('✅ Search overlay closed');
            });
            console.log('✅ Added close button handler');
        }
        
        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchOverlay && !searchOverlay.classList.contains('hidden')) {
                console.log('🔍 ESC key pressed');
                searchOverlay.classList.add('hidden');
                if (searchInput) searchInput.value = '';
                console.log('✅ Search overlay closed with ESC');
            }
        });
        
        // Add search input functionality
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                console.log('🔍 Search query:', query);
                
                // Clear previous timeout
                clearTimeout(searchTimeout);
                
                // Debounce the search to avoid too many updates
                searchTimeout = setTimeout(() => {
                    if (!window._allServiceRequests) {
                        console.log('❌ No search data available');
                        return;
                    }
                    
                    let filteredResults;
                    if (query === '') {
                        // Show all results if search is empty
                        filteredResults = window._allServiceRequests.slice(0, 10);
                        console.log('📋 Showing all results');
                    } else {
                        // Filter results based on search query
                        filteredResults = window._allServiceRequests.filter(request => {
                            const searchText = [
                                request.issue || '',
                                request.description || '',
                                request.institution_name || '',
                                request.client_name || '',
                                request.request_number || '',
                                request.status || ''
                            ].join(' ').toLowerCase();
                            
                            return searchText.includes(query);
                        });
                        console.log(`🔍 Found ${filteredResults.length} results for "${query}"`);
                    }
                    
                    // Render the filtered results
                    if (window.renderFilteredServiceRequests) {
                        window.renderFilteredServiceRequests(filteredResults);
                    }
                }, 150); // 150ms debounce
            });
            console.log('✅ Added search input functionality');
        }
        
        // Create a simple render function since the original isn't accessible
        window.renderFilteredServiceRequests = function(requests) {
            console.log('🎨 Rendering', requests.length, 'requests');
            const searchResults = document.getElementById('search-results');
            const searchCount = document.getElementById('search-count');
            
            if (!searchResults) return;
            
            searchResults.innerHTML = '';
            
            if (requests.length === 0) {
                searchResults.innerHTML = `
                    <div class="p-8 text-center">
                        <div class="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.512.901-6.127 2.387l-.296.296C5.211 18.049 5.593 19 6.414 19h11.172c.821 0 1.203-.951.837-1.317l-.296-.296A7.962 7.962 0 0112 15z"/>
                            </svg>
                        </div>
                        <h3 class="font-semibold text-slate-800 mb-1">No requests found</h3>
                        <p class="text-sm text-slate-500">Try a different search term</p>
                    </div>
                `;
            } else {
                requests.forEach(request => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-b-0';
                    resultItem.onclick = () => {
                        if (window.viewServiceRequest) {
                            window.viewServiceRequest(request.id);
                        }
                        document.getElementById('search-overlay').classList.add('hidden');
                    };
                    
                    resultItem.innerHTML = `
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0 mt-1">
                                <div class="w-2 h-2 rounded-full bg-blue-400"></div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs font-medium text-slate-600">${request.request_number || '#' + request.id}</span>
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                        ${request.status || 'New'}
                                    </span>
                                </div>
                                <h4 class="font-semibold text-slate-900 mb-1 line-clamp-1">${request.issue || request.description || 'No description'}</h4>
                                <div class="flex items-center gap-4 text-sm text-slate-500">
                                    <span class="flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                                        ${request.institution_name || request.client_name || 'Unknown location'}
                                    </span>
                                </div>
                            </div>
                            <div class="flex-shrink-0 text-xs text-slate-400">
                                ${request.created_at || ''}
                            </div>
                        </div>
                    `;
                    searchResults.appendChild(resultItem);
                });
            }
            
            // Update search count
            if (searchCount) {
                searchCount.textContent = requests.length === 0 ? 'No results' : `${requests.length} result${requests.length === 1 ? '' : 's'}`;
            }
        };
        
        console.log('✅ Created global renderFilteredServiceRequests function');
        
    }, 1500); // Run before the retry mechanism starts
});