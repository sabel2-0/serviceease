# Admin Pages - ServiceEase System

## Sidebar Implementation Guide

### How to Implement Pages Correctly

To ensure all pages work correctly without errors, follow these guidelines:

1. **Always use the unified sidebar structure**:
   ```html
   <!-- Unified Sidebar -->
   <div id="sidebar-container"></div>
   ```

2. **Include these scripts in the correct order**:
   ```html
   <script src="../../js/auth.js"></script>
   <script src="../../js/unified-sidebar.js"></script>
   <script src="../../js/your-page-specific.js"></script>
   ```

3. **Use relative paths with `../../js/` prefix** for all script includes

4. **Do NOT use `admin-sidebar.js` or `operations-officer-sidebar.js`** - these are deprecated

5. **Role-specific content** can be controlled with the `data-roles` attribute:
   ```html
   <div data-roles="admin">Only admin can see this</div>
   <div data-roles="admin,operations_officer">Both roles can see this</div>
   ```

### Common Issues and Solutions

1. **Console errors about elements not found**: Make sure you're using `sidebar-container` as the ID, not `admin-sidebar`

2. **Sidebar not loading**: Verify your path to `unified-sidebar.js` is correct (../../js/unified-sidebar.js)

3. **Authentication issues**: Ensure auth.js is loaded before unified-sidebar.js

4. **Role-specific content not working**: Check the `data-roles` attribute is correctly set

### Testing Your Pages

Before committing any changes:
1. Test with Admin role
2. Test with Operations Officer role 
3. Verify all sidebar links work correctly
4. Check console for any errors

Following these guidelines will ensure consistent behavior across all pages in the system.
