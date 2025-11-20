# Brand Selection Workflow - Complete Guide

## How It Works

### Step-by-Step User Flow

1. **Technician opens "Complete Service" modal**
   - System automatically fetches all parts from technician's inventory
   - Brand selector is populated with unique brands
   - Part selector remains DISABLED (grayed out)

2. **Technician selects a brand (e.g., "Epson")**
   - Brand selector shows: HP, Canon, Epson, Brother, etc.
   - When brand is selected:
     - Part selector becomes ENABLED
     - Parts are filtered to show ONLY items from that brand
     - Parts are grouped by category (toner, drum, ink, etc.)

3. **Technician selects a part/consumable**
   - Part dropdown now shows only Epson parts
   - Each option displays: "Part Name - Available: X pieces"
   - When part is selected:
     - Stock info badge appears with:
       - Available quantity
       - Brand name
       - Category
     - Quantity input becomes enabled
     - Max quantity is set to available stock

4. **Technician enters quantity**
   - Input is validated against available stock
   - Cannot exceed available quantity

5. **Can add multiple parts**
   - Click "Add Another Part/Consumable"
   - Each part entry has its own brand selector
   - Each part entry filters independently

## Technical Implementation

### Frontend Changes

#### HTML Structure
```html
<!-- Brand selector comes FIRST -->
<select class="part-brand-select">
    <option value="">Choose brand first...</option>
    <option value="HP">HP</option>
    <option value="Epson">Epson</option>
    <!-- etc -->
</select>

<!-- Part selector is DISABLED until brand is selected -->
<select class="part-name-select" disabled>
    <option value="">Select brand first...</option>
</select>
```

#### JavaScript Functions

**1. `loadAvailableParts()`**
- Called when completion modal opens
- Fetches: `/api/technician/parts`
- Stores parts in `availableParts` array
- Calls `updatePartSelectors()`

**2. `updatePartSelectors()`**
- Calls `updateBrandSelectors()` to populate brand dropdowns
- Does NOT populate part selectors (they stay disabled)

**3. `updateBrandSelectors()`**
- Extracts unique brands from `availableParts`
- Populates all brand selector dropdowns
- Sorts brands alphabetically

**4. `updatePartsForBrand(brandSelector, selectedBrand)`**
- **Triggered when**: Brand is changed
- **Actions**:
  - Resets part selector to empty
  - If no brand: disables part selector
  - If brand selected:
    - Filters `availableParts` by brand
    - Groups filtered parts by category
    - Populates part selector with filtered results
    - Enables part selector
- **Result**: Part dropdown shows ONLY parts for selected brand

**5. `setupPartEntryHandlers(entry)`**
- Sets up event listeners for each part entry
- **Brand change handler**:
  ```javascript
  brandSelect.addEventListener('change', function() {
      const selectedBrand = this.value;
      // Reset part selection
      partSelect.value = '';
      partSelect.disabled = !selectedBrand;
      // Update parts for selected brand
      updatePartsForBrand(this, selectedBrand);
  });
  ```

- **Part change handler**:
  - Gets stock info from selected option
  - Gets brand from dataset
  - Shows stock badge with brand info
  - Enables quantity input

### Backend API

**Endpoint**: `GET /api/technician/parts`

**Query**:
```sql
SELECT ti.id, ti.part_id, pp.name, pp.brand, pp.category, 
       ti.quantity as stock, pp.unit
FROM technician_inventory ti
JOIN printer_parts pp ON ti.part_id = pp.id
WHERE ti.technician_id = ? AND ti.quantity > 0
ORDER BY pp.brand, pp.category, pp.name
```

**Returns**: Array of parts with brand information
```json
[
  {
    "id": 1,
    "part_id": 5,
    "name": "Toner Cartridge Black",
    "brand": "Epson",
    "category": "toner",
    "stock": 15,
    "unit": "pieces"
  },
  {
    "id": 2,
    "part_id": 8,
    "name": "Toner Cartridge Cyan",
    "brand": "HP",
    "category": "toner",
    "stock": 10,
    "unit": "pieces"
  }
]
```

