# Institution System Reverted to Original Architecture

## Date: October 16, 2025

## Summary
Successfully reverted the system back to the original institution architecture where coordinators own institutions through the `institutions.user_id` column, instead of users belonging to institutions through a `users.institution_id` column.

## Database Changes

### 1. Removed from `users` table:
- ❌ Dropped column: `institution_id` (VARCHAR(50))
- ❌ Dropped foreign key: `fk_users_institution`

### 2. Using `institutions` table:
- ✅ Column: `user_id` (INT) - Points to The institution_admin who owns the institution
- ✅ This is the ORIGINAL design and is now being used

## How It Works Now

### Registration Flow:
1. Coordinator fills out registration form with institution details
2. Institution is created in `institutions` table
3. User is created in `users` table (WITHOUT institution_id)
4. `institutions.user_id` is updated to point to the new user's ID
5. Result: The institution knows who owns it

### Login Flow:
1. User logs in
2. System queries: `SELECT * FROM institutions WHERE user_id = ?`
3. Returns the institution owned by that user
4. User data includes institution information

### Data Relationships:
```
users (id: 64, email: "markivan.night@gmail.com", role: "institution_admin")
  ↑
  |
institutions (institution_id: "INST-017", name: "Pajo Elementary School", user_id: 64)
```

The arrow points UP because institutions reference users, not the other way around.

## Code Changes

### 1. `server/models/User.js`
**createUser() method:**
- Removed: `institution_id` from INSERT statement
- Added: UPDATE institutions SET user_id = ? after user creation
```javascript
// Insert user WITHOUT institution_id
const [result] = await db.query(
    `INSERT INTO users (first_name, last_name, email, password, role, is_email_verified, approval_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [firstName, lastName, email, hashedPassword, role, false, 'pending']
);

// Link institution to user
if (role === 'institution_admin' && institutionId) {
    await db.query(
        'UPDATE institutions SET user_id = ? WHERE institution_id = ?',
        [userId, institutionId]
    );
}
```

**getPendingUsers() method:**
- Changed JOIN: `LEFT JOIN institutions i ON i.user_id = u.id`
- Was: `LEFT JOIN institutions i ON u.institution_id = i.institution_id`

### 2. `server/index.js`
**POST /api/login:**
- Already correct: `WHERE user_id = ?`

**GET /api/coordinators:**
- Changed JOIN: `LEFT JOIN institutions i ON i.user_id = u.id`
- Was: `LEFT JOIN institutions i ON u.institution_id = i.institution_id`

**GET /api/coordinators/:id:**
- Changed JOIN: `LEFT JOIN institutions i ON i.user_id = u.id`
- Was: `LEFT JOIN institutions i ON u.institution_id = i.institution_id`

**Server startup:**
- Removed: Code that was adding institution_id column to users table

## Migration Performed

### Script: `revert_to_original_institution_system.js`
1. Migrated data: Copied user 64's institution_id to institutions.user_id
2. Dropped foreign key constraint
3. Dropped users.institution_id column

### Script: `drop_institution_id_column.js`
- Cleaned up any remaining foreign keys
- Removed institution_id column completely

## Verification

### Current State (User 64):
- **users table:** id=64, email="markivan.night@gmail.com", role="institution_admin"
- **institutions table:** institution_id="INST-017", name="Pajo Elementary School", user_id=64

### Test Results:
✅ institutions.user_id = 64 (correctly linked)
✅ Login query returns "Pajo Elementary School"
✅ Coordinator list shows institution name
✅ Pending users query works correctly
✅ users.institution_id column removed

## Benefits of Original System

1. **Clear Ownership:** One coordinator owns one institution
2. **Simple Registration:** Create user, then link to institution
3. **Natural Relationship:** Institutions "belong to" users (not users "belong to" institutions)
4. **Single Source of Truth:** institutions.user_id is the only link
5. **No Redundancy:** Data exists in one place

## Next Registration

When a new coordinator registers:
1. Institution record created with `user_id = NULL`
2. User record created
3. `UPDATE institutions SET user_id = [new_user_id]`
4. Institution now "owned" by that coordinator

## Files Modified
- `server/models/User.js` - Updated createUser() and getPendingUsers()
- `server/index.js` - Updated coordinator endpoints and removed schema migration code

## Test Scripts Created
- `revert_to_original_institution_system.js` - Migration script
- `drop_institution_id_column.js` - Column cleanup script
- `test_original_system.js` - Verification script
- `check_institution_data.js` - Data inspection script

## Status
✅ **COMPLETE** - System successfully reverted to original architecture

