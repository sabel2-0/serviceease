# Column Mapping Reference - Maintenance Services Migration

## Quick Reference Table

| Old Column Name | New Column Name | Action | Reason |
|----------------|-----------------|---------|---------|
| `requester_id` | ❌ REMOVED | DELETE | Maintenance is preventive, not requested |
| `requester_approval_status` | ❌ REMOVED | DELETE | No requester approval needed |
| `requester_notes` | ❌ REMOVED | DELETE | No requester involved |
| `requester_reviewed_at` | ❌ REMOVED | DELETE | No requester review |
| `requester_reviewed_by` | ❌ REMOVED | DELETE | No requester review |
| `coordinator_approval_status` | ❌ REMOVED | DELETE | Merged into main `status` column |
| `coordinator_notes` | `institution_admin_notes` | RENAME | Clearer naming |
| `coordinator_reviewed_at` | `institution_admin_approved_at` | RENAME | Clearer naming |
| `coordinator_reviewed_by` | `approved_by_institution_admin` | RENAME | Clearer naming |
| N/A | `completion_photo` | ADD | Photo of completed maintenance |

## Status Enum Changes

### Before:
```sql
ENUM(
  'pending_coordinator',
  'pending_institution_admin', 
  'pending_requester',
  'approved_coordinator',
  'rejected_coordinator',
  'rejected_requester'
)
```

### After:
```sql
ENUM(
  'pending',
  'approved',
  'rejected',
  'completed'
)
```

## Code Update Examples

### SQL Queries

#### INSERT Statement
```sql
-- BEFORE ❌
INSERT INTO voluntary_services (
    technician_id,
    printer_id,
    institution_id,
    requester_id,
    service_description,
    parts_used,
    status,
    coordinator_approval_status,
    requester_approval_status
) VALUES (?, ?, ?, ?, ?, ?, 'pending_coordinator', 'pending', 'pending')

-- AFTER ✅
INSERT INTO voluntary_services (
    technician_id,
    printer_id,
    institution_id,
    service_description,
    parts_used,
    completion_photo,
    status
) VALUES (?, ?, ?, ?, ?, ?, 'pending')
```

#### UPDATE Statement (Approval)
```sql
-- BEFORE ❌
UPDATE voluntary_services 
SET coordinator_approval_status = 'approved',
    coordinator_reviewed_by = ?,
    coordinator_reviewed_at = NOW(),
    coordinator_notes = ?
WHERE id = ?

-- AFTER ✅
UPDATE voluntary_services 
SET status = 'approved',
    approved_by_institution_admin = ?,
    institution_admin_approved_at = NOW(),
    institution_admin_notes = ?
WHERE id = ?
```

#### SELECT Statement
```sql
-- BEFORE ❌
SELECT 
    vs.*,
    CONCAT(req.first_name, ' ', req.last_name) as requester_name,
    CONCAT(coord.first_name, ' ', coord.last_name) as coordinator_name,
    vs.coordinator_approval_status,
    vs.requester_approval_status
FROM voluntary_services vs
LEFT JOIN users req ON req.id = vs.requester_id
LEFT JOIN users coord ON coord.id = vs.coordinator_reviewed_by

-- AFTER ✅
SELECT 
    vs.*,
    CONCAT(admin.first_name, ' ', admin.last_name) as institution_admin_name,
    vs.status
FROM voluntary_services vs
LEFT JOIN users admin ON admin.id = vs.approved_by_institution_admin
```

### JavaScript/Node.js Code

