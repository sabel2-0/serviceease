-- Migration: Rename 'institutions' table to 'clients'
-- Date: December 4, 2025
-- Description: Renamed the institutions table to clients for better clarity

-- Rename the main table
-- RENAME TABLE institutions TO clients;
-- Note: This has been executed

-- Verify the change
SHOW TABLES LIKE 'clients';

-- Verify foreign key constraints (should automatically update)
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_NAME = 'clients'
    AND TABLE_SCHEMA = 'serviceease';

-- Tables with references to clients table:
-- 1. institution_printer_assignments (institution_id references clients.institution_id)
-- 2. service_requests (institution_id references clients.institution_id)
-- 3. technician_assignments (institution_id references clients.institution_id)
-- 4. user_printer_assignments (institution_id references clients.institution_id)

-- Code Changes Made:
-- 1. Updated all SQL queries in server JavaScript files:
--    - FROM institutions -> FROM clients
--    - JOIN institutions -> JOIN clients
--    - INTO institutions -> INTO clients
--    - UPDATE institutions -> UPDATE clients
--
-- 2. Updated API endpoints:
--    - /api/institutions/* -> /api/clients/*
--
-- 3. Updated client-side JavaScript API calls:
--    - /api/institutions -> /api/clients

-- Note: Column names and variable names containing "institution" 
-- were kept as-is for backward compatibility with existing code logic.
