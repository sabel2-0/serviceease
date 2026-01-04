# Maintenance Services Coordinator → Institution Admin Migration

**Date:** December 6, 2025  
**Status:**  COMPLETED

## Overview
Fixed all "coordinator" references in the `maintenance_services` table to use "institution_admin" instead, maintaining consistency with the rest of the system.

## Database Changes

### Table: `maintenance_services`

#### Columns Renamed:
| Old Column Name | New Column Name |
|----------------|-----------------|
| `coordinator_approval_status` | `institution_admin_approval_status` |
| `coordinator_notes` | `institution_admin_notes` |
| `coordinator_reviewed_at` | `institution_admin_reviewed_at` |
| `coordinator_reviewed_by` | `institution_admin_reviewed_by` |

#### Status ENUM Values Updated:
| Old Value | New Value |
|-----------|-----------|
| `pending_coordinator` | `pending_institution_admin` |
| `coordinator_approved` | `institution_admin_approved` |

### Complete Current Schema:
```sql
CREATE TABLE `maintenance_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `printer_id` int NOT NULL,
  `institution_id` varchar(50) NOT NULL,
  `requester_id` int DEFAULT NULL,
  `service_description` text NOT NULL,
  `parts_used` text,
  `status` enum('pending_institution_admin','institution_admin_approved','pending_requester','completed','rejected') DEFAULT 'pending_institution_admin',
  `institution_admin_approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requester_approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `institution_admin_notes` text,
  `requester_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `institution_admin_reviewed_at` timestamp NULL DEFAULT NULL,
  `institution_admin_reviewed_by` int DEFAULT NULL,
  `requester_reviewed_at` timestamp NULL DEFAULT NULL,
  `requester_reviewed_by` int DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_printer` (`printer_id`),
  KEY `idx_institution` (`institution_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at` DESC),
  KEY `idx_requester` (`requester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Migration Process

1. **Created Migration File:** `maintenance_services_coordinator_fix.sql`
2. **Migration Steps:**
   - Added new columns with `institution_admin_` prefix
   - Copied data from old `coordinator_` columns to new columns
   - Dropped old `coordinator_` columns
   - Updated status ENUM to use new values
   - Updated existing data to use new status values

3. **Executed Migration:**
   ```powershell
   Get-Content maintenance_services_coordinator_fix.sql | mysql -u root -p"Natusv1ncere." serviceease
   ```

## Code Verification

### Backend (server/routes/maintenance-services.js)
 Already using correct column names (`institution_admin_`)  
 Already using correct status values (`pending_institution_admin`, `institution_admin_approved`)  
 No changes needed - code was already updated previously

### Frontend
 No references to old coordinator column names found  
 API calls use correct endpoints

## Data Preservation
- All existing service records preserved
- All approval statuses maintained
- All notes and review data migrated successfully
- No data loss during migration

## Testing Checklist
- [x] Database migration executed successfully
- [x] All columns renamed correctly
- [x] Status ENUM values updated
- [x] Server starts without errors
- [x] No code changes required (already correct)

## Files Modified
1. `maintenance_services_coordinator_fix.sql` (new migration file)

## Related Previous Migrations
1. `voluntary_services` → `maintenance_services` table rename
2. `service_approvals` table: `coordinator_id` → `institution_admin_id`
3. `users` table: `coordinator` role → `institution_admin` role

## Verification Queries
```sql
-- Check column names
SHOW COLUMNS FROM maintenance_services;

-- Check status values in use
SELECT DISTINCT status FROM maintenance_services;

-- Verify no coordinator columns remain
SHOW COLUMNS FROM maintenance_services WHERE Field LIKE '%coordinator%';
```

## Result
 **All coordinator references removed from maintenance_services table**  
 **System now uses institution_admin consistently throughout**  
 **Server running successfully with updated schema**
