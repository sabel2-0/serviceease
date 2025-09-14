/**
 * Technician Service Requests API Routes
 * Handles all technician-related service request endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateTechnician } = require('../middleware/auth');

// Simple hello route for testing
router.get('/hello', (req, res) => {
    res.send('hello');
});

// Get all service requests assigned to the authenticated technician
router.get('/service-requests', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const statusFilter = req.query.status ? `AND sr.status = '${req.query.status}'` : '';
        
        const [rows] = await db.query(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.institution_id,
                i.name as institution_name,
                sr.status,
                sr.priority,
                ii.model as model,
                ii.serial_number,
                sr.location,
                sr.description as issue,
                sr.created_at,
                sr.updated_at
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            WHERE ta.technician_id = ? 
            AND ta.is_active = TRUE
            ${statusFilter}
            ORDER BY sr.created_at DESC
        `, [technicianId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching technician service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// Get institutions assigned to the technician
router.get('/assigned-institutions', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT 
                i.institution_id,
                i.name,
                i.type,
                i.address,
                ta.assigned_at
            FROM technician_assignments ta
            JOIN institutions i ON ta.institution_id = i.institution_id
            WHERE ta.technician_id = ? AND ta.is_active = TRUE
            ORDER BY ta.assigned_at DESC
        `, [technicianId]);
        
        res.json({ institutions: rows });
    } catch (error) {
        console.error('Error fetching assigned institutions:', error);
        res.status(500).json({ error: 'Failed to fetch assigned institutions' });
    }
});

// Get a specific service request details
router.get('/service-requests/:requestId', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT 1 FROM service_requests sr
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND ta.technician_id = ? AND ta.is_active = TRUE
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        // Get the request details
        const [rows] = await db.query(`
            SELECT 
                sr.*,
                i.name as institution_name,
                i.address as location
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sr.id = ?
        `, [requestId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        // Get request history
        const [history] = await db.query(`
            SELECT 
                srh.id,
                srh.previous_status,
                srh.new_status,
                srh.notes,
                srh.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.role
            FROM service_request_history srh
            LEFT JOIN users u ON srh.changed_by = u.id
            WHERE srh.request_id = ?
            ORDER BY srh.created_at DESC
        `, [requestId]);
        
        const request = rows[0];
        request.history = history;
        
        // Parse coordinates if they exist (just a placeholder for now)
        request.coordinates = { lat: 14.6091, lng: 121.0223 }; // Manila coordinates as placeholder
        
        res.json(request);
    } catch (error) {
        console.error('Error fetching service request details:', error);
        res.status(500).json({ error: 'Failed to fetch service request details' });
    }
});

// Update service request status
router.put('/service-requests/:requestId/status', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['assigned', 'in_progress', 'on_hold'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Technicians can only set assigned, in_progress, or on_hold status.' });
        }
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT sr.status FROM service_requests sr
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND ta.technician_id = ? AND ta.is_active = TRUE
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        const currentStatus = access[0].status;
        
        // Verify valid status transition
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            return res.status(400).json({ error: 'Cannot update a completed or cancelled request' });
        }
        
        // Update the status
        await db.query(
            `UPDATE service_requests 
             SET status = ?, 
                 assigned_technician_id = ?,
                 updated_at = NOW() 
             WHERE id = ?`,
            [status, technicianId, requestId]
        );
        
        // Add history record
        await db.query(
            `INSERT INTO service_request_history 
             (request_id, previous_status, new_status, changed_by, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [requestId, currentStatus, status, technicianId, `Status updated by technician`]
        );
        
        res.json({ 
            message: 'Status updated successfully',
            status: status
        });
    } catch (error) {
        console.error('Error updating service request status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Complete a service request
router.post('/service-requests/:requestId/complete', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { actions, parts, signature, notes } = req.body;
        
        if (!actions || !signature) {
            return res.status(400).json({ error: 'Actions taken and signature are required' });
        }
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT sr.status FROM service_requests sr
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND ta.technician_id = ? AND ta.is_active = TRUE
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        const currentStatus = access[0].status;
        
        // Cannot complete an already completed or cancelled request
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            return res.status(400).json({ error: 'Cannot complete a request that is already completed or cancelled' });
        }
        
        // Start a transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update the service request
            await db.query(
                `UPDATE service_requests 
                 SET status = 'completed', 
                     resolution_notes = ?,
                     resolved_by = ?,
                     resolved_at = NOW(),
                     updated_at = NOW(),
                     client_signature = ?
                 WHERE id = ?`,
                [actions, technicianId, signature, requestId]
            );
            
            // Add history record
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, currentStatus, 'completed', technicianId, `Service request completed. ${notes || ''}`]
            );
            
            // Record parts used (if any)
            if (parts && Array.isArray(parts) && parts.length > 0) {
                for (const part of parts) {
                    if (part.name && part.qty > 0) {
                        await db.query(
                            `INSERT INTO service_request_parts 
                             (request_id, part_name, quantity, added_by)
                             VALUES (?, ?, ?, ?)`,
                            [requestId, part.name, part.qty, technicianId]
                        );
                    }
                }
            }
            
            // Commit the transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service request completed successfully',
                status: 'completed'
            });
        } catch (error) {
            // Rollback in case of error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error completing service request:', error);
        res.status(500).json({ error: 'Failed to complete service request' });
    }
});

// Report an issue with a service request
router.post('/service-requests/:requestId/issue', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { issueType, description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Issue description is required' });
        }
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT 1 FROM service_requests sr
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND ta.technician_id = ? AND ta.is_active = TRUE
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        // Add issue report to history
        await db.query(
            `INSERT INTO service_request_history 
             (request_id, previous_status, new_status, changed_by, notes)
             VALUES (?, 
                    (SELECT status FROM service_requests WHERE id = ?), 
                    (SELECT status FROM service_requests WHERE id = ?),
                    ?, ?)`,
            [requestId, requestId, requestId, technicianId, `ISSUE REPORT [${issueType || 'Other'}]: ${description}`]
        );
        
        res.json({ message: 'Issue reported successfully' });
    } catch (error) {
        console.error('Error reporting issue:', error);
        res.status(500).json({ error: 'Failed to report issue' });
    }
});

// Request reassignment of a service request
router.post('/service-requests/:requestId/reassign', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { reason, comments } = req.body;
        
        if (!reason) {
            return res.status(400).json({ error: 'Reason for reassignment is required' });
        }
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT sr.status FROM service_requests sr
            JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND ta.technician_id = ? AND ta.is_active = TRUE
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        const currentStatus = access[0].status;
        
        // Cannot request reassignment for completed or cancelled requests
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            return res.status(400).json({ error: 'Cannot request reassignment for a completed or cancelled request' });
        }
        
        // Change status to 'needs_reassignment' and add history record
        await db.query('START TRANSACTION');
        
        try {
            // Update the service request status
            await db.query(
                `UPDATE service_requests 
                 SET status = 'needs_reassignment', 
                     updated_at = NOW()
                 WHERE id = ?`,
                [requestId]
            );
            
            // Add history record
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, currentStatus, 'needs_reassignment', technicianId, 
                 `REASSIGNMENT REQUESTED: Reason - ${reason}${comments ? '. ' + comments : ''}`]
            );
            
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Reassignment requested successfully',
                status: 'needs_reassignment'
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error requesting reassignment:', error);
        res.status(500).json({ error: 'Failed to request reassignment' });
    }
});

module.exports = router;