-- Add approved_by column to service_requests table to track who approved the service
ALTER TABLE service_requests 
ADD COLUMN approved_by INT NULL AFTER completed_at,
ADD CONSTRAINT fk_service_requests_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_service_requests_approved_by ON service_requests(approved_by);
