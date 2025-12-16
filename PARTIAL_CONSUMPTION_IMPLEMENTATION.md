# Partial Consumption Tracking Implementation

## Overview
This feature enables technicians to track partial consumption of ink/toner items.

Example: A 100ml ink bottle can be used partially (50ml), leaving 50ml remaining in inventory.

## Files to Update

### 1. Database (YOU WILL RUN THIS)
File: `add_partial_consumption_tracking.sql`
- Adds `consumption_type` and `amount_consumed` to `service_items_used`
- Adds `remaining_volume`, `remaining_weight`, `is_opened` to `printer_items`

### 2. Frontend Changes

#### A. Technician Completion Form
File: `client/src/components/technician-clients-content.html`

Add after the Unit field (around line 1560):
```html
<!-- Consumption Type (only for consumables with volume/weight) -->
<div class="vs-consumption-fields hidden">
    <div class="col-span-2 border-t-2 border-slate-200 pt-3 mt-2">
        <label class="block text-sm font-semibold text-slate-700 mb-2">
            <svg class="w-3.5 h-3.5 text-orange-500 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Consumption Type <span class="vs-item-capacity text-xs text-blue-600"></span>
        </label>
        <div class="grid grid-cols-2 gap-2 mb-3">
            <button type="button" class="vs-consumption-full p-3 border-2 border-green-500 bg-green-50 rounded-xl font-semibold text-green-700 hover:bg-green-100 transition-all" onclick="selectConsumptionType(this, 'full')">
                ✓ Full (All Used)
            </button>
            <button type="button" class="vs-consumption-partial p-3 border-2 border-slate-300 bg-white rounded-xl font-semibold text-slate-600 hover:bg-orange-50 hover:border-orange-400 transition-all" onclick="selectConsumptionType(this, 'partial')">
                Partial (Some Used)
            </button>
        </div>
        <input type="hidden" class="vs-consumption-type" value="full">
    </div>
    
    <!-- Amount Consumed Field (shown when partial is selected) -->
    <div class="vs-amount-field hidden col-span-2">
        <label class="block text-sm font-semibold text-slate-700 mb-1.5">
            <svg class="w-3.5 h-3.5 text-orange-500 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            Amount Used <span class="vs-unit-label">(ml/grams)</span>
        </label>
        <input type="number" class="vs-amount-consumed w-full p-3 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 font-semibold text-slate-700" 
               min="0.1" step="0.1" placeholder="e.g., 50">
        <div class="text-xs text-slate-500 mt-1 vs-amount-hint"></div>
    </div>
</div>
```

### 3. Backend Changes

#### A. Update POST /api/maintenance-services
File: `server/index.js` (around line 4450)

Replace items_used saving logic to handle partial consumption.

#### B. Update POST /api/service-requests/complete
Similar changes for service requests.

### 4. Display Changes

Update all history views to show actual ml/grams consumed:
- Technician history
- Institution admin history  
- Institution user history

## Implementation Steps

1. Run SQL migration
2. Update frontend form
3. Update backend routes
4. Update display logic
5. Test with various scenarios

## Test Scenarios

1. Full consumption: 1pc = 100ml consumed, item gone from inventory
2. Partial consumption: 1pc partial 50ml = 50ml consumed, 50ml remains in inventory
3. Multiple partial uses: Use remaining 50ml later

