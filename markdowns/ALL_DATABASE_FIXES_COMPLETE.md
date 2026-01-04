# Complete Database Schema Fix - All Issues Resolved

## Date: October 16, 2025

## Summary
Fixed all SQL errors caused by queries referencing non-existent columns in the database. The root cause was code inconsistently using TWO different architectures for institution association.

---

## 🏗️ Correct Database Architecture

### Users Table (NO institution columns)
```sql
users (
    id, first_name, last_name, email, password, role, 
    status, approval_status, created_at, updated_at
)
```

### Institutions Table (user_id links to coordinator)
```sql
institutions (
    id, institution_id, user_id,  -- user_id = coordinator who OWNS this
    name, type, address, status, created_at
)
```

### User Printer Assignments (institution_id links user to institution)
```sql
user_printer_assignments (
    id, user_id, inventory_item_id, 
    institution_id,  -- Links user to institution through printer assignment
    department, assigned_at
)
```

### Printer Parts Table (NO description/part_number)
```sql
printer_parts (
    id, name, brand, category, part_type, 
    quantity, unit, minimum_stock, status, 
    created_at, updated_at
)
```

---

## 🐛 Issues Fixed

### 1.  Parts Inventory System
**Files:** `server/routes/technician-inventory.js`, `server/routes/technician-history.js`

**Errors Fixed:**
- `Unknown column 'pp.description'`
- `Unknown column 'pp.part_number'`
- `Unknown column 'compatible_printers'`

**Solution:** Removed references to non-existent columns in printer_parts table.

---

### 2.  institution_admin user Creation
**File:** `server/index.js` - `POST /api/coordinators/:id/users`

**Error Fixed:**
- `Unknown column 'institution_id' in 'field list'` when querying users table
- `Unknown column 'institution_id' in 'field list'` when inserting into users table

**Before:**
```javascript
const [coordRows] = await db.query(
    'SELECT institution_id FROM users WHERE id = ?', [coordinatorId]
);
INSERT INTO users (..., institution_id) VALUES (...)
```

**After:**
```javascript
const [institutionRows] = await db.query(
    'SELECT institution_id FROM institutions WHERE user_id = ?', [coordinatorId]
);
INSERT INTO users (first_name, last_name, email, ...) VALUES (...)
// institution_id goes in user_printer_assignments, not users
```

---

### 3.  View Users Under Coordinator
**File:** `server/index.js` - `GET /api/coordinators/:id/users`

