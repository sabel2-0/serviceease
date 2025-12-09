# 🔧 Maintenance Services Table Cleanup - Migration Guide

## 📋 Overview

This migration simplifies the `voluntary_services` (maintenance services) table by removing redundant columns related to requesters and coordinators, since preventive maintenance is **initiated by technicians**, not requested by users.

## ❌ Problem Identified

The current table structure has:
- **Requester columns** (`requester_id`, `requester_approval_status`, `requester_notes`, etc.) - **NOT NEEDED** because maintenance is preventive, not requested
- **Coordinator columns** with confusing naming (`coordinator_approval_status`, `coordinator_notes`, etc.) - Should be renamed to `institution_admin` for clarity
- **Dual approval workflow** - Overly complex for preventive maintenance
- **Complex status enum** - Too many status values for a simple workflow

## ✅ Solution

### Changes Made:

#### **REMOVED Columns (Redundant):**
1. `requester_id` - Maintenance is not requested by users
2. `requester_approval_status` - No requester involved
3. `requester_notes` - No requester involved
4. `requester_reviewed_at` - No requester involved
5. `requester_reviewed_by` - No requester involved
6. `coordinator_approval_status` - Merged into main `status`
7. `coordinator_notes` - Renamed to `institution_admin_notes`
8. `coordinator_reviewed_at` - Renamed to `institution_admin_approved_at`
9. `coordinator_reviewed_by` - Renamed to `approved_by_institution_admin`

#### **ADDED Columns (Clearer Naming):**
1. `approved_by_institution_admin` (INT FK → users.id) - Who approved the maintenance
2. `institution_admin_approved_at` (TIMESTAMP) - When it was approved
3. `institution_admin_notes` (TEXT) - Admin's review notes
4. `completion_photo` (VARCHAR) - Photo of completed work

#### **UPDATED Columns:**
- `status` ENUM simplified from complex values to: `pending`, `approved`, `rejected`, `completed`

### Final Simplified Structure:

```sql
voluntary_services (maintenance_services)
├── id (PK)
├── technician_id (FK → users.id) - Who did the maintenance
├── printer_id (FK → printers.id) - Which printer
├── institution_id (FK → institutions.institution_id) - Which institution
├── service_description (TEXT) - What was done
├── parts_used (JSON) - Parts used during maintenance
├── completion_photo (VARCHAR) - Photo proof
├── status (ENUM: pending, approved, rejected, completed) - Current status
├── approved_by_institution_admin (FK → users.id) - Approver
├── institution_admin_approved_at (TIMESTAMP) - Approval time
├── institution_admin_notes (TEXT) - Approval notes
├── created_at (TIMESTAMP) - When maintenance was submitted
└── completed_at (TIMESTAMP) - When it was completed
```

## 🔄 Workflow After Migration

### **New Simplified Workflow:**

```
1. TECHNICIAN PERFORMS MAINTENANCE
   ↓
   - Technician does preventive maintenance on printer
   - No service request needed
   
2. SUBMIT MAINTENANCE RECORD
   ↓
   INSERT INTO voluntary_services (
     technician_id,
     printer_id,
     institution_id,
     service_description,
     parts_used,
     completion_photo,
     status
   ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
   
3. NOTIFY INSTITUTION ADMIN
   ↓
   INSERT INTO notifications (
     user_id = institution_admin_id,
     type = 'maintenance_service',
     message = 'Technician completed preventive maintenance'
   )
   
4. INSTITUTION ADMIN REVIEWS
   ↓
   IF APPROVED:
     UPDATE voluntary_services SET
       status = 'approved',
       approved_by_institution_admin = admin_user_id,
       institution_admin_approved_at = NOW(),
       institution_admin_notes = 'Looks good'
     
     -- Deduct parts from technician inventory
     UPDATE technician_inventory SET
       quantity = quantity - used_quantity
     
   IF REJECTED:
     UPDATE voluntary_services SET
       status = 'rejected',
       approved_by_institution_admin = admin_user_id,
       institution_admin_approved_at = NOW(),
       institution_admin_notes = 'Please redo the work'
     
5. FINAL STATUS
   ↓
   - Status: 'approved' or 'rejected'
   - Notification sent to technician
   - Service recorded in history
```

## 📊 Data Migration

The migration script automatically:
1. **Backs up** existing data to `voluntary_services_backup_20251208`
2. **Migrates** coordinator data to new institution_admin columns
3. **Removes** redundant requester columns
4. **Updates** status values to simplified enum
5. **Adds** indexes for better performance

### Before Running Migration:

