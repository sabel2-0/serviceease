# Voluntary Service System Implementation

## Overview
Technicians can proactively service printers in their assigned public schools without a service request. This voluntary service requires **dual approval** from:
1. **Coordinator** - Verifies the service was legitimate and needed
2. **Requester** - Confirms the service was performed satisfactorily

## Database Schema

### voluntary_services table
```sql
CREATE TABLE IF NOT EXISTS voluntary_services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL,
    printer_id INT NOT NULL,
    institution_id VARCHAR(50) NOT NULL,
    service_description TEXT NOT NULL,
    parts_used TEXT,
    time_spent INT, -- minutes
    before_photos TEXT, -- JSON array of photo URLs
    after_photos TEXT, -- JSON array of photo URLs
    status ENUM('pending_coordinator', 'coordinator_approved', 'coordinator_rejected', 'pending_requester', 'requester_approved', 'requester_rejected', 'completed', 'cancelled') DEFAULT 'pending_coordinator',
    coordinator_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requester_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    coordinator_notes TEXT,
    requester_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coordinator_reviewed_at TIMESTAMP NULL,
    requester_reviewed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (printer_id) REFERENCES printers(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id)
);
```

## Workflow

### 1. Technician Submits Voluntary Service
- Views assigned public schools
- Selects a printer
- Fills out service form
- Uploads before/after photos (optional)
- Submits for coordinator approval

### 2. Coordinator Review (First Approval)
- Sees voluntary service in their dashboard
- Reviews service description and photos
- Can approve or reject
- If approved → moves to requester approval
- If rejected → service marked as rejected

### 3. Requester Review (Second Approval)
- Institution User sees approved services in their dashboard
- Verifies service was actually performed
- Can approve or reject
- If approved → service marked as completed
- If rejected → service marked as rejected

### 4. Completion
- Both approvals required for completion
- Service logged in technician's history
- Printer service history updated

## API Endpoints

### Technician Endpoints
- `GET /api/technician/assigned-schools` - Get public schools only
- `GET /api/technician/school-printers/:institutionId` - Get printers in school
- `POST /api/voluntary-services` - Submit voluntary service
- `GET /api/voluntary-services/my-submissions` - View own submissions

### Coordinator Endpoints
- `GET /api/coordinator/voluntary-services/pending` - Pending coordinator approval
- `PATCH /api/coordinator/voluntary-services/:id/approve` - Approve service
- `PATCH /api/coordinator/voluntary-services/:id/reject` - Reject service

### Requester Endpoints
- `GET /api/requester/voluntary-services/pending` - Pending requester approval
- `PATCH /api/requester/voluntary-services/:id/approve` - Approve service
- `PATCH /api/requester/voluntary-services/:id/reject` - Reject service

## UI Components

### Technician UI - Clients Tab
Shows list of public schools with:
- School name and type badge
- Number of printers
- Printers serviced vs total
- Status indicators (Active/Pending)

### Coordinator UI - New Tab "Voluntary Services"
Shows:
- Pending voluntary services for review
- Technician who performed service
- Service details and photos
- Approve/Reject actions

### Requester UI - New Section "Service Confirmations"
Shows:
- Institution Admin-approved services waiting for confirmation
- Service details
- Confirm/Reject actions


