# Partial Consumption Tracking - Complete Implementation

## Overview
Full implementation of partial consumption tracking for ink bottles/cartridges and toner cartridges across all service types (maintenance services and service requests) and all user role views.

## What Was Implemented

### 1. Database Schema (SQL Migration Required)
**File:** `add_partial_consumption_tracking.sql`

**New Columns in `service_items_used`:**
- `consumption_type` ENUM('full','partial') - Tracks if item was fully used or partially consumed
- `amount_consumed` DECIMAL(10,2) - Actual ml or grams consumed

**New Columns in `printer_items`:**
- `remaining_volume` DECIMAL(10,2) - Remaining ml for opened ink bottles/cartridges
- `remaining_weight` DECIMAL(10,2) - Remaining grams for opened toner cartridges
- `is_opened` TINYINT(1) - Flag to mark if item has been opened

**⚠️ IMPORTANT: You must run this SQL file in MySQL before testing the feature!**

### 2. Maintenance Services (COMPLETE)

#### Frontend - Technician Clients
**File:** `client/src/components/technician-clients-content.html`
- Lines 1540-1595: Consumption fields UI (Full/Partial toggle, amount input)
- Lines 1357-1449: Updated `selectVSPartFromCard` to fetch item capacity and show consumption fields
- Lines 1451-1486: Added `selectVSConsumptionType` handler function
- Lines 1840-1870: Updated items collection to include `consumption_type` and `amount_consumed`

#### Backend - Maintenance Services
**File:** `server/routes/maintenance-services.js`
- Lines 628-688: Updated INSERT to save consumption_type and amount_consumed
- Added partial consumption logic to update remaining_volume/remaining_weight
- Lines 67-88: Enhanced history query to return consumption data with display_amount

### 3. Service Requests (NEW - COMPLETE)

#### Frontend - Technician Service Requests
**File:** `client/src/pages/technician/requests.html`
- Lines 569-620: Added consumption fields HTML (Full/Partial toggle, amount input, capacity display)

**File:** `client/src/pages/technician/requests.js`
- Lines 2454-2507: Added `selectSRConsumptionType` handler function
- Lines 2509-2608: Added `selectSRPartFromCard` to fetch item details and show consumption fields
- Lines 2723-1741: Updated card creation to include itemId
- Lines 1793-1801: Added itemId to option element
- Lines 1818-1822: Trigger selectSRPartFromCard when item selected
- Lines 2636-2650: Updated parts collection to include consumption data

#### Backend - Service Requests Completion
**File:** `server/routes/technician-service-requests.js`
- Lines 519-576: Updated INSERT query to include consumption_type and amount_consumed
- Added partial consumption logic to update remaining_volume/remaining_weight when partial
- Handles both ink (volume) and toner (weight) consumption tracking

### 4. Institution Admin Views (UPDATED)

**File:** `server/routes/institution-admin-service-approvals.js`
- Lines 131-153: Updated parts_used query to include consumption fields
- Added display_amount calculation (e.g., "50ml", "100grams")
- Shows consumption data when viewing service request history/approvals

### 5. Institution User Views (UPDATED)

**File:** `server/routes/service-requests.js`
- Lines 502-533: Updated parts_used query to include consumption fields
- Added display_amount calculation for history display
- Institution users can now see actual consumption amounts in their request history

## How It Works

### User Flow - Technician Side

1. **Select Item**: When technician selects an ink/toner item, system fetches capacity
2. **Show Consumption Fields**: If item has ink_volume or toner_weight, consumption fields appear
3. **Choose Type**:
   - **Full Consumption**: Auto-calculates amount (quantity × capacity)
   - **Partial Consumption**: Technician enters actual ml/grams used
4. **Submit**: Data saved to service_items_used table
5. **Inventory Update**: If partial, updates remaining_volume/remaining_weight in printer_items

### Display Format

- Full consumption: Shows total amount (e.g., "200ml" for 2 bottles of 100ml each)
- Partial consumption: Shows actual amount used (e.g., "50ml" if only 50ml from 100ml bottle)
- Display includes unit (ml for ink, grams for toner)

### Database Logic