```sql
-- Current confusing structure
SELECT 
    id,
    technician_id,
    requester_id,  -- ❌ Not needed
    coordinator_approval_status,  -- ❌ Confusing
    requester_approval_status,  -- ❌ Not needed
    coordinator_reviewed_by,  -- ❌ Unclear naming
    status
FROM voluntary_services;
```

### After Migration:

```sql
-- Clean, clear structure
SELECT 
    id,
    technician_id,
    printer_id,
    institution_id,
    status,  -- ✅ Simple: pending/approved/rejected/completed
    approved_by_institution_admin,  -- ✅ Clear who approved
    institution_admin_approved_at,  -- ✅ Clear when approved
    institution_admin_notes  -- ✅ Clear approval notes
FROM voluntary_services;
```

## 🚀 How to Apply Migration

### **Option 1: Using MySQL Command Line**

```bash
cd c:\Users\marki\Desktop\SE
mysql -u your_username -p your_database_name < cleanup_maintenance_services_table.sql
```

### **Option 2: Using PowerShell Script**

```powershell
# Navigate to project directory
cd c:\Users\marki\Desktop\SE

# Stop server first!
# Press Ctrl+C in the terminal running the server

# Run migration
Get-Content cleanup_maintenance_services_table.sql | mysql -u root -p serviceease

# Verify changes
mysql -u root -p serviceease -e "SHOW COLUMNS FROM voluntary_services;"

# Restart server
cd server
node index.js
```

### **Option 3: Using MySQL Workbench**

1. Open MySQL Workbench
2. Connect to your database
3. Open `cleanup_maintenance_services_table.sql`
4. Click "Execute" (⚡ icon)
5. Review the verification queries at the bottom

## ✅ Verification Steps

After running the migration, verify with these queries:

```sql
-- 1. Check structure
SHOW COLUMNS FROM voluntary_services;

-- 2. Check data migration
SELECT 
    COUNT(*) as total_records,
    COUNT(approved_by_institution_admin) as records_with_approval,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
FROM voluntary_services;

-- 3. Check backup exists
SELECT COUNT(*) FROM voluntary_services_backup_20251208;

-- 4. Compare before/after
SELECT 
    vs.id,
    vs.status as new_status,
    backup.status as old_status,
    vs.approved_by_institution_admin,
    backup.coordinator_reviewed_by as old_coordinator_id
FROM voluntary_services vs
LEFT JOIN voluntary_services_backup_20251208 backup ON vs.id = backup.id
LIMIT 5;
```

## 🔧 Code Updates Required

After migration, update these files:

### **1. `server/routes/maintenance-services.js`**

**Change references from:**
- `requester_id` → Remove completely
- `coordinator_approval_status` → Use main `status` column
- `coordinator_notes` → `institution_admin_notes`
- `coordinator_reviewed_by` → `approved_by_institution_admin`
- `coordinator_reviewed_at` → `institution_admin_approved_at`

### **2. Frontend Pages**

Update any JavaScript that references old column names:
- `client/src/pages/technician/maintenance-services.html`
- `client/src/pages/institution-admin/maintenance-approvals.html`

### **3. API Queries**

Search for and update queries in:
```bash
# Find all references
grep -r "requester_approval_status" server/
grep -r "coordinator_approval_status" server/
grep -r "coordinator_reviewed_by" server/
```

## 🎯 Benefits of This Migration

✅ **Clearer Purpose**: Table name and structure clearly indicate preventive maintenance  
✅ **Reduced Complexity**: Single approval workflow instead of dual approval  
✅ **Better Performance**: Fewer columns = smaller table size = faster queries  
✅ **Easier Maintenance**: Less code to maintain, fewer edge cases  
✅ **Consistent Naming**: `institution_admin` instead of confusing `coordinator`  
✅ **No Data Loss**: All existing data preserved and migrated  

## ⚠️ Important Notes

1. **Backup First**: The migration creates a backup table automatically, but you should also backup your entire database
2. **Stop Server**: Stop the Node.js server before running migration
3. **Test First**: Run on development database before production
4. **Code Updates**: Remember to update backend routes and frontend code

## 🔙 Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Drop the modified table
DROP TABLE voluntary_services;

-- Restore from backup
CREATE TABLE voluntary_services AS 
SELECT * FROM voluntary_services_backup_20251208;

-- Verify
SELECT COUNT(*) FROM voluntary_services;
```

## 📝 Summary

This migration transforms a confusing, redundant table structure into a clean, purpose-built preventive maintenance tracking system. It removes unnecessary approval complexity and makes the code easier to understand and maintain.

**Before:** Confusing dual-approval with requester columns  
**After:** Simple single-approval preventive maintenance tracking

---

**Migration File:** `cleanup_maintenance_services_table.sql`  
**Created:** December 8, 2025  
**Status:** Ready to Apply
