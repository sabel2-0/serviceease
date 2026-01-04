# Service Request Requester Name Fix

## Date: October 16, 2025

## Issues Fixed

### 1.  Service Requests Showing Wrong Name
**Problem:** Institution User's service request history was showing the technician's name ("Razor Axe") instead of The institution_user's name.

**Root Cause:** Frontend was displaying `technician_first_name` and `technician_last_name` instead of The institution_user's name.

**Files Changed:**
- `client/src/js/requester-app.js` - Line 342-344

**Before:**
```javascript
const techName = req.technician_first_name && req.technician_last_name 
  ? `${req.technician_first_name} ${req.technician_last_name}`
  : 'Not assigned';
// ...
<div>👤 ${techName}</div>
```

**After:**
```javascript
const requesterName = req.requester_first_name && req.requester_last_name 
  ? `${req.requester_first_name} ${req.requester_last_name}`
  : 'Unknown';
// ...
<div>👤 ${requesterName}</div>
```

---

### 2.  Requester Seeing Other Users' Service Requests
**Problem:** Institution User was seeing service requests made by coordinator (Request #137 made by user 65 was showing for user 66).

**Root Cause:** Backend query was filtering by `inventory_item_id` (all requests for that printer) instead of filtering by `requested_by_user_id` (only requests made by that specific user).

**Files Changed:**
- `server/index.js` - GET `/api/users/me/service-requests` endpoint

**Before:**
```javascript
WHERE sr.inventory_item_id IN (
    SELECT inventory_item_id FROM user_printer_assignments WHERE user_id = ?
)
```
This showed ALL requests for printers assigned to the user, including requests made by others.

**After:**
```javascript
WHERE sr.requested_by_user_id = ?
```
Now only shows requests created by the logged-in user.

---

### 3.  Backend Returns Requester Name
**Problem:** Backend wasn't selecting and returning The institution_user's name in the response.

**Files Changed:**
- `server/index.js` - GET `/api/users/me/service-requests` endpoint

**Added to Query:**
```javascript
requester.first_name as institution_user_first_name, 
requester.last_name as institution_user_last_name,
tech.first_name as technician_first_name, 
tech.last_name as technician_last_name
```

**Added JOIN:**
```javascript
LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
```

Now the API returns both requester and technician information.

---

### 4.  Removed Redundant coordinator_id Column
**Problem:** The `service_requests` table had both `coordinator_id` and `requested_by_user_id` columns, which was redundant and confusing.

**Files Changed:**
- Database: `service_requests` table

**Actions Taken:**
1. Dropped foreign key constraint `fk_sr_coordinator`
2. Dropped column `coordinator_id`

**Migration Script:** `server/drop_coordinator_id_column.js`

**Current Structure:**
```sql
service_requests (
    id,
    request_number,
    institution_id,
    requested_by_user_id,  --  Single source of truth for who created the request
    assigned_technician_id,
    priority,
    status,
    location,
    description,
    inventory_item_id,
    created_at,
    updated_at,
    ...
)
```

---

### 5.  Top Navigation Already Shows User Name
**Status:** Already working correctly!

The institution_user topnav component already displays the logged-in user's name:
- **Component:** `client/src/components/requester-topnav.html`
- **JavaScript:** `client/src/js/requester-app.js` - `loadTopnav()` function
- **Displays:** Full name from `localStorage.getItem('user')`

---

## Testing Verification

### Test Scenario 1: Requester Creates Service Request
 **Expected:** Request shows requester's name (e.g., "Tera Mitena")
 **Expected:** Only that requester sees their own requests

### Test Scenario 2: Coordinator Creates Service Request
 **Expected:** Request shows coordinator's name (e.g., "Razor Axe")
 **Expected:** Institution Admin's requests don't appear in requester's history

### Test Scenario 3: Multiple Users Same Printer
 **Expected:** Each user only sees their own requests
 **Expected:** No cross-contamination of service request histories

---

## Database State After Fix

### Request #138 (Requester's Request)
```
requested_by_user_id: 66 (Tera Mitena)
institution_id: INST-017
status: pending
```

### Request #137 (Coordinator's Request)
```
requested_by_user_id: 65 (Razor Axe)
institution_id: INST-017
status: completed
```

### Frontend Display for User 66 (Tera)
- **Shows:** Only Request #138 
- **Name Displayed:** "Tera Mitena" 
- **Doesn't Show:** Request #137 

---

## API Response Structure (After Fix)

```json
{
  "id": 138,
  "request_number": "INST-017-20251015170302",
  "requester_first_name": "Tera",
  "requester_last_name": "Mitena",
  "technician_first_name": "Razorback",
  "technician_last_name": "Axe",
  "status": "pending",
  "priority": "high",
  "description": "tabang guba",
  "location": "Room 992",
  ...
}
```

---

## Files Modified Summary

1. `client/src/js/requester-app.js` - Display requester name instead of technician
2. `server/index.js` - Filter by requested_by_user_id, return requester info
3. Database: `service_requests` table - Removed coordinator_id column

---

## Status
 **COMPLETE** - All issues resolved
- Institution User sees only their own service requests
- Correct requester name is displayed
- Redundant coordinator_id column removed
- Top navigation shows logged-in user's name

## Date Completed
October 16, 2025


