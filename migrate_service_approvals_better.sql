-- Better approach: Use the existing service_approvals table
-- Rename institution_admin_id to approved_by (more generic)

ALTER TABLE service_approvals 
CHANGE COLUMN institution_admin_id approved_by INT NULL;

-- The service_approvals table will now store:
-- - approved_by: user_id of whoever approved (any role)
-- - status: approved/rejected/pending
-- - reviewed_at: when it was reviewed