**Error Fixed:**
- `Unknown column 'institution_id' in users table

**Before:**
```javascript
FROM users u
WHERE u.institution_id = ?
```

**After:**
```javascript
FROM user_printer_assignments upa
JOIN users u ON upa.user_id = u.id
WHERE upa.institution_id = ?
```

**Logic:** Users don't have institution_id; get them via their printer assignments.

---

### 4.  Deactivate/Activate User
**File:** `server/index.js` - `PATCH /api/coordinators/:id/users/:userId/status`

**Error Fixed:**
- `Unknown column 'institution_id'` when checking coordinator's institution
- `Unknown column 'institution_id'` when verifying user belongs to institution

**Solution:** Get institution from `institutions.user_id`, verify user via `user_printer_assignments`.

---

### 5.  Edit User Details
**File:** `server/index.js` - `PUT /api/coordinators/:id/users/:userId`

**Errors Fixed:**
- `Unknown column 'institution_id'` when getting coordinator's institution
- `Unknown column 'department'` when updating users table

**Before:**
```javascript
UPDATE users SET first_name=?, ..., department=? WHERE id=?
SELECT ..., department FROM users WHERE id=?
```

**After:**
```javascript
UPDATE users SET first_name=?, last_name=?, email=? WHERE id=?
// department is in user_printer_assignments, not users
UPDATE user_printer_assignments SET department=? WHERE user_id=?
```

---

### 6.  Admin View Pending Coordinators
**File:** `server/index.js` - `GET /api/coordinators/pending`

**Errors Fixed:**
- `Unknown column 'institution_name'` in users table
- `Unknown column 'institution_type'` in users table
- `Unknown column 'institution_address'` in users table

**Before:**
```javascript
SELECT u.institution_name, u.institution_type, u.institution_address
FROM users u
```

**After:**
```javascript
SELECT i.name as institution, i.type as institution_type, i.address as institution_address
FROM users u
LEFT JOIN institutions i ON i.user_id = u.id
```

---

### 7.  Create Service Request (institution_user)
**File:** `server/routes/service-requests.js` - `POST /`

**Error Fixed:**
- Institution Users couldn't create service requests because code tried to get institution from `institutions.user_id`

**Before:**
```javascript
if (actorRole === 'institution_user') {
    const [instRows] = await db.query(
        'SELECT institution_id FROM institutions WHERE user_id = ?', [actorId]
    );
}
```

**After:**
```javascript
if (actorRole === 'institution_user') {
    // Requesters don't own institutions - get from printer assignment
    const [assignRows] = await db.query(
        'SELECT institution_id FROM user_printer_assignments WHERE user_id = ?', [actorId]
    );
}
```

---

### 8.  View Service Requests (institution_user)
**File:** `server/index.js` - `GET /api/users/me/service-requests`

**Error Fixed:**
- `Unknown column 'institution_id'` when querying users table

**Before:**
```javascript
const [userRows] = await db.query(
    'SELECT institution_id FROM users WHERE id = ?', [userId]
);
```

**After:**
```javascript
if (userRole === 'institution_user') {
    const [assignRows] = await db.query(
        'SELECT institution_id FROM user_printer_assignments WHERE user_id = ?', [userId]
    );
}
```

---

## 🔑 Key Architectural Principles

### for institution_admins:
```
Coordinator (users.id=65)
    ↑
    | owns
    |
Institution (institutions.institution_id='INST-017', user_id=65)
```
**Query:** `SELECT institution_id FROM institutions WHERE user_id = ?`

### for institution_users:
```
Requester (users.id=66)
    |
    | assigned via
    ↓
User Printer Assignment (institution_id='INST-017', user_id=66)
    ↓
Institution (institutions.institution_id='INST-017')
```
**Query:** `SELECT institution_id FROM user_printer_assignments WHERE user_id = ?`

### For Technicians:
- Can be associated with multiple institutions via `technician_assignments`
- May also own an institution via `institutions.user_id` (if they're also An institution_admin)

---

##  Files Modified

1. `server/routes/technician-inventory.js` - 4 queries fixed
2. `server/routes/technician-history.js` - 1 query fixed
3. `server/routes/service-requests.js` - 1 endpoint fixed
4. `server/index.js` - 6 endpoints fixed:
   - POST `/api/coordinators/:id/users` (create user)
   - GET `/api/coordinators/:id/users` (view users)
   - PATCH `/api/coordinators/:id/users/:userId/status` (deactivate/activate)
   - PUT `/api/coordinators/:id/users/:userId` (edit user)
   - GET `/api/coordinators/pending` (admin view)
   - GET `/api/users/me/service-requests` (requester view)

---

##  Testing Checklist - ALL PASSING

### Parts Management
- [x] Technician can view personal inventory
- [x] Technician can request parts
- [x] Admin can approve parts requests
- [x] Approved parts appear in technician inventory

### Coordinator Features
- [x] Coordinator can create users
- [x] Coordinator can view their users
- [x] Coordinator can deactivate users
- [x] Coordinator can activate users
- [x] Coordinator can edit user details
- [x] Coordinator can change user's printer assignment
- [x] Coordinator can update department

### Requester Features
- [x] Requester can create service requests
- [x] Requester can view their service requests
- [x] Service requests are assigned to correct technician
- [x] Notifications are sent to assigned technician

### Admin Features
- [x] Admin can view pending coordinators
- [x] Admin can approve/reject coordinators

---

## 🚀 Server Status
 Server running on http://0.0.0.0:3000
 All database queries use correct schema
 No SQL column errors
 All functionality tested and working

## 📅 Completion Date
October 16, 2025


