# institution_admin user Management - Complete Fix

## Date: October 16, 2025

## Issues Fixed

### 1.  **Coordinator Cannot Create Users**
**Error:** `Unknown column 'institution_id' in 'field list'`
**Location:** `POST /api/coordinators/:id/users`

### 2.  **Coordinator Cannot Deactivate Users**
**Error:** `Unknown column 'institution_id' in 'field list'`
**Location:** `PATCH /api/coordinators/:id/users/:userId/status`

### 3.  **Coordinator Cannot Edit Users**
**Error:** `Unknown column 'institution_id' in 'field list'`
**Location:** `PUT /api/coordinators/:id/users/:userId`

### 4.  **Admin Cannot View Pending Coordinators**
**Error:** `Unknown column 'institution_name' in 'field list'`
**Location:** `GET /api/coordinators/pending`

### 5.  **Technician Inventory API Errors**
**Error:** `Unknown column 'pp.description' in 'field list'`
**Location:** Multiple routes in `technician-inventory.js`

## Root Cause

The codebase was inconsistently using TWO different architectures:

###  **OLD/WRONG Architecture (what the broken code was trying to use):**
```
users table has: institution_id, institution_name, institution_type, institution_address
institutions table has: institution_id, name, type, address
```

###  **CORRECT Architecture (what actually exists):**
```
users table has: id, first_name, last_name, email, role, status, approval_status
institutions table has: institution_id, name, type, address, user_id (FK to users.id)
```

**Key Principle:** `institutions.user_id` points to The institution_admin who OWNS that institution.

## Files Fixed

### 1. `/server/index.js` - 5 Endpoints Fixed

#### A. **POST `/api/coordinators/:id/users`** (Create User)
**Before:**
```javascript
const [coordRows] = await db.query(
    'SELECT institution_id, institution_name FROM users WHERE id = ?', 
    [coordinatorId]
);
let coordinatorInstitutionId = coordRows[0].institution_id;
```

**After:**
```javascript
const [institutionRows] = await db.query(
    'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
    [coordinatorId]
);
const coordinatorInstitutionId = institutionRows[0].institution_id;
```

**Also Fixed:**
- Removed `institution_id` from `INSERT INTO users` statement
- Removed `institution_id`, `institution_name`, `department` from user SELECT query

#### B. **GET `/api/coordinators/:id/users`** (View Institution Users)
**Before:**
```javascript
WHERE u.institution_id = ?
```

**After:**
```javascript
FROM user_printer_assignments upa
JOIN users u ON upa.user_id = u.id
WHERE upa.institution_id = ?
```

**Logic:** Users don't have institution_id, but printer assignments do.

#### C. **PATCH `/api/coordinators/:id/users/:userId/status`** (Deactivate/Activate)
**Before:**
```javascript
const [coordRows] = await db.query(
    'SELECT institution_id, institution_name FROM users WHERE id = ?', 
    [coordinatorId]
);
// ... then check user's institution_id
const [targetRows] = await db.query(
    'SELECT id, institution_id FROM users WHERE id = ?', 
    [userId]
);
```

**After:**
```javascript
const [institutionRows] = await db.query(
    'SELECT institution_id FROM institutions WHERE user_id = ?', 
    [coordinatorId]
);
// Verify via printer assignments
const [targetAssignments] = await db.query(
    'SELECT user_id FROM user_printer_assignments WHERE user_id = ? AND institution_id = ?', 
    [userId, coordinatorInstitutionId]
);
```

#### D. **PUT `/api/coordinators/:id/users/:userId`** (Edit User)
Same fix as status update - get institution from `institutions.user_id`, verify via assignments.

#### E. **GET `/api/coordinators/pending`** (Admin View)
**Before:**
```javascript
SELECT 
    u.institution_name,
    u.institution_type,
    u.institution_address
FROM users u
```

**After:**
```javascript
SELECT 
    i.name as institution,
    i.type as institution_type,
    i.address as institution_address
FROM users u
LEFT JOIN institutions i ON i.user_id = u.id
```

### 2. `/server/routes/technician-inventory.js` - 4 Queries Fixed

**Removed non-existent columns:**
- `pp.description` 
- `pp.part_number` 
- `compatible_printers` 

**Printer_parts table actual columns:**
-  id, name, brand, category, part_type, quantity, unit, minimum_stock, status

### 3. `/server/routes/technician-history.js` - 1 Query Fixed

**Removed:**
- `pp.part_number`
- `pp.description`

## Database Architecture Reference

### Users Table
```sql
users (
    id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    password VARCHAR(255),
    role ENUM('admin','institution_admin','technician','institution_user'),
    status ENUM('active','inactive'),
    approval_status ENUM('pending','approved','rejected'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Institutions Table
```sql
institutions (
    id INT PRIMARY KEY,
    institution_id VARCHAR(50) UNIQUE,
    user_id INT,  -- Points to coordinator who owns this institution
    name VARCHAR(100),
    type VARCHAR(50),
    address TEXT,
    status ENUM('active','deactivated'),
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### User Printer Assignments Table
```sql
user_printer_assignments (
    id INT PRIMARY KEY,
    user_id INT,
    inventory_item_id INT,
    institution_id VARCHAR(50),  -- Associates assignment with institution
    department VARCHAR(100),
    assigned_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id)
)
```

## How It Works Now

### 1. **Coordinator Creates User:**
```
1. Get coordinator's institution: SELECT * FROM institutions WHERE user_id = [coordinator_id]
2. Create user: INSERT INTO users (no institution_id)
3. Create printer assignment: INSERT INTO user_printer_assignments 
   (user_id, inventory_item_id, institution_id, department)
4. The institution_id in the assignment links the user to the institution
```

### 2. **Coordinator Views Their Users:**
```
1. Get coordinator's institution: institutions WHERE user_id = [coordinator_id]
2. Get users via assignments: 
   SELECT u.*, upa.* 
   FROM user_printer_assignments upa
   JOIN users u ON upa.user_id = u.id
   WHERE upa.institution_id = [coordinator_institution_id]
```

### 3. **Coordinator Deactivates User:**
```
1. Get coordinator's institution_id
2. Verify user belongs to that institution via user_printer_assignments
3. UPDATE users SET status = 'inactive' WHERE id = [user_id]
```

### 4. **Coordinator Edits User:**
```
1. Get coordinator's institution_id
2. Verify user belongs to that institution
3. UPDATE users SET first_name=?, last_name=?, email=?
4. UPDATE user_printer_assignments if printer/department changed
```

## Testing Checklist

- [x] Coordinator can create users
- [x] Created users appear in coordinator's user list
- [x] Coordinator can view user list
- [x] Coordinator can deactivate users
- [x] Coordinator can edit user details
- [x] Coordinator can change user's assigned printer
- [x] Admin can view pending coordinators
- [x] Technician inventory loads without errors
- [x] Parts approval system works correctly

## Server Status
 Server running on http://0.0.0.0:3000
 No SQL column errors
 All database queries align with actual schema

## Date Completed
October 16, 2025


