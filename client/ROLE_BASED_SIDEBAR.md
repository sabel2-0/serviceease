# Role-Based Sidebar Navigation System

## Overview

This document explains the role-based sidebar navigation system implemented in the ServiceEase application. The system provides a unified approach to sidebar navigation that adapts based on the user's role, eliminating code duplication and improving maintainability.

## Key Components

### 1. Unified Sidebar Component
- **Location**: `/components/unified-sidebar.html`
- **Purpose**: Provides a single sidebar template that adapts to different user roles
- **Features**:
  - Role-specific UI elements
  - Dynamic menu visibility based on user permissions
  - Consistent styling and functionality across different roles

### 2. Unified Sidebar JavaScript
- **Location**: `/js/unified-sidebar.js`
- **Purpose**: Controls the sidebar behavior and adapts it based on the user's role
- **Features**:
  - Role detection from user data
  - Dynamic link configuration
  - Permission-based menu visibility
  - Consistent dropdown behavior
  - Active item highlighting

## How It Works

1. **Role Detection**:
   - The system reads the user's role from localStorage (stored during login)
   - Based on the role, it configures the sidebar appearance and content

2. **Permission-Based Display**:
   - Menu items have `data-roles` attributes specifying which roles can access them
   - The sidebar code shows/hides elements based on the user's role matching these attributes

3. **Dynamic Navigation Links**:
   - Links to dashboards and other pages are dynamically set based on the user's role
   - This ensures users are directed to the appropriate role-specific versions of pages

4. **Common Functionality**:
   - The logout functionality works the same for all roles
   - Dropdown toggles behave consistently
   - Active page highlighting works across all roles

## Implementation in Pages

To use the unified sidebar in any page:

1. Add the sidebar container:
```html
<div id="sidebar-container"></div>
```

2. Include the necessary scripts:
```html
<script src="/js/auth.js"></script>
<script src="/js/unified-sidebar.js"></script>
```

3. Ensure your page checks for appropriate role permissions:
```javascript
// Check authentication and role
if (!isAuthenticated()) {
    window.location.href = '/pages/login.html';
    return;
}

// Verify user has appropriate role
const user = getCurrentUser();
if (!user || (user.role !== 'role1' && user.role !== 'role2')) {
    window.location.href = '/pages/login.html?error=unauthorized';
    return;
}
```

## Benefits

1. **Reduced Code Duplication**: No need for separate sidebar components for each role
2. **Easier Maintenance**: Changes to sidebar structure only need to be made in one place
3. **Consistent UI/UX**: Users experience consistent navigation patterns across roles
4. **Flexible Permissions**: Easy to add or remove permissions for specific menu items
5. **Scalable**: New roles can be added with minimal changes to the sidebar code

## Future Improvements

1. Server-side permissions validation to complement client-side checks
2. Customizable sidebar elements based on user preferences
3. Collapsible sidebar option for mobile responsiveness
