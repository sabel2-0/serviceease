# NEXT STEPS - Department Refactor

## ⚠️ IMPORTANT: Run SQL Migration First

### Step 1: Execute SQL Migration
1. Open **MySQL Workbench**
2. Connect to your **Railway database**
3. Open file: `remove_department_from_user_printer_assignments.sql`
4. Click **Execute** (lightning bolt icon)
5. Verify success: Check output pane for "Query OK"

### Step 2: Verify Column Dropped
Run this query to confirm:
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_printer_assignments' 
  AND TABLE_SCHEMA = DATABASE();
```
**Expected:** No `department` column in results

### Step 3: Restart Server
Since backend code changed, stop and restart:
```powershell
Set-Location server
node index.js
```

### Step 4: Test the Changes
1. ✅ Register a new institution_user - verify no department field
2. ✅ Login as institution_user
3. ✅ Create service request - verify department auto-fills if printer has it
4. ✅ Submit request - verify department saves to printers table
5. ✅ Create another request - verify department auto-filled from previous save
6. ✅ Test as institution_admin - same behavior

## What Changed?

### ❌ Removed
- Department field from user registration form
- Department field from admin create user form
- Department column from user_printer_assignments table

### ✅ Added
- Department field in institution_user service request form
- Smart auto-fill logic (same as location)
- Dynamic required/optional based on printer data

### 🔄 Updated
- All backend queries to use printers.department
- Allow both admin and user to update department
- Department now single source of truth in printers table

## Files Modified
- **Frontend:** 6 files
- **Backend:** 2 files
- **SQL:** 1 migration file

See `DEPARTMENT_REFACTOR_COMPLETE.md` for detailed documentation.
