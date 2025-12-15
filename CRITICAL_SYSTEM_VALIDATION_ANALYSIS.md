# CRITICAL SYSTEM VALIDATION ANALYSIS - ServiceEase
**Analysis Date:** December 16, 2025  
**Database Version:** super_latest_railway_database.sql  
**Objective:** Identify and resolve all logical flaws to prevent endless revision loops

---

## ⚠️ CRITICAL ISSUES FOUND

### 🔴 **ISSUE #1: BROKEN FOREIGN KEY CONSTRAINT**
**Severity:** CRITICAL - WILL CAUSE DATA CORRUPTION

#### Problem
The `service_items_used` table has:
```sql
`service_id` int NOT NULL,
KEY `idx_service_request` (`service_id`),
```

**BUT NO FOREIGN KEY CONSTRAINT!** The old schema had:
```sql
CONSTRAINT `service_items_used_ibfk_1` FOREIGN KEY (`service_request_id`) 
  REFERENCES `service_requests` (`id`) ON DELETE CASCADE
```

#### Current State
- ✅ Column exists: `service_id`
- ❌ No foreign key to `service_requests`
- ❌ No foreign key to `maintenance_services`
- ❌ No constraint preventing orphan records

#### Impact
1. **Orphan records will accumulate** - deleted services leave behind items_used records
2. **No referential integrity** - can insert items for non-existent services
3. **Database cleanup impossible** - no cascading deletes
4. **Query errors** - JOINs will fail silently or return incorrect data

#### **REQUIRED FIX:**
```sql
-- This is IMPOSSIBLE with current structure because:
-- service_id can reference EITHER service_requests.id OR maintenance_services.id
-- MySQL does NOT support conditional foreign keys or multiple FK targets

-- YOU MUST ADD service_type column to service_items_used
ALTER TABLE service_items_used 
ADD COLUMN service_type ENUM('service_request', 'maintenance_service') NOT NULL;

-- Then queries become:
SELECT * FROM service_items_used siu
LEFT JOIN service_requests sr 
  ON siu.service_id = sr.id AND siu.service_type = 'service_request'
LEFT JOIN maintenance_services ms 
  ON siu.service_id = ms.id AND siu.service_type = 'maintenance_service'
```

---

### 🔴 **ISSUE #2: AMBIGUOUS SERVICE_ID WITHOUT service_type**
**Severity:** CRITICAL - CAUSES DATA COLLISION

#### Problem
Both tables use **OVERLAPPING IDs:**
- `service_requests.id = 1`
- `maintenance_services.id = 1`

When `service_items_used.service_id = 1`, which service does it reference?

#### Current Queries (BROKEN)
```sql
-- This query is AMBIGUOUS:
SELECT * FROM service_items_used WHERE service_id = 1;
-- Result: Could be from service_request #1 OR maintenance_service #1
```

#### Proof from Your Database
```sql
-- service_requests has: id=1, id=2, id=3
-- maintenance_services has: id=1, id=2, id=3, id=4
-- service_items_used has: service_id=1, service_id=2, service_id=3

-- Which table does service_items_used.service_id=3 belong to?
-- Is it service_requests.id=3 OR maintenance_services.id=3?
-- IMPOSSIBLE TO DETERMINE WITHOUT service_type!
```

#### **REQUIRED FIX:**
Add `service_type` to `service_items_used`:
```sql
ALTER TABLE service_items_used 
ADD COLUMN service_type ENUM('service_request', 'maintenance_service') NOT NULL;

-- Update existing records (MANUAL DATA CORRECTION REQUIRED)
-- You must know which service_id belongs to which table
UPDATE service_items_used 
SET service_type = 'service_request' 
WHERE service_id IN (1, 2, 3); -- Assuming these are service requests

-- All future INSERTs must include service_type
INSERT INTO service_items_used (service_id, service_type, item_id, quantity_used, used_by)
VALUES (1, 'service_request', 2, 5, 4);
```

---

### 🔴 **ISSUE #3: service_approvals HAS service_type BUT service_items_used DOES NOT**
**Severity:** CRITICAL - INCONSISTENT SCHEMA DESIGN

#### Current State
✅ **service_approvals:**
```sql
`service_type` enum('service_request','maintenance_service') NOT NULL DEFAULT 'service_request'
```

