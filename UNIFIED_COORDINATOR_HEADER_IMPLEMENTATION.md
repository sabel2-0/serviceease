# Unified Coordinator Header Implementation

## Summary
Successfully implemented a unified header component for all coordinator pages that displays:
- **Institution Name** (fetched from database)
- **Coordinator Name** (fetched from database)
- **Consistent Navigation** across all coordinator pages

## Changes Made

### 1. New Files Created

#### `client/src/components/coordinator-header.html`
- Reusable header component with:
  - Blue banner showing institution name and coordinator name
  - Notification button with badge counter
  - Page title and subtitle (customizable per page)
  - User profile button with initials
- Includes JavaScript to automatically fetch coordinator profile from database
- Auto-loads notification count from API

#### `client/src/js/coordinator-header-loader.js`
- Helper script to easily load the header component on any page
- Handles multiple path attempts for robust loading
- Supports custom titles and subtitles per page
- Usage: `window.loadCoordinatorHeader({ title: 'Page Title', subtitle: 'Description' })`

### 2. Server Changes

#### `server/index.js`
- Added new endpoint: `GET /api/coordinator/profile`
- Returns coordinator information including:
  - Coordinator name (first_name, last_name)
  - Institution details (institution_id, institution_name, institution_type, institution_address)
- Uses `authenticateCoordinator` middleware for security
- Queries database joining `users` and `institutions` tables where `institutions.user_id = coordinator.id`

### 3. Updated Coordinator Pages

All coordinator pages now use the unified header:

1. **coordinator-printers.html**
   - Title: "Printer Management"
   - Subtitle: "Manage printers assigned to your institution"

2. **service-requests.html**
   - Title: "Service Requests"
   - Subtitle: "Monitor and manage all service requests for your institution"

3. **user-management.html**
   - Title: "User Management"
   - Subtitle: "Manage users and their printer assignments"

4. **coordinator-dashboard.html**
   - Title: "Dashboard"
   - Subtitle: "Here's what's happening with your service requests"

## How It Works

### Database Architecture
The system uses the existing database structure:
- `institutions` table has a `user_id` column that points to the coordinator who owns that institution
- Query: `SELECT * FROM institutions WHERE user_id = ?` to get coordinator's institution

### Header Loading Process
1. Page loads with `<div id="coordinator-header-container"></div>` placeholder
2. JavaScript calls `loadCoordinatorHeader()` with page-specific title and subtitle
3. Header component is fetched and inserted into the container
4. Component's initialization script runs automatically:
   - Fetches `/api/coordinator/profile` with authentication token
   - Updates institution name from database
   - Updates coordinator name from database
   - Updates user initials
   - Loads notification count
5. Data refreshes every 30 seconds for notifications

### Fallback Mechanism
If API call fails, the header falls back to localStorage data:
- Institution name from `user.institutionName`
- Coordinator name from `user.firstName` and `user.lastName`

## Benefits

### ✅ Consistency
- All coordinator pages now have identical header layout
- Same navigation experience throughout the portal

### ✅ Real-time Data
- Institution name and coordinator name are fetched fresh from database
- No reliance on outdated localStorage data
- Notification counts update automatically

### ✅ Maintainability
- Single source of truth for header component
- Easy to update header design in one place
- Affects all coordinator pages simultaneously

### ✅ Scalability
- Easy to add new coordinator pages
- Just include the header container and loader script
- Specify page-specific title and subtitle

## Testing

To test the implementation:

1. Start the server:
   ```powershell
   Set-Location server; node index.js
   ```

2. Navigate to any coordinator page:
   - http://localhost:3000/pages/coordinator/coordinator-printers.html
   - http://localhost:3000/pages/coordinator/service-requests.html
   - http://localhost:3000/pages/coordinator/user-management.html
   - http://localhost:3000/pages/coordinator/coordinator-dashboard.html

3. Verify:
   - Blue banner at the top displays the correct institution name
   - Blue banner displays the coordinator's full name
   - Page title matches the specific page
   - User initials are correct in the profile button
   - Notification button is present

## Implementation Date
October 22, 2025
