# Sidebar Maintenance Guide

## Overview

This document provides guidance on how to maintain and extend the role-based sidebar system in the ServiceEase application. The sidebar system dynamically loads different sidebar components based on the user's role.

## File Structure

### HTML Components
- `client/src/components/admin-sidebar.html`: Sidebar component for Admin users
- `client/src/components/operations-officer-sidebar.html`: Sidebar component for Operations Officers
- `client/src/components/coordinator-sidebar.html`: Sidebar component for Institution Coordinators
- `client/src/components/unified-sidebar.html`: Base sidebar component with shared functionality

### JavaScript Files
- `client/src/js/sidebar-loader.js`: Main loader for sidebars
- `client/src/js/dynamic-sidebar-loader.js`: Dynamic loading based on user role
- `client/src/js/admin-sidebar.js`: Admin-specific sidebar functionality
- `client/src/js/operations-officer-sidebar.js`: Operations Officer-specific sidebar functionality
- `client/src/js/coordinator-sidebar.js`: Coordinator-specific sidebar functionality
- `client/src/js/unified-sidebar.js`: Shared sidebar functionality
- `client/src/js/technician-assignments.js`: Technician assignment functionality for coordinators

## How to Add a New Section to a Sidebar

### 1. Update the HTML Component

Edit the appropriate sidebar HTML file (e.g., `coordinator-sidebar.html`):

```html
<!-- Add this inside the <nav> element -->
<a href="#" onclick="showTab('new-section')" class="nav-item flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
    <i class="fas fa-icon-name w-5 h-5 mr-3"></i>
    <span>New Section Name</span>
</a>
```

### 2. Add Content for the New Section

In the corresponding page (e.g., `coordinator.html`):

```html
<!-- New section content -->
<div id="new-section" class="tab-content hidden">
    <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-xl font-semibold mb-4">New Section Title</h3>
        <div id="new-section-content" class="space-y-4">
            <!-- Content goes here -->
        </div>
    </div>
</div>
```

### 3. Add JavaScript Functionality

In the corresponding JavaScript file (e.g., `coordinator-dashboard.js`):

```javascript
// Function to initialize the new section
function initNewSection() {
    const container = document.getElementById('new-section-content');
    if (!container) return;
    
    // Add your initialization logic here
    loadNewSectionData();
}

// Function to load data for the new section
async function loadNewSectionData() {
    // Implementation here
}
```

### 4. Register the New Section in Tab Navigation

Add your new section to the tab initialization in the main JavaScript file:

```javascript
// In your setupTabNavigation function or similar
function setupTabNavigation() {
    // Existing code...
    
    // Add click event for your new tab
    document.querySelector('[onclick="showTab(\'new-section\')"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('new-section');
    });
}
```

## Role-Based Features

### Coordinator Features
- Dashboard overview
- Service request management
- Printer management
- User management
- Service approvals
- Technician assignment visibility (added recently)
- Notifications

### Admin Features
- User and role management
- Institution management
- Technician assignment management
- System settings
- Reports and analytics
- Notifications

### Operations Officer Features
- Service request management
- Technician management
- Parts inventory
- Schedule management
- Reporting
- Notifications

## Adding a New Role

1. Create a new sidebar HTML component in `client/src/components/`
2. Create a new sidebar JavaScript file in `client/src/js/`
3. Update `dynamic-sidebar-loader.js` to include the new role and component
4. Create any role-specific pages needed

## Technician Assignment Component

The technician assignment component was recently added to allow coordinators to view which technicians are assigned to their institution's printers. This is a read-only view for coordinators, as only admins can assign or change technician assignments.

### Files Involved:
- `client/src/js/technician-assignments.js`: Main functionality
- `client/src/components/coordinator-sidebar.html`: Updated with technician assignments link
- `client/src/pages/coordinator.html`: Contains the technician assignment tab content

### How It Works:
1. The `technician-assignments.js` file initializes when the coordinator page loads
2. It adds a technician assignment card to the dashboard
3. It creates a new tab for technician assignments with a detailed view
4. It adds a technician column to the printer table in the printer management tab

### Customizing the Technician Assignment View:
To modify the appearance or behavior of the technician assignment features:

1. Edit the HTML structure in `coordinator.html` for layout changes
2. Modify the data fetching and rendering functions in `technician-assignments.js`
3. Adjust styling using Tailwind classes as needed

## Best Practices

1. Always use the existing design patterns and component structure
2. Test sidebar functionality across different devices and screen sizes
3. Maintain role-based access controls for all new features
4. Use consistent naming conventions for files and functions
5. Document any significant changes in this guide