❌ **service_items_used:**
```sql
-- NO service_type column!
```

#### Why This Is a Problem
1. **Approvals can distinguish** between service_request #1 and maintenance_service #1
2. **Items used CANNOT distinguish** - leads to wrong data retrieval
3. **Inconsistent queries** - one table needs service_type filter, other doesn't

#### Example of Current Bug
```sql
-- This works correctly (service_approvals):
SELECT * FROM service_approvals 
WHERE service_id = 3 AND service_type = 'maintenance_service';

-- This is BROKEN (service_items_used):
SELECT * FROM service_items_used 
WHERE service_id = 3; -- Is this for service_request #3 or maintenance_service #3?
```

---

## 📋 ANSWERS TO YOUR QUESTIONS

### **1. Service ID Usage Clarification**

#### Current Schema (BROKEN):
- ❌ **service_approvals:** Has `service_id` + `service_type` ✅ CORRECT
- ❌ **service_items_used:** Has `service_id` WITHOUT `service_type` ❌ BROKEN

#### Problem Statement
> "We only use service_request_id to reference services from service_requests table"

**This is FALSE in your current database!** Your schema uses:
- `service_id` (not `service_request_id`) in BOTH tables
- This means `service_id` references BOTH `service_requests.id` AND `maintenance_services.id`

#### Is the Shared-Table Approach Valid?

**✅ YES** - Shared tables are valid IF implemented correctly  
**❌ NO** - Your current implementation is BROKEN

**Requirements for Valid Shared Tables:**
1. ✅ Use unified `service_id` column (you have this)
2. ✅ Add `service_type` discriminator column (you have this in service_approvals)
3. ❌ Add `service_type` to service_items_used (YOU ARE MISSING THIS)
4. ❌ Add proper foreign keys OR triggers to prevent orphans
5. ✅ Use `service_type` in ALL queries and JOINs

#### **Correct Implementation:**
```sql
-- BOTH shared tables MUST have service_type
CREATE TABLE service_approvals (
  service_id INT NOT NULL,
  service_type ENUM('service_request', 'maintenance_service') NOT NULL,
  -- ... other columns
  INDEX idx_service_type_id (service_type, service_id)
);

CREATE TABLE service_items_used (
  service_id INT NOT NULL,
  service_type ENUM('service_request', 'maintenance_service') NOT NULL,  -- MISSING!
  -- ... other columns
  INDEX idx_service_type_id (service_type, service_id)
);

-- All queries MUST include service_type:
SELECT * FROM service_items_used 
WHERE service_id = 3 AND service_type = 'maintenance_service';
```

---

### **2. Rejected Service Requests**

#### Current Behavior
✅ **Correctly implemented** - Rejected requests remain in `service_requests` table with `status = 'completed'` (or should be 'rejected')

#### Database Evidence
```sql
-- service_approvals has:
status enum('pending_approval','approved','rejected','revision_requested')

-- BUT service_requests has:
status enum('pending','assigned','in_progress','pending_approval','completed','cancelled')
```

⚠️ **STATUS MISMATCH ISSUE:**
- `service_approvals.status = 'rejected'`
- But `service_requests.status` has NO 'rejected' option!
- Currently uses 'in_progress' or 'pending_approval'

#### **REQUIRED FIX:**
```sql
ALTER TABLE service_requests 
MODIFY status ENUM('pending','assigned','in_progress','pending_approval','completed','rejected','cancelled') 
NOT NULL DEFAULT 'pending';
```

#### Best Practice (CORRECT)
✅ Keep rejected requests in `service_requests` table  
✅ Set `status = 'rejected'` (AFTER adding it to ENUM)  
✅ Use `service_approvals.status = 'rejected'` to track rejection details  
✅ Retain for audit trail and reporting  

#### Workflow After Rejection
```javascript
// When institution admin rejects:
1. UPDATE service_approvals 
   SET status = 'rejected', reviewed_at = NOW(), institution_admin_notes = 'reason'
   WHERE service_id = X AND service_type = 'service_request';

2. UPDATE service_requests 
   SET status = 'rejected'  // CURRENTLY IMPOSSIBLE - needs ENUM update
   WHERE id = X;

3. Optionally DELETE FROM service_items_used 
   WHERE service_id = X AND service_type = 'service_request';
   // So technician can resubmit with different items
```

