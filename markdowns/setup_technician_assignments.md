# Technician Assignment System Setup

This document explains how to set up the technician assignment system that allows admins to assign technicians to specific clients/institutions.

## Database Setup

Run the following SQL script to create the necessary tables:

```bash
# Navigate to the server config directory
cd server/config

# Run the SQL script (adjust connection details as needed)
mysql -u root -p serviceease < technician_assignments_schema.sql
```

Or manually execute the SQL file `technician_assignments_schema.sql` in your MySQL database.

## Features Implemented

### 1. **Database Schema**

- `technician_assignments` table: Links technicians to institutions
- `service_requests` table: Stores service requests with auto-assignment
- `service_request_history` table: Tracks status changes
- Database triggers for auto-assignment and request numbering

### 2. **API Endpoints**

- `GET /api/technician-assignments` - Get all active assignments
- `GET /api/institutions/:id/technician` - Get technician for specific institution
- `POST /api/technician-assignments` - Create new assignment
- `DELETE /api/technician-assignments/:id` - Remove assignment
- `GET /api/service-requests` - Get all service requests
- `GET /api/service-requests/:id` - Get specific request with history
- `POST /api/service-requests` - Create new service request (auto-assigns technician)
- `POST /api/service-requests/:id/status` - Update request status

### 3. **Frontend Features**

- **Client Management Page**:
  - New "Assigned Technician" column in client table
  - Assign/Change/Remove technician buttons
  - Modal for technician selection
  - Visual indicators for assignment status

### 4. **Auto-Assignment Logic**

When An institution_admin from an institution creates a service request:

1. System checks if the institution has an assigned technician
2. If yes, automatically assigns the request to that technician
3. Sets request status to "assigned" and records assignment timestamp
4. If no technician assigned, request remains in "new" status

## How It Works

### For Admins:

1. Navigate to Client Management page
2. See all institutions with their assigned technicians
3. Click "Assign Technician" for unassigned institutions
4. Select from active technicians in the dropdown
5. Change or remove assignments as needed

### for institution_admins:

1. Create service requests as usual
2. Requests are automatically assigned to designated technician
3. No additional steps required

### For Technicians:

1. Receive auto-assigned requests from their assigned institutions
2. Can view and update request status
3. All status changes are logged in history

## Benefits

1. **Streamlined Workflow**: Eliminates manual assignment step
2. **Consistency**: Same technician handles requests from assigned institutions
3. **Accountability**: Clear responsibility assignment
4. **Audit Trail**: Full history of assignments and status changes
5. **Flexibility**: Admins can reassign or remove assignments as needed

## Next Steps

1. Run the database schema to create tables
2. Restart the server to load new API endpoints
3. Test the assignment functionality in Client Management
4. Create some test service requests to verify auto-assignment

