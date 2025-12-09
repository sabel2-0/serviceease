-- Fix audit_logs action_type ENUM to include 'activate' and 'deactivate'
-- This fixes the error: "Data truncated for column 'action_type' at row 1"

USE serviceease;

-- Modify the action_type column to include the new values
ALTER TABLE `audit_logs` 
MODIFY COLUMN `action_type` ENUM(
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'approve',
    'reject',
    'assign',
    'complete',
    'activate',
    'deactivate',
    'other'
) NOT NULL;

-- Verify the change
SHOW COLUMNS FROM `audit_logs` LIKE 'action_type';