---

### **3. Rejected Maintenance Services**

#### Current Behavior
✅ **Correctly implemented** - Uses `maintenance_services.status = 'rejected'`

#### Database Evidence
```sql
CREATE TABLE maintenance_services (
  status enum('pending','approved','rejected','completed') DEFAULT 'pending'
);

-- Sample data shows rejected services:
INSERT INTO maintenance_services VALUES 
(1, ..., 'rejected', ...),
(2, ..., 'rejected', ...);
```

#### Where Rejected Services Live
✅ They remain in `maintenance_services` table  
✅ Status is set to `'rejected'`  
✅ Also tracked in `service_approvals` with `status = 'rejected'`  

#### How They Are Excluded from Active Workflows
```sql
-- Active maintenance services (correct query):
SELECT * FROM maintenance_services 
WHERE status IN ('pending', 'completed');

-- Rejected services (for audit/reports):
SELECT * FROM maintenance_services 
WHERE status = 'rejected';
```

#### ✅ **This is CORRECT** - No changes needed for maintenance_services

---

### **4. Error Prevention in Service Submission**

Let me trace through the complete workflow:

#### **Workflow A: Service Request Submission**

**Step 1: Technician completes service request**
```javascript
// Complete service request
PUT /service-requests/:id/complete-walk-in
{
  "resolution_notes": "Fixed printer jam",
  "completion_photo": "https://...",
  "parts": [{ "name": "Toner", "brand": "HP", "quantity": 1 }]
}

// Backend executes:
1. UPDATE service_requests SET 
   status = 'pending_approval', 
   resolution_notes = ?, 
   completion_photo_url = ?;

2. INSERT INTO service_items_used (service_id, service_type, item_id, ...) 
   VALUES (?, 'service_request', ?, ...);  // ⚠️ MISSING service_type in your schema!

3. INSERT INTO service_approvals (service_id, service_type, status, ...)
   VALUES (?, 'service_request', 'pending_approval', ...);
```

**Current Issues:**
- ❌ `service_items_used` doesn't have `service_type` column
- ❌ Code tries to INSERT service_type but column doesn't exist
- ❌ Will cause SQL error: "Unknown column 'service_type'"

**Step 2: Institution Admin reviews**
```sql
-- Query to get pending approvals
SELECT sa.*, sr.*, siu.item_id, siu.quantity_used
FROM service_approvals sa
JOIN service_requests sr ON sa.service_id = sr.id
LEFT JOIN service_items_used siu ON sa.service_id = siu.service_id
WHERE sa.service_type = 'service_request' 
  AND sa.status = 'pending_approval';

-- ⚠️ PROBLEM: siu.service_id could match maintenance_service with same ID!
-- Without service_type in service_items_used, JOIN is AMBIGUOUS
```

**Step 3: Institution Admin approves**
```sql
1. UPDATE service_approvals 
   SET status = 'approved', approved_by = ?, reviewed_at = NOW();

2. UPDATE service_requests 
   SET status = 'completed', completed_at = NOW();

3. -- Deduct from inventory
   UPDATE technician_inventory 
   SET quantity = quantity - ?
   WHERE technician_id = ? AND item_id = ?;
```

✅ **Approval logic works** (once service_type is added to service_items_used)

---

#### **Workflow B: Maintenance Service Submission**

**Step 1: Technician submits maintenance service**
```javascript
POST /api/maintenance-services
{
  "printer_id": 1,
  "institution_id": "INST-001",
  "service_description": "Regular maintenance",
  "completion_photo": "https://...",
  "items_used": [{ "item_id": 2, "qty": 1 }]
}

// Backend executes:
1. INSERT INTO maintenance_services (...) 
   VALUES (...);  -- Gets id = X

2. INSERT INTO service_items_used (service_id, service_type, item_id, ...)
   VALUES (X, 'maintenance_service', 2, 1, ...);  // ⚠️ MISSING service_type column!

3. INSERT INTO service_approvals (service_id, service_type, status, ...)
   VALUES (X, 'maintenance_service', 'pending_approval', ...);
```

