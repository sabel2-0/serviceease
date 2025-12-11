-- Add approved_by column to service_requests to store who approved (any role)
-- This will work for institution_admin, institution_user, operations_officer, or admin who approves

ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER completed_at,
ADD INDEX IF NOT EXISTS idx_service_requests_approved_by (approved_by);

-- Note: We're not adding a foreign key constraint because it would cause issues
-- if the approver user is deleted. NULL value will indicate unknown/deleted approver.
