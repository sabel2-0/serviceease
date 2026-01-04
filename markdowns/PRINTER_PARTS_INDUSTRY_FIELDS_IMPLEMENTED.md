# Printer Parts Inventory - Industry Standard Fields Implementation

## Summary
Fixed the printer parts inventory system to properly handle industry-standard fields that were displayed in the UI but not being saved to the database.

## Problem
The admin interface for adding printer parts had input fields for:
- **Page Yield** - for toner, ink cartridges, and drum cartridges
- **Ink Volume** - for ink bottles (in milliliters)
- **Color** - for ink and toner (black, cyan, magenta, yellow, etc.)

However, these fields were:
1. Not being sent from the frontend to the backend
2. Not being stored in the database
3. Not being handled by the backend API

## Solution Implemented

### 1. Database Schema Updates
Added three new columns to the `printer_parts` table:

```sql
- page_yield INT DEFAULT NULL
  Comment: 'Approximate number of pages the consumable can print'
  
- ink_volume DECIMAL(10,2) DEFAULT NULL
  Comment: 'Volume of ink in milliliters for ink bottles'
  
- color VARCHAR(50) DEFAULT NULL
  Comment: 'Color of ink/toner (black, cyan, magenta, yellow, etc.)'
```

### 2. Backend API Updates (`server/routes/parts.js`)
- **GET endpoint**: Now retrieves `page_yield`, `ink_volume`, and `color` fields
- **POST endpoint**: Accepts and validates these fields with proper type conversion
  - `page_yield`: Converted to INTEGER
  - `ink_volume`: Converted to DECIMAL (supports values like 100.5 ml)
  - `color`: Stored as VARCHAR string
- **PUT endpoint**: Supports updating these fields with proper validation

### 3. Frontend JavaScript Updates (`client/src/js/inventory-parts.js`)
- **getFormData()**: Now extracts and includes the new fields based on category:
  - Page yield for: `toner`, `ink`, `drum-cartridge`
  - Ink volume for: `ink-bottle`
  - Color for: `ink`, `ink-bottle`, `toner`
- **populateForm()**: Now populates these fields when editing existing parts

### 4. Automatic Migration
Added automatic database migration that runs on server startup:
- Checks if columns already exist before attempting to add them
- Adds only missing columns to avoid errors on subsequent starts
- Provides console feedback on migration progress
- Non-blocking - server starts even if migration fails

## Industry Standards Implemented

### Page Yield
- **Purpose**: Standard metric in the printer industry indicating how many pages a consumable can print
- **Typical values**: 
  - Standard toner: 1,500 - 3,000 pages
  - High-yield toner: 5,000 - 12,000 pages
  - Ink cartridges: 200 - 600 pages
- **Categories**: Toner, Ink Cartridges, Drum Cartridges

### Ink Volume
- **Purpose**: Volume of ink in bottles (measured in milliliters)
- **Typical values**: 50ml, 70ml, 100ml, 135ml
- **Categories**: Ink Bottles

### Color
- **Purpose**: Essential for matching and ordering the correct consumable
- **Common values**: 
  - Black
  - Cyan
  - Magenta
  - Yellow
  - Light Cyan
  - Light Magenta
  - Photo Black
- **Categories**: Ink, Ink Bottles, Toner

## Testing Checklist

 Server starts without errors
 Database migration runs successfully
 New columns added to printer_parts table
 Admin can add parts with page yield
 Admin can add parts with ink volume
 Admin can add parts with color
 Values are properly saved to database
 Values display correctly when editing existing parts
 Audit log action_type enum fixed (activate/deactivate added)

## Files Modified

1. `server/routes/parts.js` - Backend API endpoints
2. `client/src/js/inventory-parts.js` - Frontend form handling
3. `server/config/printer_parts_schema.sql` - Schema definition
4. `server/index.js` - Added automatic migration on startup

## Files Created

1. `add_printer_parts_industry_fields.sql` - Migration SQL script
2. `fix_audit_logs_action_type.sql` - Audit logs enum fix

## Additional Fixes

Fixed audit_logs table `action_type` ENUM to include:
- `activate` - for institution activation logging
- `deactivate` - for institution deactivation logging

This resolves the "Data truncated for column 'action_type' at row 1" error when activating/deactivating institutions.

## Benefits

1. **Complete Data Capture**: All printer consumable specifications are now properly stored
2. **Industry Compliance**: Follows printer industry standards for product specifications
3. **Better Inventory Management**: Page yield and volume help predict replacement needs
4. **Accurate Ordering**: Color information prevents ordering mistakes
5. **Automatic Migration**: No manual database changes needed on deployment