**Step 2: Institution Admin reviews**
```sql
-- Query to get maintenance service approvals
SELECT sa.*, ms.*, siu.item_id, siu.quantity_used
FROM service_approvals sa
JOIN maintenance_services ms ON sa.service_id = ms.id
LEFT JOIN service_items_used siu ON sa.service_id = siu.service_id
WHERE sa.service_type = 'maintenance_service' 
  AND sa.status = 'pending_approval';

-- ⚠️ CRITICAL BUG:
-- If service_requests.id = 3 AND maintenance_services.id = 3
-- And service_items_used.service_id = 3
-- This query will return items from BOTH services!
```

**Step 3: Institution Admin approves/rejects**
```sql
-- Approval:
UPDATE service_approvals SET status = 'approved', ...;
UPDATE maintenance_services SET status = 'completed', completed_at = NOW();

-- Rejection:
UPDATE service_approvals SET status = 'rejected', ...;
UPDATE maintenance_services SET status = 'rejected';
DELETE FROM service_items_used 
WHERE service_id = ? AND service_type = 'maintenance_service';  -- ⚠️ Can't filter by service_type!
```

---

#### **Foreign Key Validity Check**

**Current Foreign Keys:**
```sql
service_requests:
✅ FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
✅ FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
✅ FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE
✅ FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL

service_approvals:
✅ FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
❌ NO FOREIGN KEY for service_id (IMPOSSIBLE with current design)

service_items_used:
❌ NO FOREIGN KEY for service_id (BROKEN - was removed during migration)
✅ Has indexes but NO referential integrity
```

**Will NULL References Occur?**
- ✅ Users: No - ON DELETE SET NULL handles deleted users
- ✅ Institutions: No - ON DELETE CASCADE handles deleted institutions
- ⚠️ Services: YES - service_approvals and service_items_used have NO foreign keys
  - If `service_requests.id = 5` is deleted
  - `service_approvals` with `service_id = 5` becomes orphan
  - `service_items_used` with `service_id = 5` becomes orphan

**Orphan Record Scenario:**
```sql
-- Delete a service request
DELETE FROM service_requests WHERE id = 10;

-- Orphaned records remain:
SELECT * FROM service_approvals WHERE service_id = 10;  -- Still exists!
SELECT * FROM service_items_used WHERE service_id = 10;  -- Still exists!

-- DANGER: New maintenance_service gets id = 10
INSERT INTO maintenance_services (...);  -- Gets id = 10

-- Now these orphaned records appear to belong to maintenance_service #10!
SELECT * FROM service_items_used WHERE service_id = 10;  
-- Returns items from DELETED service_request #10
-- Admin thinks these items belong to maintenance_service #10
-- WRONG DATA DISPLAYED!
```

---

### **5. Visibility of Used Parts/Items**

#### Can Institution Admins View Items Used?

**✅ YES** - for service requests  
**⚠️ MAYBE** - for maintenance services (depends on query implementation)

#### Query Example (Current Code):
```sql
-- Institution admin viewing service request details
SELECT sr.*, siu.item_id, siu.quantity_used, pi.name
FROM service_requests sr
LEFT JOIN service_items_used siu ON sr.id = siu.service_id
LEFT JOIN printer_items pi ON siu.item_id = pi.id
WHERE sr.id = 5;

-- ⚠️ PROBLEM: If maintenance_services.id = 5 also exists
-- This query might return items from BOTH services!
```

#### Correct Query (Requires service_type):
```sql
-- Service request items
SELECT sr.*, siu.item_id, siu.quantity_used, pi.name
FROM service_requests sr
LEFT JOIN service_items_used siu 
  ON sr.id = siu.service_id 
  AND siu.service_type = 'service_request'  -- REQUIRED!
LEFT JOIN printer_items pi ON siu.item_id = pi.id
WHERE sr.id = 5;

-- Maintenance service items
SELECT ms.*, siu.item_id, siu.quantity_used, pi.name
FROM maintenance_services ms
LEFT JOIN service_items_used siu 
  ON ms.id = siu.service_id 
  AND siu.service_type = 'maintenance_service'  -- REQUIRED!
LEFT JOIN printer_items pi ON siu.item_id = pi.id
WHERE ms.id = 5;
```

