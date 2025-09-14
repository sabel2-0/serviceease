-- Coordinator Management Schema

-- Institution Printers Table
CREATE TABLE institution_printers (
    printer_id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES institutions(id),
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(200),
    status VARCHAR(50) DEFAULT 'active',
    installation_date DATE,
    last_service_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Printer Assignments Table
CREATE TABLE printer_assignments (
    assignment_id SERIAL PRIMARY KEY,
    printer_id INTEGER REFERENCES institution_printers(printer_id),
    user_id INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Requests Table
CREATE TABLE service_requests (
    request_id SERIAL PRIMARY KEY,
    printer_id INTEGER REFERENCES institution_printers(printer_id),
    requester_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service History Table
CREATE TABLE service_history (
    history_id SERIAL PRIMARY KEY,
    printer_id INTEGER REFERENCES institution_printers(printer_id),
    request_id INTEGER REFERENCES service_requests(request_id),
    service_type VARCHAR(50) NOT NULL,
    technician_id INTEGER REFERENCES users(id),
    service_date TIMESTAMP,
    description TEXT,
    parts_used TEXT[],
    cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institution Users Table
CREATE TABLE institution_users (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES institutions(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_institution_printers_timestamp
    BEFORE UPDATE ON institution_printers
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_printer_assignments_timestamp
    BEFORE UPDATE ON printer_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_service_requests_timestamp
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_service_history_timestamp
    BEFORE UPDATE ON service_history
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_institution_users_timestamp
    BEFORE UPDATE ON institution_users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Indexes for better query performance
CREATE INDEX idx_institution_printers_institution ON institution_printers(institution_id);
CREATE INDEX idx_printer_assignments_printer ON printer_assignments(printer_id);
CREATE INDEX idx_printer_assignments_user ON printer_assignments(user_id);
CREATE INDEX idx_service_requests_printer ON service_requests(printer_id);
CREATE INDEX idx_service_requests_requester ON service_requests(requester_id);
CREATE INDEX idx_service_history_printer ON service_history(printer_id);
CREATE INDEX idx_service_history_request ON service_history(request_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_institution_users_institution ON institution_users(institution_id);
CREATE INDEX idx_institution_users_user ON institution_users(user_id);

-- Views for common queries
CREATE VIEW active_service_requests AS
SELECT 
    sr.request_id,
    sr.type,
    sr.priority,
    sr.status,
    sr.description,
    sr.submitted_at,
    ip.model AS printer_model,
    ip.location AS printer_location,
    u.name AS requester_name
FROM service_requests sr
JOIN institution_printers ip ON sr.printer_id = ip.printer_id
JOIN users u ON sr.requester_id = u.id
WHERE sr.status NOT IN ('completed', 'cancelled');

CREATE VIEW printer_service_summary AS
SELECT 
    ip.printer_id,
    ip.model,
    ip.location,
    COUNT(sr.request_id) as total_requests,
    AVG(EXTRACT(EPOCH FROM (sr.completed_at - sr.submitted_at))/3600)::numeric(10,2) as avg_completion_time_hours
FROM institution_printers ip
LEFT JOIN service_requests sr ON ip.printer_id = sr.printer_id
GROUP BY ip.printer_id, ip.model, ip.location;

-- Functions for common operations
CREATE OR REPLACE FUNCTION assign_printer_to_user(
    p_printer_id INTEGER,
    p_user_id INTEGER,
    p_assigned_by INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Deactivate any existing active assignments for this printer
    UPDATE printer_assignments 
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE printer_id = p_printer_id AND status = 'active';
    
    -- Create new assignment
    INSERT INTO printer_assignments (printer_id, user_id, assigned_by)
    VALUES (p_printer_id, p_user_id, p_assigned_by);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    notification_id INTEGER,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50),
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT n.notification_id, n.title, n.message, n.type, n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id AND n.read = FALSE
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
