# Admin Password Change Feature Implementation

## Overview
This feature allows administrators to change passwords for both staff accounts (technicians and operations officers) and institution_admin accounts directly from the admin panel.

## Implementation Date
October 17, 2025

## Features Added

### 1. Backend API Endpoints

#### Staff Password Change
- **Endpoint**: `PATCH /api/admin/staff/:staffId/password`
- **Authentication**: Requires admin authentication (`authenticateAdmin` middleware)
- **Validations**:
  - Password must be at least 6 characters long
  - User must exist in the database
  - User must have role 'technician' or 'operations_officer'
- **Security**: Passwords are hashed using bcrypt before storage
- **Response**: Returns success message with user details

#### Coordinator Password Change
- **Endpoint**: `PATCH /api/admin/coordinators/:coordinatorId/password`
- **Authentication**: Requires admin authentication (`authenticateAdmin` middleware)
- **Validations**:
  - Password must be at least 6 characters long
  - User must exist in the database
  - User must have role 'institution_admin'
- **Security**: Passwords are hashed using bcrypt before storage
- **Response**: Returns success message with user details

### 2. Frontend Implementation

#### Staff Accounts Page (`/pages/admin/staff-accounts.html`)
**Changes Made**:
1. Added purple password button CSS styling (`.action-password`)
2. Added Change Password modal with:
   - User information display
   - New password input
   - Confirm password input
   - Validation and error messaging
   - Loading state during submission
3. Added password change button (key icon) in action column
4. Integrated with backend API endpoint

**Files Modified**:
- `client/src/pages/admin/staff-accounts.html`
- `client/src/js/staff-accounts.js`

#### institution_admin accounts Page (`/pages/admin/coordinator-accounts.html`)
**Changes Made**:
1. Added purple password button CSS styling (`.action-password`)
2. Added Change Password modal with:
   - Institution Admin information display
   - New password input
   - Confirm password input
   - Validation and error messaging
   - Loading state during submission
3. Added password change button (key icon) in action column
4. Integrated with backend API endpoint

**Files Modified**:
- `client/src/pages/admin/coordinator-accounts.html`
- `client/src/js/coordinator-accounts.js`

## User Interface

### Button Appearance
- **Icon**: Key icon (`fas fa-key`)
- **Color**: Purple gradient (`#7c3aed` to `#6d28d9`)
- **Position**: In the Actions column between View and Toggle Status buttons
- **Hover Effect**: Elevates with shadow effect

### Modal Features
- Clean, modern design with purple accent colors
- Displays user/coordinator name and email for confirmation
- Two password fields (new password and confirm password)
- Real-time validation
- Loading spinner during submission
- Error and success alerts
- Cancel and Submit buttons

## Security Features

1. **Authentication**: Only admins can access these endpoints
2. **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
3. **Validation**: 
   - Minimum 6 character password requirement
   - Password confirmation matching
   - Role verification (prevents changing passwords for wrong user types)
4. **Audit Trail**: Server logs all password changes with admin ID and target user details

## Validation Rules

### Password Requirements:
- Minimum length: 6 characters
- Must match confirmation password
- Cannot be empty

### User Verification:
- User must exist in database
- User must have appropriate role:
  - For staff endpoint: 'technician' or 'operations_officer'
  - For coordinator endpoint: 'institution_admin'

## Error Handling

### Frontend:
- Shows inline error messages in modal
- Validates password length and matching before API call
- Displays user-friendly error messages
- Maintains form state on error

### Backend:
- Returns appropriate HTTP status codes:
  - 400: Bad request (validation errors)
  - 403: Forbidden (wrong role or access denied)
  - 404: User not found
  - 500: Server error
- Detailed error messages in response
- Error logging for debugging

## Testing

### How to Test:

1. **Staff Password Change**:
   - Navigate to `http://localhost:3000/pages/admin/staff-accounts.html`
   - Log in as admin
   - Click the purple key icon next to any staff member
   - Enter new password (min 6 characters) twice
   - Click "Change Password"
   - Verify success message

2. **Coordinator Password Change**:
   - Navigate to `http://localhost:3000/pages/admin/coordinator-accounts.html`
   - Log in as admin
   - Click the purple key icon next to any coordinator
   - Enter new password (min 6 characters) twice
   - Click "Change Password"
   - Verify success message

3. **Validation Testing**:
   - Try password less than 6 characters (should show error)
   - Try non-matching passwords (should show error)
   - Try empty passwords (should show error)

## API Request/Response Examples

### Staff Password Change Request:
```http
PATCH /api/admin/staff/:staffId/password
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

### Success Response:
```json
{
  "message": "Password updated successfully",
  "user": {
    "id": 5,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "role": "technician"
  }
}
```

### Error Response:
```json
{
  "error": "Password must be at least 6 characters long"
}
```

## Files Modified

### Backend:
- `server/index.js` (lines 1421-1549)

### Frontend:
1. Staff Accounts:
   - `client/src/pages/admin/staff-accounts.html`
   - `client/src/js/staff-accounts.js`

2. institution_admin accounts:
   - `client/src/pages/admin/coordinator-accounts.html`
   - `client/src/js/coordinator-accounts.js`

## Database Impact
- No schema changes required
- Updates existing `users` table:
  - `password` field (hashed value)
  - `updated_at` timestamp

## Future Enhancements (Optional)
1. Password strength indicator
2. Password history (prevent reuse)
3. Force password change on next login option
4. Email notification to user when password is changed
5. Password complexity requirements (uppercase, numbers, symbols)
6. Bulk password reset functionality

## Notes
- Passwords are hashed using bcrypt before storage (never stored in plain text)
- The feature follows the same pattern as the existing coordinator password change functionality
- All password changes are logged in the server console with timestamp and user details
- Modal can be closed by clicking Cancel, the X button, or pressing ESC key

