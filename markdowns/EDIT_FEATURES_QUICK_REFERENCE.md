# Printer Inventory Edit Features - Quick Reference

## Two Types of Edit Functionality

### 🟢 Edit Printer Model (Emerald Green)
**Location**: Main Inventory Table  
**Button**: Emerald green "Edit" button  
**What it edits**: Brand and Model name  
**Scope**: ALL units of that printer model  

**Example**:
```
Before: HP Laser Pro 213 (3 units)
Action: Edit Model → Change to "HP LaserJet Pro M213"
After:  HP LaserJet Pro M213 (3 units) ← All 3 units updated
```

**Use When**:
- Fixing typos in model name
- Renaming entire product line
- Standardizing naming conventions
- Affects multiple printers

---

### 🟣 Edit Printer Unit (Purple)
**Location**: View Printers Modal  
**Button**: Purple "Edit" button  
**What it edits**: Serial Number only  
**Scope**: SINGLE specific unit  

**Example**:
```
Unit 1: ABC1234 → Edit → ABC1235 ← Only this unit changes
Unit 2: XYZ5678 → No change
Unit 3: DEF9012 → No change
```

**Use When**:
- Correcting individual serial numbers
- Updating after printer replacement
- Fixing data entry errors
- Affects one printer only

---

## Visual Workflow

### Edit Model Workflow
```
Main Inventory Page
    ↓
[HP Laser Pro 213] → [🟢 Edit] Button
    ↓
Emerald Modal Opens
    ↓
Brand: [HP___________] ✏️ Editable
Model: [Laser Pro 213] ✏️ Editable
    ↓
Change to "HP LaserJet Pro M213"
    ↓
[Save Changes]
    ↓
ALL units now show "HP LaserJet Pro M213"
```

### Edit Unit Workflow
```
Main Inventory Page
    ↓
[HP Laser Pro 213] → [View Printers] Button
    ↓
View Printers Modal Opens
    ↓
Serial: ABC1234 → [🟣 Edit] Button
    ↓
Purple Modal Opens
    ↓
Brand: [HP___________]  Read-only
Model: [Laser Pro 213]  Read-only
Serial: [ABC1234______] ✏️ Editable
    ↓
Change to "ABC1235"
    ↓
[Save Changes]
    ↓
ONLY this unit's serial number changes
```

---

## Quick Comparison Table

| Feature | Edit Model (🟢) | Edit Unit (🟣) |
|---------|----------------|----------------|
| **Button Location** | Main table | View Printers modal |
| **Color** | Emerald green | Purple |
| **Edits Brand** |  Yes |  No (read-only) |
| **Edits Model** |  Yes |  No (read-only) |
| **Edits Serial** |  No |  Yes |
| **Affects** | All units | Single unit |
| **Use Case** | Model renaming | Serial correction |

---

## Field Editing Matrix

| Field | Edit Model | Edit Unit |
|-------|-----------|-----------|
| Brand | ✏️ Editable |  Read-only |
| Model | ✏️ Editable |  Read-only |
| Serial Number | ➖ N/A | ✏️ Editable |
| Status | ➖ Unchanged | ➖ Unchanged |
| Location | ➖ Unchanged | ➖ Unchanged |
| Assignments | ➖ Preserved | ➖ Preserved |

---

## Color Coding Guide

### 🟢 Emerald (Edit Model)
- Button: Emerald background
- Modal: Emerald gradient header
- Focus: Emerald ring
- Use: Bulk model updates

### 🟣 Purple (Edit Unit)
- Button: Purple background
- Modal: Purple gradient header
- Focus: Purple ring
- Use: Individual serial updates

### 🔵 Blue (View/Add)
- View Printers: Blue button
- Add Unit: Blue button
- Non-destructive actions

---

## Examples

### Example 1: Model Name Correction
**Scenario**: All units have wrong model name  
**Solution**: Use **Edit Model** (🟢)  
**Steps**:
1. Main page → Find model
2. Click emerald "Edit" button
3. Change model name
4. All 5 units updated 

### Example 2: Single Serial Number Fix
**Scenario**: One printer has typo in serial  
**Solution**: Use **Edit Unit** (🟣)  
**Steps**:
1. Main page → View Printers
2. Find the unit with wrong serial
3. Click purple "Edit" button
4. Fix serial number
5. Only that unit updated 

### Example 3: Bulk Rebranding
**Scenario**: Company switched from "Canon" to "Brother"  
**Solution**: Use **Edit Model** (🟢)  
**Steps**:
1. Main page → Find Canon models
2. Click emerald "Edit" button
3. Change brand to "Brother"
4. All units rebranded 

### Example 4: Printer Replacement
**Scenario**: Replaced faulty printer, new serial number  
**Solution**: Use **Edit Unit** (🟣)  
**Steps**:
1. Main page → View Printers
2. Find the replaced unit
3. Click purple "Edit" button
4. Enter new serial
5. Unit updated with new serial 

---

## Quick Tips

###  Do's
- Use Edit Model for naming corrections
- Use Edit Unit for serial updates
- Check the info banner in modals
- Verify changes after saving

###  Don'ts
- Don't use Edit Model for single units
- Don't use Edit Unit to change models
- Don't forget which modal you're in
- Don't skip verification

---

## Keyboard Shortcuts

Both modals support:
- `Escape` - Close modal
- `Tab` - Navigate fields
- `Enter` - Submit form (in input fields)

---

## Visual Indicators

### Read-Only Fields
- **Appearance**: Gray background
- **Cursor**: Not-allowed icon
- **Text**: Slightly dimmed
- **Purpose**: Show context, prevent editing

### Editable Fields
- **Appearance**: White background
- **Cursor**: Text cursor
- **Border**: Colored on focus
- **Purpose**: Accept user input

---

## Access Locations

### Edit Model Button
```
Printer Inventory (Main Page)
    ↓
┌─────────────────────────────────────────────┐
│ Brand/Model  │ Actions                      │
├──────────────┼──────────────────────────────┤
│ HP           │ [🟢 Edit] [View] [Add]       │
│ Laser Pro    │                              │
└─────────────────────────────────────────────┘
```

### Edit Unit Button
```
Printer Inventory (Main Page)
    ↓ Click "View Printers"
View Printers Modal
    ↓
┌─────────────────────────────────────────────┐
│ Serial   │ Status │ Institution │ Actions   │
├──────────┼────────┼─────────────┼───────────┤
│ ABC1234  │ Avail. │ Not assign. │ [🟣 Edit] │
└─────────────────────────────────────────────┘
```

---

## Remember

🟢 **EMERALD = EDIT MODEL** = All Units  
🟣 **PURPLE = EDIT UNIT** = Single Unit  

Choose wisely! 
