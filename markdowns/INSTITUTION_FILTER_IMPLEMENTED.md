# Institution Filter Implementation

## Problem
Previously, the registration page displayed all institutions, including those already assigned to users. This could cause conflicts and confusion during registration.

## Solution Implemented

### Backend Changes
Modified the `/api/institutions/public` endpoint in `server/index.js` to filter institutions:

**Before:**
```javascript
const [rows] = await db.query(
    'SELECT institution_id, name, type, address FROM institutions ORDER BY name ASC'
);
```

**After:**
```javascript
const [rows] = await db.query(
    'SELECT institution_id, name, type, address FROM institutions 
     WHERE user_id IS NULL AND status = "active" 
     ORDER BY name ASC'
);
```

### Filtering Logic
The endpoint now only returns institutions that:
1.  Have **no user assigned** (`user_id IS NULL`)
2.  Are **active** (`status = "active"`)
3.  Are **sorted alphabetically** by name

### Test Results
From the database check:
- **Available institutions**: 1 (Cebu Technological University)
- **Already used institutions**: 3
  - Pajo Elementary School (assigned to user_id: 65)
  - Cebu Doctors' University (assigned to user_id: 68)
  - Cebu Provincial Capitol (assigned to user_id: 70)

## Impact
- Users registering will only see institutions available for registration
- Prevents duplicate institution assignments
- Cleaner user experience during registration
- Automatically filters deactivated institutions

## Files Modified
1. `server/index.js` - Updated `/api/institutions/public` endpoint

## Testing
Run the test script to verify:
```bash
node test_available_institutions.js
```

## Status
 **COMPLETE** - The registration dropdown now only shows available institutions.
