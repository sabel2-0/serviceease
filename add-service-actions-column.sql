-- Add service_actions column to store technician's work description separate from approval notes
ALTER TABLE service_requests
ADD COLUMN service_actions TEXT NULL AFTER resolution_notes;

-- Migrate existing resolution_notes that don't contain approval keywords to service_actions
UPDATE service_requests
SET service_actions = resolution_notes
WHERE resolution_notes IS NOT NULL 
  AND resolution_notes NOT LIKE '%Approved%'
  AND resolution_notes NOT LIKE '%Rejected%'
  AND status IN ('pending_approval', 'completed');
