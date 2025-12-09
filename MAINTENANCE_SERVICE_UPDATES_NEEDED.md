# Maintenance Services Updates Required

## Overview
Replace all "Voluntary Service" terminology with "Maintenance Service" throughout the system and add completion photo + parts display features.

## Critical Changes Needed

### 1. Backend Changes (server/routes/maintenance-services.js)
- [ ] Line 286-349: Add `completion_photo` field to INSERT query for maintenance services
- [ ] Line 327-342: Change notification types from 'voluntary_service' to 'maintenance_service'
- [ ] Line 328: Change "New Voluntary Service Submitted" to "New Maintenance Service Submitted"
- [ ] Line 342: Change "Voluntary Service Pending" to "Maintenance Service Pending"
- [ ] Line 680: Change message to "maintenance service"  
- [ ] Line 684: Change notification title to "Maintenance Service Approved"
- [ ] Line 751: Change message to "maintenance service"
- [ ] Line 858: Change message to "maintenance service"
- [ ] Line 862: Change notification title
- [ ] Line 916: Change message to "maintenance service"

### 2. Database Schema Update
```sql
ALTER TABLE maintenance_services 
ADD COLUMN completion_photo VARCHAR(500) AFTER parts_used;
```

### 3. Frontend - Technician Submission (client/src/components/technician-clients-content.html)
- [ ] Line 83: Change "Submit Voluntary Service" to "Submit Maintenance Service"
- [ ] Line 351-356: Update comments
- [ ] Line 560-561: Change badge from "VOLUNTARY" to "MAINTENANCE"
- [ ] Line 1273: Already updated to /api/maintenance-services
- [ ] ADD: Photo capture field in submission modal
- [ ] ADD: Send completion_photo in POST request body

### 4. Institution Admin View (client/src/pages/institution-admin/maintenance-services.html)
- [ ] Line 6: Change title
- [ ] Line 80: Change "Voluntary Services" to "Maintenance Services"
- [ ] Line 82: Change description
- [ ] Line 137-143: Update text
- [ ] Line 161: Change "Voluntary Service Details" to "Maintenance Service Details"  
- [ ] Line 248-282: Rename function `loadVoluntaryServices` to `loadMaintenanceServices`
- [ ] Line 440-462: Update confirmation messages
- [ ] ADD: Display parts_used in modal
- [ ] ADD: Display completion_photo in modal

### 5. Institution User View
- [ ] Create similar view as institution admin for institution_user role
- [ ] Show parts used
- [ ] Show completion photo
- [ ] Allow approval/rejection

### 6. Technician Progress Page (client/src/js/technician-progress.js or similar)
- [ ] ADD: New "Maintenance Services" tab
- [ ] Show list of maintenance services submitted
- [ ] For each service show:
  - Institution name
  - Printer details
  - Date submitted
  - Status (pending/approved/rejected)
  - Parts used
  - Completion photo

### 7. Admin View - Maintenance Services by Technician
- [ ] In technician progress or new page
- [ ] Filter by public institutions
- [ ] Show complete printer list from public institutions
- [ ] Show which printers have been serviced for maintenance
- [ ] Display service history per printer

## Files to Update

### High Priority (User-Facing)
1. `server/routes/maintenance-services.js` - Backend API
2. `client/src/components/technician-clients-content.html` - Submission form
3. `client/src/pages/institution-admin/maintenance-services.html` - Admin view
4. `client/src/js/technician-progress.js` - Technician progress page

### Medium Priority (Terminology)
5. `client/src/pages/requester/requester-voluntary.html` - Rename file
6. `client/src/components/requester-bottomnav.html` - Update nav labels
7. `client/src/components/technician-history-content.html` - Update tab labels

### Low Priority (Comments/Logs)
8. Various console.log statements
9. Comments in code

## Implementation Steps

### Step 1: Database Schema (REQUIRED FIRST)
```sql
ALTER TABLE maintenance_services 
ADD COLUMN completion_photo VARCHAR(500) AFTER parts_used;
```

### Step 2: Backend API Updates
- Add completion_photo parameter handling
- Update notification messages
- Update console logs

### Step 3: Technician Submission
- Add photo capture to modal
- Include completion_photo in POST

### Step 4: Admin/User Views  
- Display parts used in modal
- Display completion photo in modal
- Update all "voluntary" text to "maintenance"

### Step 5: New Maintenance Services Tab
- Add tab to technician progress
- Create view for technician to see their maintenance services
- Add admin view for maintenance services by technician

## Testing Checklist
- [ ] Technician can submit maintenance service with photo
- [ ] Institution admin sees parts and photo in details
- [ ] Institution user sees parts and photo in details  
- [ ] Technician can view their maintenance services in progress page
- [ ] Admin can see maintenance services by public institution printers
- [ ] All "voluntary" terminology replaced with "maintenance"