#### Consistency Check
- ✅ **IF** service_type is added to service_items_used: **CONSISTENT**
- ❌ **WITHOUT** service_type: **INCONSISTENT & BROKEN**

---

## 🔧 REQUIRED DATABASE MIGRATIONS

### **Migration #1: Add service_type to service_items_used**

```sql
-- Step 1: Add the column (allows NULL temporarily)
ALTER TABLE service_items_used 
ADD COLUMN service_type ENUM('service_request', 'maintenance_service') NULL;

-- Step 2: Populate existing records
-- ⚠️ YOU MUST MANUALLY VERIFY WHICH service_id BELONGS TO WHICH TABLE!

-- Example (verify first!):
UPDATE service_items_used SET service_type = 'service_request' 
WHERE service_id IN (1, 2);  -- These came from service_requests

UPDATE service_items_used SET service_type = 'maintenance_service' 
WHERE service_id = 3;  -- This came from maintenance_services

-- Step 3: Make it NOT NULL after all records are updated
ALTER TABLE service_items_used 
MODIFY service_type ENUM('service_request', 'maintenance_service') NOT NULL;

-- Step 4: Add composite index for performance
ALTER TABLE service_items_used
ADD INDEX idx_service_type_id (service_type, service_id);
```

### **Migration #2: Add 'rejected' status to service_requests**

```sql
ALTER TABLE service_requests 
MODIFY status ENUM(
  'pending',
  'assigned',
  'in_progress',
  'pending_approval',
  'completed',
  'rejected',      -- NEW
  'cancelled'
) NOT NULL DEFAULT 'pending';
```

### **Migration #3: Add foreign key constraints (OPTIONAL - Recommended with triggers)**

Since you can't add direct foreign keys (service_id references multiple tables), use triggers:

```sql
-- Trigger to prevent orphan records in service_approvals
DELIMITER //

CREATE TRIGGER before_insert_service_approvals
BEFORE INSERT ON service_approvals
FOR EACH ROW
BEGIN
  IF NEW.service_type = 'service_request' THEN
    IF NOT EXISTS (SELECT 1 FROM service_requests WHERE id = NEW.service_id) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in service_requests';
    END IF;
  ELSEIF NEW.service_type = 'maintenance_service' THEN
    IF NOT EXISTS (SELECT 1 FROM maintenance_services WHERE id = NEW.service_id) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in maintenance_services';
    END IF;
  END IF;
END//

CREATE TRIGGER before_insert_service_items_used
BEFORE INSERT ON service_items_used
FOR EACH ROW
BEGIN
  IF NEW.service_type = 'service_request' THEN
    IF NOT EXISTS (SELECT 1 FROM service_requests WHERE id = NEW.service_id) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in service_requests';
    END IF;
  ELSEIF NEW.service_type = 'maintenance_service' THEN
    IF NOT EXISTS (SELECT 1 FROM maintenance_services WHERE id = NEW.service_id) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'service_id does not exist in maintenance_services';
    END IF;
  END IF;
END//

DELIMITER ;
```

---

## 🔍 CODE CHANGES REQUIRED

### **1. All INSERT statements to service_items_used**

**Current (BROKEN):**
```javascript
await db.query(
  'INSERT INTO service_items_used (service_id, item_id, quantity_used, used_by) VALUES (?, ?, ?, ?)',
  [serviceId, itemId, quantity, userId]
);
```

**Required (CORRECT):**
```javascript
await db.query(
  'INSERT INTO service_items_used (service_id, service_type, item_id, quantity_used, used_by) VALUES (?, ?, ?, ?, ?)',
  [serviceId, 'service_request', itemId, quantity, userId]  // or 'maintenance_service'
);
```

### **2. All SELECT queries with service_items_used**

**Current (BROKEN):**
```javascript
const [items] = await db.query(
  'SELECT * FROM service_items_used WHERE service_id = ?',
  [serviceId]
);
```

**Required (CORRECT):**
```javascript
const [items] = await db.query(
  'SELECT * FROM service_items_used WHERE service_id = ? AND service_type = ?',
  [serviceId, 'service_request']  // or 'maintenance_service'
);
```

