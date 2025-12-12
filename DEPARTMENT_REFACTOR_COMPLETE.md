# Department Field Refactor - Complete Implementation

**Date:** December 12, 2024  
**Status:** ✅ COMPLETE - Ready for SQL Migration

## Overview
Refactored the department field handling to match the location field pattern:
- **Single source of truth:** `printers.department` (not `user_printer_assignments.department`)
- **Smart auto-fill:** Auto-fills in service requests if printer has saved department
- **User updates allowed:** Both `institution_admin` and `institution_user` can update department via service requests
- **Removed from registration:** Department no longer collected during user registration

---

## Changes Made

### 1. SQL Migration File Created ✅
**File:** `remove_department_from_user_printer_assignments.sql`

**Action Required:** Run this SQL script in MySQL Workbench to drop the department column from `user_printer_assignments` table.

```sql
-- This will safely check and drop the column if it exists
-- Run this script manually in MySQL Workbench
```

---

### 2. Frontend Changes ✅

#### A. Institution User Registration Form
**File:** `client/src/pages/requester-register.html`

**Changes:**
- ❌ Removed department input field from Step 1 (personal info)
- ❌ Removed department from form submission payload

**Impact:** New users no longer provide department during registration

---

#### B. Institution User Service Request Form
**File:** `client/src/pages/institution_user/institution-user-request.html`

**Changes:**
- ✅ Added department input field with smart auto-fill logic (same as location)
- ✅ Added `departmentRequired` span (hidden by default)
- ✅ Added `departmentHint` paragraph for dynamic hints
- ✅ Added `rq-department-error` validation message

**Features:**
- Department auto-fills if printer has saved department
- Shows "✓ Department saved. Edit if changed." when auto-filled
- Shows "⚠️ Please provide the department/office" when missing
- Required field indicator appears only if no saved department

---

#### C. Institution User JavaScript Logic
**File:** `client/src/js/institution-user-app.js`

**Changes:**
- ✅ Added `opt.dataset.department` to store department from API
- ✅ Added department auto-fill logic in printer select event listener
- ✅ Added department validation in `submitRequestForm()`
- ✅ Added department to service request payload

**Smart Detection Logic:**
```javascript
// When user selects printer:
- If printer.department exists → auto-fill, make optional, show green hint
- If no printer.department → clear field, make required, show orange warning

// On form submit:
- Validate department only if departmentRequired span is visible
- Include department in payload: department: department?.value?.trim() || null
```

---

### 3. Backend Changes ✅

#### A. User Registration Endpoint
**File:** `server/routes/requester-registration.js`

**Changes:**
- ❌ Removed `department` from request body destructuring (line 199)
- ❌ Removed `department` column from user_printer_assignments INSERT query (line 338-340)
- ❌ Removed `department` query from user_printer_assignments in reject endpoint (line 547-548)
- ❌ Removed `department` from institution_user_registration_history INSERT (line 551-553)
- ❌ Removed `department` from edit user endpoint UPDATE query (line 649-651)

**Impact:** 
- New users are not assigned department in user_printer_assignments
- Edit user endpoint no longer tries to update non-existent department column
- History tracking no longer references user_printer_assignments.department

---

#### B. Service Request Endpoints
**File:** `server/index.js`

**Changes:**

1. **GET /api/users/me/printers** (line 3179-3190)
   - Changed: `upa.department` → `ii.department`
   - Now fetches department from printers table

2. **POST /api/service-requests** (line 3368-3374)
   - Removed role restriction: `req.user.role === 'institution_admin'`
   - Now allows both `institution_admin` and `institution_user` to update department
   - Updated log message to include role: `${req.user.role}`

3. **GET /api/institution_admins/:institution_adminId/institution_users** (line 1790)
   - Changed: `upa.department` → `ii.department`
   - Now fetches department from printers table

4. **PUT /api/institution_admins/:institution_adminId/institution_users/:userId** (line 2054-2059)
   - Changed: `upa.department` → `ii.department`
   - Reordered SELECT to put department after printer_name
   - Now fetches department from printers table

**Impact:**
- All API responses now return department from printers table
- Both admin and user roles can update printer department
- Department updates are saved to printers table only

---

#### C. Pending Registrations Endpoint
**File:** `server/routes/requester-registration.js`

**Changes:**
- Changed JSON_OBJECT: `cpa.department` → `ii.department` (line 420)
- Now shows department from printers table in pending registration details

