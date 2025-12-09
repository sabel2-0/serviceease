-- Add stock_at_approval column to track inventory at approval time
-- This ensures accurate historical tracking

ALTER TABLE parts_requests 
ADD COLUMN stock_at_approval INT DEFAULT NULL
COMMENT 'Stock quantity at the time of approval for tracking purposes';

-- Update existing approved requests with current stock (best effort)
UPDATE parts_requests pr
JOIN printer_parts pp ON pr.part_id = pp.id
SET pr.stock_at_approval = pp.quantity + pr.quantity_requested
WHERE pr.status = 'approved' 
  AND pr.stock_at_approval IS NULL;