### **3. All JOINs with service_items_used**

**Current (BROKEN):**
```javascript
LEFT JOIN service_items_used siu ON sr.id = siu.service_id
```

**Required (CORRECT):**
```javascript
LEFT JOIN service_items_used siu 
  ON sr.id = siu.service_id 
  AND siu.service_type = 'service_request'
```

### **4. All DELETE statements**

**Current (BROKEN):**
```javascript
await db.query(
  'DELETE FROM service_items_used WHERE service_id = ?',
  [serviceId]
);
```

**Required (CORRECT):**
```javascript
await db.query(
  'DELETE FROM service_items_used WHERE service_id = ? AND service_type = ?',
  [serviceId, 'service_request']  // or 'maintenance_service'
);
```

---

## ✅ FINAL VALIDATION CHECKLIST

### Database Integrity
- [ ] Add `service_type` column to `service_items_used`
- [ ] Populate existing `service_type` values correctly
- [ ] Add composite index `(service_type, service_id)`
- [ ] Add 'rejected' to `service_requests.status` ENUM
- [ ] Create validation triggers for referential integrity
- [ ] Test cascade deletes won't create orphans

### Code Updates
- [ ] Update ALL INSERT to service_items_used (add service_type)
- [ ] Update ALL SELECT from service_items_used (add service_type filter)
- [ ] Update ALL JOINs with service_items_used (add service_type condition)
- [ ] Update ALL DELETE from service_items_used (add service_type filter)
- [ ] Update rejection workflow to set service_requests.status = 'rejected'
- [ ] Test service_request approval workflow end-to-end
- [ ] Test maintenance_service approval workflow end-to-end
- [ ] Test items display for both service types
- [ ] Test orphan record prevention

### Workflow Validation
- [ ] Service request submission → items saved correctly
- [ ] Maintenance service submission → items saved correctly
- [ ] Institution admin can see items for service requests
- [ ] Institution admin can see items for maintenance services
- [ ] Items don't mix between service types with same ID
- [ ] Approval/rejection updates both tables consistently
- [ ] Rejected services retain data for audit
- [ ] Deleted services clean up related records

---

## 🎯 SUMMARY: What Will Break Without Fixes

### Without service_type in service_items_used:
1. ❌ Code will throw SQL errors when trying to INSERT service_type
2. ❌ Items from different service types will mix if IDs overlap
3. ❌ Deleting service_request #5 won't delete its items
4. ❌ Creating maintenance_service #5 will show old items from deleted request
5. ❌ Institution admins will see wrong items in approval screens
6. ❌ Reports will show incorrect item usage data
7. ❌ Orphan records will accumulate indefinitely

### Without 'rejected' status in service_requests:
1. ❌ Can't distinguish rejected from in-progress requests
2. ❌ Rejected requests show as "pending" or "in_progress"
3. ❌ Reports will be inaccurate
4. ❌ Audit trail is incomplete

### Without foreign key constraints/triggers:
1. ❌ Orphan records can be created
2. ❌ Data integrity not enforced
3. ❌ Manual cleanup required periodically
4. ❌ Query performance degradation over time

---

## 💡 RECOMMENDED ACTION PLAN

### Phase 1: Emergency Database Fix (DO FIRST)
1. Run Migration #1 (add service_type to service_items_used)
2. Manually verify and update existing records
3. Run Migration #2 (add 'rejected' to service_requests)

### Phase 2: Code Updates (DO IMMEDIATELY AFTER)
1. Update all service_items_used INSERT statements
2. Update all service_items_used SELECT/JOIN queries
3. Update rejection workflow
4. Test both service request and maintenance service flows

### Phase 3: Long-term Stability (DO WITHIN 1 WEEK)
1. Add validation triggers
2. Create automated tests for workflows
3. Add database constraints where possible
4. Document the service_type requirement

---

## 🚨 CRITICAL WARNING

**Your current system WILL produce data corruption without these fixes.**

The severity of these issues means:
- Data displayed to users may be incorrect
- Approvals may affect wrong services
- Items used tracking is unreliable
- Database will accumulate orphan records
- Deletion operations leave corrupted data

**Priority:** IMMEDIATE - Deploy database migrations before next service submission

---

**End of Analysis**
