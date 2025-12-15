/**
 * Inventory Helper Functions
 * Provides utility functions for fetching and working with inventory data
 */

/**
 * Fetches details for a specific inventory item by ID
 * @param {number} inventoryItemId - The ID of the inventory item to fetch
 * @returns {Promise<object>} - Promise resolving to the inventory item details
 */
function fetchInventoryItemById(inventoryItemId) {
    console.log(`Fetching inventory item details for ID: ${inventoryItemId}`);
    return fetch(`/api/inventory-items/${inventoryItemId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch inventory item: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Retrieved inventory item #${inventoryItemId} details:`, data);
            return data;
        })
        .catch(error => {
            console.error(`Error fetching inventory item #${inventoryItemId}:`, error);
            throw error;
        });
}

/**
 * Fetches all inventory items and returns them as a map keyed by ID
 * @returns {Promise<object>} - Promise resolving to a map of inventory items by ID
 */
function fetchInventoryItemsAsMap() {
    console.log('Fetching all inventory items');
    return fetch('/api/inventory-items')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch inventory items: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(items => {
            const itemsMap = {};
            items.forEach(item => {
                itemsMap[item.id] = item;
            });
            console.log(`Retrieved ${items.length} inventory items as map`);
            return itemsMap;
        })
        .catch(error => {
            console.error('Error fetching inventory items:', error);
            throw error;
        });
}

/**
 * Enriches service requests with printer details from inventory items
 * @param {Array} requests - Array of service requests
 * @returns {Promise<Array>} - Promise resolving to enhanced service requests
 */
function enrichServiceRequestsWithInventoryDetails(requests) {
    // Collect all unique inventory item IDs
    const inventoryItemIds = [...new Set(
        requests
            .filter(req => req.printer_id)
            .map(req => req.printer_id)
    )];
    
    if (inventoryItemIds.length === 0) {
        console.log('No inventory items to fetch for these requests');
        return Promise.resolve(requests);
    }
    
    console.log(`Need to fetch details for ${inventoryItemIds.length} unique inventory items`);
    
    return fetchInventoryItemsAsMap()
        .then(inventoryMap => {
            return requests.map(req => {
                if (req.printer_id && inventoryMap[req.printer_id]) {
                    const inventoryItem = inventoryMap[req.printer_id];
                    console.log(`Enhancing request #${req.id} with inventory item #${req.printer_id} details`);
                    
                    return {
                        ...req,
                        printer_name: inventoryItem.name || req.printer_name,
                        brand: inventoryItem.brand || req.brand,
                        model: inventoryItem.model || req.model || req.equipment_model,
                        serial_number: inventoryItem.serial_number || req.serial_number || req.equipment_serial,
                        printer_full_details: `${inventoryItem.name || 'Printer'} (${inventoryItem.brand || ''} ${inventoryItem.model || ''} SN:${inventoryItem.serial_number || 'N/A'})`,
                        inventory_details: inventoryItem // Include the full inventory item
                    };
                }
                return req;
            });
        });
}

// Export functions if running in a module environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchInventoryItemById,
        fetchInventoryItemsAsMap,
        enrichServiceRequestsWithInventoryDetails
    };
}