#### Creating Maintenance Record
```javascript
// BEFORE ❌
const [printer] = await db.query(
    `SELECT inv.id, upa.user_id as requester_id
     FROM printers inv
     INNER JOIN user_printer_assignments upa ON upa.printer_id = inv.id
     WHERE inv.id = ?`,
    [printer_id]
);

const insertQuery = `
    INSERT INTO voluntary_services (
        technician_id,
        printer_id,
        institution_id,
        requester_id,
        service_description,
        parts_used,
        status,
        coordinator_approval_status,
        requester_approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending_coordinator', 'pending', 'pending')
`;

// AFTER ✅
const insertQuery = `
    INSERT INTO voluntary_services (
        technician_id,
        printer_id,
        institution_id,
        service_description,
        parts_used,
        completion_photo,
        status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
`;

const [result] = await db.query(insertQuery, [
    technicianId,
    printer_id,
    institution_id,
    service_description,
    JSON.stringify(parts_used),
    completion_photo || null
]);
```

#### Approval Logic
```javascript
// BEFORE ❌
if (approverRole === 'institution_admin') {
    await db.query(
        `UPDATE voluntary_services 
         SET coordinator_approval_status = ?,
             coordinator_reviewed_by = ?,
             coordinator_reviewed_at = NOW(),
             coordinator_notes = ?
         WHERE id = ?`,
        [decision, approverId, notes, serviceId]
    );
} else if (approverRole === 'institution_user') {
    await db.query(
        `UPDATE voluntary_services 
         SET requester_approval_status = ?,
             requester_reviewed_by = ?,
             requester_reviewed_at = NOW(),
             requester_notes = ?
         WHERE id = ?`,
        [decision, approverId, notes, serviceId]
    );
}

// AFTER ✅
// Single approval workflow - only institution admin
await db.query(
    `UPDATE voluntary_services 
     SET status = ?,
         approved_by_institution_admin = ?,
         institution_admin_approved_at = NOW(),
         institution_admin_notes = ?
     WHERE id = ?`,
    [decision, approverId, notes, serviceId]
);
```

#### Frontend Display
```javascript
// BEFORE ❌
<td>
    <span class="badge badge-${getCoordinatorStatusColor(service.coordinator_approval_status)}">
        Coordinator: ${service.coordinator_approval_status}
    </span>
    <span class="badge badge-${getRequesterStatusColor(service.requester_approval_status)}">
        Requester: ${service.requester_approval_status}
    </span>
</td>

// AFTER ✅
<td>
    <span class="badge badge-${getStatusColor(service.status)}">
        ${service.status.charAt(0).toUpperCase() + service.status.slice(1)}
    </span>
</td>
```

## Search Patterns for Code Updates

Use these patterns to find code that needs updating:

```bash
# In PowerShell/Terminal:
cd c:\Users\marki\Desktop\SE

# Find all requester references
grep -r "requester_id" server/
grep -r "requester_approval" server/
grep -r "requester_notes" server/

# Find all coordinator references
grep -r "coordinator_approval" server/
grep -r "coordinator_notes" server/
grep -r "coordinator_reviewed" server/

# Find old status values
grep -r "pending_coordinator" server/
grep -r "pending_requester" server/
grep -r "approved_coordinator" server/
```

## Testing Checklist

After code updates, test these scenarios:

- [ ] Technician can submit maintenance service
- [ ] Institution admin receives notification
- [ ] Institution admin can view pending maintenance
- [ ] Institution admin can approve maintenance
- [ ] Institution admin can reject maintenance
- [ ] Parts are deducted on approval
- [ ] Technician sees approval notification
- [ ] Service appears in history
- [ ] Photos upload correctly
- [ ] Status updates correctly

## Common Issues & Solutions

### Issue: Column doesn't exist
```
Error: Unknown column 'requester_id' in 'field list'
```
**Solution:** You have old code referencing removed columns. Search and update.

### Issue: Enum value invalid
```
Error: Data truncated for column 'status' at row 1
```
**Solution:** You're using old status values like 'pending_coordinator'. Use 'pending' instead.

### Issue: Foreign key constraint fails
```
Error: Cannot add or update a child row: a foreign key constraint fails
```
**Solution:** Ensure `approved_by_institution_admin` references a valid user ID.

---

**Quick Tip:** Use your IDE's "Find and Replace" feature to update column names across all files quickly!
