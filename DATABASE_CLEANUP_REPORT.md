# Database Redundancy & Naming Cleanup Report
**Date:** December 3, 2025

## ✅ Current Status: CLEAN
No table-level redundancies found. All 22 tables are in use.

## 🔍 Issues Found

### 1. **Column Redundancy in `users` table**
**Problem:** Has BOTH `email_verified_at` and `is_email_verified`
- `email_verified_at` (TIMESTAMP) - stores when email was verified
- `is_email_verified` (BOOLEAN) - flag if email is verified

**Impact:** 
- Code uses: `is_email_verified` (18 references)
- Code uses: `email_verified_at` (2 references in old files)

**Recommendation:** ✅ **Remove `email_verified_at` column**
- Keep `is_email_verified` as it's actively used
- The timestamp isn't needed for core functionality

---

### 2. **Confusing Table Names**
**Problem:** `client_printer_assignments` vs `user_printer_assignments`

| Current Name | Purpose | Better Name |
|--------------|---------|-------------|
| `client_printer_assignments` | Printers assigned to institutions | `institution_printer_assignments` |
| `user_printer_assignments` | Printers assigned to individual users | Keep as-is |

**Reason:** "Client" is ambiguous - could mean institution or user

**Recommendation:** ⚠️ **Rename `client_printer_assignments` → `institution_printer_assignments`**

---

### 3. **Notifications Column Confusion**
**Problem:** `notifications` table has 3 user-related columns:
- `user_id` - recipient of notification
- `sender_id` - who sent/triggered it
- `related_user_id` - user the notification is about

**Status:** ✓ **Keep all 3** - they serve different purposes
- BUT: Add comments/documentation to clarify

---

### 4. **inventory_items.category Enum**
**Current:** Only has `'printer'` as option
**Future-proof:** OK if planning to add more equipment types later
**Recommendation:** ✓ **Keep as-is** (good for extensibility)

---

## 📊 Database Statistics
- **Total Tables:** 22
- **Total Rows:** 337
- **Tables with data:** 19
- **Empty tables:** 3 (arm_analysis_cache, printer_parts_transactions, verification_tokens)

## 🛠️ Recommended Actions

### Priority 1: Remove Redundant Column
```sql
-- Remove email_verified_at from users table
ALTER TABLE users DROP COLUMN email_verified_at;
```

### Priority 2: Rename Confusing Table
```sql
-- Rename client_printer_assignments to institution_printer_assignments
RENAME TABLE client_printer_assignments TO institution_printer_assignments;
```

**Code Impact:** Need to update ~15 SQL queries in codebase

### Priority 3: Add Documentation
Add comments to clarify `notifications` columns:
```sql
ALTER TABLE notifications 
  MODIFY COLUMN user_id INT COMMENT 'Recipient of this notification',
  MODIFY COLUMN sender_id INT COMMENT 'User who triggered this notification',
  MODIFY COLUMN related_user_id INT COMMENT 'User this notification is about';
```

---

## ✅ Clean Tables (No Issues)
- audit_logs
- institutions
- inventory_items
- service_requests
- parts_requests
- password_reset_tokens
- printer_parts
- service_approvals
- service_parts_used
- service_request_history
- sessions
- technician_assignments
- technician_inventory
- temp_user_photos
- voluntary_services
- verification_tokens