**Submission**: When form is submitted, includes brand:
```json
{
  "actions": "Replaced toner cartridge",
  "parts": [
    {
      "name": "Toner Cartridge Black",
      "brand": "Epson",
      "qty": 2,
      "unit": "pieces"
    }
  ]
}
```

## Visual States

### Initial State (No Brand Selected)
```
┌─────────────────────────────────────┐
│ Select Brand First                  │
│ ┌─────────────────────────────────┐ │
│ │ Choose brand first... ▼         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Select Part/Consumable              │
│ ┌─────────────────────────────────┐ │
│ │ Select brand first... ▼ [DISABLED]│
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Brand Selected (Parts Filtered)
```
┌─────────────────────────────────────┐
│ Select Brand First                  │
│ ┌─────────────────────────────────┐ │
│ │ Epson ▼                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Select Part/Consumable              │
│ ┌─────────────────────────────────┐ │
│ │ Toner Cartridge Black ▼ [ENABLED]│
│ │ ┌─ Toner ──────────────────────┐│ │
│ │ │ • Toner Black - Avail: 15   ││ │
│ │ │ • Toner Cyan - Avail: 10    ││ │
│ │ └──────────────────────────────┘│ │
│ │ ┌─ Ink ────────────────────────┐│ │
│ │ │ • Ink Bottle Black - 5      ││ │
│ │ └──────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Part Selected (Stock Info Shown)
```
┌─────────────────────────────────────┐
│ Select Brand First                  │
│ ┌─────────────────────────────────┐ │
│ │ Epson ▼                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Select Part/Consumable              │
│ ┌─────────────────────────────────┐ │
│ │ Toner Cartridge Black ▼         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌──────────────────────────────────┐│
│ │ ✓ Available: 15 pieces • Epson  ││
│ └──────────────────────────────────┘│
│                                     │
│ Quantity                Unit        │
│ ┌────────┐           ┌──────────┐  │
│ │   2    │           │ Pieces ▼ │  │
│ └────────┘           └──────────┘  │
└─────────────────────────────────────┘
```

## Key Features

### ✅ Progressive Disclosure
- Brand selector is always enabled
- Part selector disabled until brand chosen
- Quantity input disabled until part chosen

### ✅ Smart Filtering
- Parts filtered by selected brand in real-time
- Grouped by category for easy browsing
- Shows stock availability immediately

### ✅ Data Validation
- Frontend validates against available stock
- Backend validates brand + name combination
- Clear error messages with brand info

### ✅ Visual Feedback
- Color-coded stock badges (green/orange/red)
- Disabled states clearly visible
- Brand displayed in multiple places

### ✅ Multi-Part Support
- Each part entry independent
- Can mix brands across entries
- Summary shows all parts with brands

## Benefits

1. **Prevents Confusion**: Can't select parts before choosing brand
2. **Reduces Errors**: Only shows relevant parts for chosen brand
3. **Better UX**: Clear step-by-step process
4. **Accurate Inventory**: Validates exact brand/part combination
5. **Audit Trail**: Brand information saved in service records

## Testing Checklist

- [ ] Brand dropdown populates with unique brands
- [ ] Part dropdown disabled when no brand selected
- [ ] Part dropdown enabled when brand selected
- [ ] Parts filtered correctly by brand
- [ ] Stock info shows correct brand
- [ ] Can select different brands for multiple parts
- [ ] Validation checks correct brand inventory
- [ ] Submission includes brand information
- [ ] Service notes include brand in database

## Files Modified

1. `server/routes/technician-service-requests.js` - Added brand to API response and validation
2. `client/src/pages/technician/requests.html` - Added brand selector before part selector
3. `client/src/pages/technician/requests.js` - Added brand filtering logic
4. `test_brand_selection.html` - Standalone test page for validation

## Date Implemented
October 19, 2025