---

## Database Schema Changes

### Before:
```
user_printer_assignments table:
├── user_id
├── printer_id
├── institution_id
├── department          ← TO BE REMOVED
└── assigned_at

printers table:
├── id
├── serial_number
├── brand
├── model
├── location
├── department          ← SINGLE SOURCE OF TRUTH
└── ...
```

### After:
```
user_printer_assignments table:
├── user_id
├── printer_id
├── institution_id
└── assigned_at         ← department removed

printers table:
├── id
├── serial_number
├── brand
├── model
├── location
├── department          ← SINGLE SOURCE OF TRUTH
└── ...
```

---

## User Flow

### Institution User Registration Flow (NEW)
1. User fills personal info (first name, last name, email) - **NO DEPARTMENT**
2. User provides printer serial numbers
3. System creates user without department in user_printer_assignments
4. User approved by admin
5. User logs in

### Service Request Submission Flow (UPDATED)
1. User selects printer from dropdown
2. **Smart detection triggers:**
   - If `printer.department` exists:
     - Auto-fills department field
     - Shows green hint: "✓ Department saved. Edit if changed."
     - Makes field optional
   - If `printer.department` is empty:
     - Clears department field
     - Shows orange warning: "⚠️ Please provide the department/office"
     - Makes field required
3. User submits request
4. Backend updates `printers.department` if value provided
5. Next request auto-fills with updated department

---

## Testing Checklist

### ✅ Pre-Migration Tests
- [x] Frontend code changes applied
- [x] Backend code changes applied
- [x] No syntax errors in modified files
- [x] All references to `upa.department` and `cpa.department` updated

### ⏳ Post-Migration Tests (After SQL execution)
- [ ] Run SQL migration: `remove_department_from_user_printer_assignments.sql`
- [ ] Verify column dropped: Check MySQL Workbench table structure
- [ ] Test institution user registration: Verify no department field shown
- [ ] Test institution user login: Verify can access dashboard
- [ ] Test GET /api/users/me/printers: Returns department from printers table
- [ ] Test service request (with department): Auto-fills if printer has department
- [ ] Test service request (without department): Shows required field indicator
- [ ] Test department update by institution_user: Saves to printers table
- [ ] Test department update by institution_admin: Saves to printers table
- [ ] Test second service request: Department auto-fills from previous update

---

## Deployment Steps

### Step 1: SQL Migration (REQUIRED)
```bash
# Open MySQL Workbench
# Connect to Railway database
# Open file: remove_department_from_user_printer_assignments.sql
# Execute script
# Verify: SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_printer_assignments';
```

### Step 2: Restart Server
```bash
# Since backend code changed, restart the Node.js server
cd server
node index.js
```

### Step 3: Clear Browser Cache
- Users should clear cache or hard refresh (Ctrl+Shift+R)
- JavaScript changes will take effect

### Step 4: Verification
- Test registration flow
- Test service request flow with both roles
- Verify department saves to printers table

---

## Rollback Plan

If issues occur, rollback steps:

1. **Re-add column to user_printer_assignments:**
```sql
ALTER TABLE user_printer_assignments 
ADD COLUMN department VARCHAR(100) AFTER institution_id;
```

2. **Revert code changes:**
```bash
git revert HEAD~1
```

3. **Restart server**

---

## Files Modified

### Frontend (3 files)
1. `client/src/pages/requester-register.html` - Removed department from registration
2. `client/src/pages/institution_user/institution-user-request.html` - Added department with smart logic
3. `client/src/js/institution-user-app.js` - Added department auto-fill and validation

### Backend (2 files)
1. `server/index.js` - Updated 4 endpoints to use printers.department
2. `server/routes/requester-registration.js` - Removed department from registration, history, and edit

### SQL (1 file)
1. `remove_department_from_user_printer_assignments.sql` - Migration script

---

## Summary

This refactor achieves 100% consistency with the location field implementation:

| Feature | Location Field | Department Field |
|---------|---------------|------------------|
| Source of Truth | `printers.location` | `printers.department` |
| Registration | Not collected | Not collected |
| Service Request | Smart auto-fill | Smart auto-fill |
| Admin Update | ✅ Allowed | ✅ Allowed |
| User Update | ✅ Allowed | ✅ Allowed |
| Required When | Missing from printer | Missing from printer |
| Saved To | `printers` table | `printers` table |

**Status:** Ready for production deployment after SQL migration.
