# Brand Selection Feature - Quick Test Guide

## How to Test the Feature

### 1. Login as Technician
- Go to http://localhost:3000
- Login with technician credentials
- Navigate to "Requests" tab

### 2. Test Brand Selection Flow

#### Step 1: Open Complete Service Modal
- Find a service request with status "In Progress"
- Click the "Complete" button
- Modal should open

#### Step 2: Check Initial State
✅ **Expected Behavior:**
- Brand selector: ENABLED with brands (HP, Epson, Canon, etc.)
- Part selector: DISABLED with text "Select brand first..."
- Quantity input: DISABLED

#### Step 3: Select a Brand
- Click the brand dropdown
- Select a brand (e.g., "Epson")

✅ **Expected Behavior:**
- Part selector: Becomes ENABLED
- Part selector: Shows ONLY Epson parts
- Parts grouped by category (Toner, Ink, Drum, etc.)
- Each option shows: "Part Name - Available: X pieces"

#### Step 4: Select a Part
- Click the part dropdown
- Select a part (e.g., "Toner Cartridge Black")

✅ **Expected Behavior:**
- Stock info badge appears below dropdown
- Badge shows:
  - Green/Orange/Red color based on stock
  - "Available: X pieces"
  - "• Brand: Epson"
  - "• Category"
- Quantity input: Becomes ENABLED
- Max quantity set to available stock

#### Step 5: Enter Quantity
- Enter a quantity (e.g., "2")
- Try entering more than available

✅ **Expected Behavior:**
- Accepts valid quantities
- On submit, validates against stock
- Shows error if quantity exceeds available

#### Step 6: Test Brand Change
- Change the selected brand

✅ **Expected Behavior:**
- Part selector: Resets to "Select part/consumable..."
- Stock info: Clears
- Quantity input: Becomes DISABLED again
- Must select part again

#### Step 7: Add Multiple Parts
- Click "Add Another Part/Consumable"
- Select different brand for second part

✅ **Expected Behavior:**
- New part entry appears
- Each entry has independent brand selector
- Can select different brands for different parts
- Each filters independently

#### Step 8: Check Summary
- Select multiple parts with different brands

✅ **Expected Behavior:**
- Summary panel shows all selected parts
- Each part displays its brand
- Format:
  ```
  Toner Cartridge Black
  Brand: Epson
  → 2 pieces
  
  Ink Bottle
  Brand: HP  
  → 1 bottle
  ```

#### Step 9: Submit for Approval
- Fill in "Actions Performed"
- Click "Submit for Approval"

✅ **Expected Behavior:**
- Success message appears
- Parts are recorded with brand information
- Status changes to "Pending Approval"
- Coordinator receives notification

### 3. Verify in Database

#### Check service_parts_used table
```sql
SELECT * FROM service_parts_used 
WHERE service_request_id = [request_id]
ORDER BY id DESC;
```

✅ **Expected:**
- Records created for each part
- Notes include brand: "Used 2 pieces (Brand: Epson)"

#### Check service_requests table
```sql
SELECT status, resolution_notes 
FROM service_requests 
WHERE id = [request_id];
```

✅ **Expected:**
- Status: "pending_approval"
- resolution_notes: Contains actions performed

### 4. Test Error Cases

#### Test: Insufficient Inventory
1. Select a part with low stock (e.g., 2 available)
2. Enter quantity higher than available (e.g., 5)
3. Try to submit

✅ **Expected:**
- Error toast appears
- Message: "Insufficient inventory for [Part Name] (Brand: [Brand]). Available: 2, Required: 5"
- Part entry highlighted in red
- Form not submitted

#### Test: No Brand Selected
1. Leave brand dropdown on "Choose brand first..."
2. Part selector should remain disabled
3. Cannot select a part

✅ **Expected:**
- Part selector stays disabled
- Gray appearance
- Shows "Select brand first..."

#### Test: Brand Without Parts
1. Select a brand that has no parts in inventory
2. Part selector should show message

✅ **Expected:**
- Part selector enabled but shows:
- "No parts available for this brand"
- Quantity input stays disabled

### 5. Browser Console Checks

Open browser console (F12) and look for:

✅ **Should See:**
```
🔧 Loading available parts from technician inventory...
Parts API response status: 200
✅ Loaded parts: [array of parts with brands]
🔧 Updating part selectors with X parts
Found Y brand selectors
Updating brand selector 1
Brand selected: Epson
🔧 Updating parts for brand: Epson
✅ Added Z parts for brand Epson
```

❌ **Should NOT See:**
- Any 404 errors
- "Failed to load parts inventory"
- "undefined" brands
- Empty part lists when brand is selected

### 6. Visual Checks

#### Brand Dropdown
- Shows unique brands alphabetically
- No duplicate brands
- No blank/null brands

#### Part Dropdown  
- Disabled initially (gray, no cursor)
- Enabled after brand selection (white, pointer cursor)
- Shows only selected brand's parts
- Parts grouped by category with labels
- Shows stock quantity in each option

#### Stock Info Badge
- Green: Stock > 10
- Orange: Stock < 10
- Red: Stock = 0
- Shows brand name
- Shows category
- Proper formatting

#### Quantity Input
- Disabled until part selected
- Max attribute set correctly
- Number validation works
- Step = 1 (no decimals)

### Quick Debug Commands

```javascript
// In browser console, check parts data:
console.log('Available parts:', availableParts);

// Check unique brands:
console.log('Brands:', [...new Set(availableParts.map(p => p.brand).filter(Boolean))]);

// Check parts for specific brand:
console.log('Epson parts:', availableParts.filter(p => p.brand === 'Epson'));
```

## Common Issues & Solutions

### Issue: Part selector never enables
**Solution:** Check that brands are loading - open console and verify `availableParts` array has items with `brand` property

### Issue: No parts show after selecting brand
**Solution:** Check that parts in database have the brand field populated - run:
```sql
SELECT brand, COUNT(*) FROM printer_parts GROUP BY brand;
```

### Issue: Parts show for wrong brand
**Solution:** Clear browser cache and reload - verify `updatePartsForBrand()` function is filtering correctly

### Issue: Brand shows as "undefined" or "null"
**Solution:** Some parts may not have brand set in database - update printer_parts table:
```sql
UPDATE printer_parts SET brand = 'Generic' WHERE brand IS NULL OR brand = '';
```

## Success Criteria

✅ Feature is working correctly if:
1. Brand must be selected before part can be selected
2. Only parts matching selected brand appear in part dropdown
3. Stock info includes brand name
4. Multiple parts can have different brands
5. Submission includes brand in data
6. Backend validates brand + part combination
7. Service notes include brand information

## Test Date
_____________

## Tested By
_____________

## Test Result
[ ] PASS - All features working as expected
[ ] FAIL - Issues found (list below):

Issues:
_________________________________________________
_________________________________________________
_________________________________________________
