# Coordinator User Creation - Fixed

## Issue Summary
When coordinators tried to create users, the system threw an error:
```
Error: Unknown column 'institution_id' in 'field list'
```

The query was trying to access `users.institution_id` and `users.institution_name` which don't exist in the database.

## Root Cause
The code was using the OLD architecture where users had `institution_id` and `institution_name` columns. However, the system was reverted to the ORIGINAL architecture where:

- ✅ **`institutions.user_id`** → Points to the coordinator who owns that institution
- ❌ **`users.institution_id`** → Does NOT exist (was removed)

## Architecture (Correct)
```
Coordinator (users.id = 65)
    ↑
    │ owns
    │
Institution (institutions.institution_id = "INST-017")
         (institutions.user_id = 65)
         (institutions.name = "School Name")
```

## Files Fixed

### `/server/index.js`

#### 1. POST `/api/coordinators/:id/users` - Create User Endpoint (Lines ~908-957)

**Before:**
```javascript
// ❌ Trying to query non-existent columns
const [coordRows] = await db.query(
    'SELECT institution_id, institution_name FROM users WHERE id = ?', 
    [coordinatorId]
);
let coordinatorInstitutionId = coordRows && coordRows[0] ? coordRows[0].institution_id : null;

// ❌ Trying to INSERT into non-existent column
INSERT INTO users (..., institution_id, ...)
VALUES (..., ?, ...)
```

**After:**
```javascript
// ✅ Query institutions table where user_id = coordinator
const [institutionRows] = await db.query(
    'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
    [coordinatorId]
);
let coordinatorInstitutionId = institutionRows[0]?.institution_id;

// ✅ Don't include institution_id in users INSERT
INSERT INTO users (first_name, last_name, email, password, role, ...)
VALUES (?, ?, ?, ?, ?, ...)
// Institution association handled via user_printer_assignments.institution_id
```

#### 2. GET `/api/coordinators/:id/users` - Get Users for Institution (Lines ~1065-1145)

**Before:**
```javascript
// ❌ Trying to query non-existent columns
const [coordRows] = await db.query(
    'SELECT institution_id, institution_name FROM users WHERE id = ?',
    [coordinatorId]
);

// ❌ Filtering by non-existent column
SELECT ... FROM users u
WHERE u.institution_id = ?
```

**After:**
```javascript
// ✅ Query institutions table
const [institutionRows] = await db.query(
    'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
    [coordinatorId]
);

// ✅ Filter by institution_id in user_printer_assignments
SELECT ... 
FROM user_printer_assignments upa
JOIN users u ON upa.user_id = u.id
WHERE upa.institution_id = ?
```

#### 3. GET `/api/coordinators/pending` - Get Pending Coordinators (Lines ~1290-1320)

**Before:**
```javascript
// ❌ Trying to SELECT non-existent columns
SELECT 
    u.institution_name as institution,
    u.institution_type,
    u.institution_address
FROM users u
WHERE u.institution_name LIKE ?
```

**After:**
```javascript
// ✅ JOIN with institutions table
SELECT 
    COALESCE(i.name, '') as institution,
    COALESCE(i.type, '') as institution_type,
    COALESCE(i.address, '') as institution_address
FROM users u 
LEFT JOIN institutions i ON i.user_id = u.id
WHERE i.name LIKE ?
```

#### 4. Fetch New User Row (Line ~953)

**Before:**
```javascript
// ❌ Trying to SELECT non-existent columns
SELECT id, first_name, last_name, email, role, institution_id, institution_name, department 
FROM users WHERE id = ?
```

**After:**
```javascript
// ✅ Only select columns that exist
SELECT id, first_name, last_name, email, role 
FROM users WHERE id = ?
```

## Database Schema Reference

### `users` Table (Actual Columns):
- id
- first_name
- last_name
- email
- password
- role
- is_email_verified
- status
- created_at
- updated_at
- approval_status

**NO** `institution_id`, **NO** `institution_name`, **NO** `institution_type`, **NO** `institution_address`

### `institutions` Table:
- id
- **institution_id** (VARCHAR, unique)
- **user_id** (INT) ← Links to coordinator
- name
- type
- address
- status
- created_at
- updated_at

### `user_printer_assignments` Table:
- id
- user_id → users.id
- inventory_item_id → inventory_items.id
- **institution_id** → institutions.institution_id (This is where user-institution link happens)
- department
- assigned_at

## How It Works Now

### Coordinator Creates a User:
1. Coordinator logs in (user_id = 65)
2. System queries: `SELECT institution_id FROM institutions WHERE user_id = 65`
3. Gets `INST-017` as the coordinator's institution
4. Creates new user in `users` table (NO institution_id)
5. If printer assigned: Creates `user_printer_assignments` record with `institution_id = 'INST-017'`
6. Result: User is associated with institution through the printer assignment

### Coordinator Views Their Users:
1. System queries: `SELECT institution_id FROM institutions WHERE user_id = 65`
2. Gets `INST-017`
3. Queries: `SELECT ... FROM user_printer_assignments WHERE institution_id = 'INST-017'`
4. Returns all users who have printer assignments in that institution

## Testing
The coordinator user creation should now work without SQL errors:
- ✅ POST `/api/coordinators/:id/users` - Create new requester user
- ✅ GET `/api/coordinators/:id/users` - View users in coordinator's institution
- ✅ GET `/api/coordinators/pending` - Admin view pending coordinator approvals

## Date Fixed
October 16, 2025

## Related Documentation
- `INSTITUTION_SYSTEM_REVERTED.md` - Original architecture restoration
- `INSTITUTION_OWNERSHIP_MIGRATION_COMPLETE.md` - Migration history
