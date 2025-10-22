ALTER TABLE technician_assignments DROP INDEX unique_active_assignment;
CREATE INDEX idx_institution_active ON technician_assignments (institution_id, is_active);