```sql
-- For full consumption
amount_consumed = quantity_used × capacity

-- For partial consumption
amount_consumed = user_input_value
remaining_amount = capacity - amount_consumed
```

## Files Modified Summary

### Frontend
1. ✅ `client/src/components/technician-clients-content.html` - Maintenance services UI
2. ✅ `client/src/pages/technician/requests.html` - Service requests UI
3. ✅ `client/src/pages/technician/requests.js` - Service requests JavaScript handlers

### Backend
1. ✅ `server/routes/maintenance-services.js` - Maintenance services completion
2. ✅ `server/routes/technician-service-requests.js` - Service requests completion
3. ✅ `server/routes/institution-admin-service-approvals.js` - Admin approval views
4. ✅ `server/routes/service-requests.js` - User history views

### Database
1. ⏳ `add_partial_consumption_tracking.sql` - **NOT YET RUN** (must run manually)

## Testing Checklist

### Prerequisites
- [ ] Run `add_partial_consumption_tracking.sql` in MySQL Workbench
- [ ] Run `add_toner_weight_ink_volume_paper_categories.sql` if not already run
- [ ] Restart Render service after deploying code changes

### Maintenance Services
- [ ] Select ink bottle/cartridge - consumption fields should appear
- [ ] Select toner cartridge - consumption fields should appear  
- [ ] Select printer part (non-consumable) - consumption fields should NOT appear
- [ ] Choose "Full" - amount should auto-calculate based on quantity
- [ ] Choose "Partial" - amount input should appear
- [ ] Complete service and verify data saved correctly
- [ ] Check history view shows consumption amounts (e.g., "50ml", "100grams")

### Service Requests
- [ ] Select ink bottle/cartridge - consumption fields should appear
- [ ] Select toner cartridge - consumption fields should appear
- [ ] Choose "Full" - amount should auto-calculate
- [ ] Choose "Partial" - amount input should appear
- [ ] Complete request and verify data saved
- [ ] Verify partial consumption updates remaining_volume/remaining_weight

### Institution Admin Views
- [ ] View service request approval - should show consumption amounts
- [ ] History shows "50ml" or "100grams" format (not just quantity)
- [ ] Partial vs full consumption clearly visible

### Institution User Views
- [ ] View service request history
- [ ] Items used show consumption amounts
- [ ] Display format matches admin views

## Git Commits

1. **Commit 17df229**: "Implement partial consumption tracking for ink/toner - full feature"
   - Full maintenance services implementation
   
2. **Commit f6edb51**: "Extend partial consumption tracking to service requests and all user views"
   - Service requests implementation
   - Institution admin and user views
   - Complete feature across all service types

## Next Steps

1. **RUN SQL MIGRATIONS** (Critical!)
   ```sql
   -- In MySQL Workbench:
   USE your_database_name;
   SOURCE add_partial_consumption_tracking.sql;
   SOURCE add_toner_weight_ink_volume_paper_categories.sql;
   ```

2. **Deploy to Render**
   - Push changes to GitHub
   - Render will auto-deploy
   - **Restart the service** after deployment

3. **Test Complete Workflow**
   - Test as technician (both maintenance services and service requests)
   - Test as institution admin (view approvals and history)
   - Test as institution user (view request history)
   - Verify consumption amounts display correctly

4. **Verify Database Updates**
   ```sql
   -- Check if partial consumption is being tracked
   SELECT * FROM service_items_used WHERE consumption_type = 'partial';
   
   -- Check if opened items have remaining amounts
   SELECT * FROM printer_items WHERE is_opened = 1;
   ```

## Feature Benefits

1. **Accurate Inventory**: Track actual consumption, not just quantity used
2. **Cost Tracking**: Know exactly how much ink/toner was consumed per service
3. **Waste Reduction**: Identify if items are being wasted or partially used
4. **Better Planning**: Understand actual consumption patterns for better inventory management
5. **Transparency**: All users can see exact amounts consumed in service history

## Notes

- Feature only applies to items with `ink_volume` or `toner_weight`
- Regular printer parts continue to work as before (quantity only)
- Both full and partial consumption tracked in same tables
- Remaining amounts only updated for partial consumption
- Display format automatically shows ml for ink, grams for toner
