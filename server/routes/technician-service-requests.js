/**
 * Technician Service Requests API Routes
 * Handles all technician-related service request endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateTechnician } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Simple hello route for testing
router.get('/hello', (req, res) => {
    res.send('hello');
});

// Get all service requests assigned to the authenticated technician
router.get('/service-requests', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        console.log(`[DEBUG] Fetching service requests for technician ID: ${technicianId}`);
        
        const statusFilter = req.query.status ? `AND sr.status = '${req.query.status}'` : `AND sr.status NOT IN ('completed', 'cancelled')`;
        
        const [rows] = await db.query(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.institution_id,
                i.name as institution_name,
                sr.status,
                sr.priority,
                sr.location,
                sr.description as issue,
                sr.created_at,
                sr.updated_at,
                sr.inventory_item_id,
                ii.name as printer_name,
                ii.brand as brand,
                ii.model as model,
                ii.serial_number as serial_number,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.email as requester_email,
                sr.is_walk_in,
                sr.walk_in_customer_name,
                sr.printer_brand
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id AND ta.technician_id = ? AND ta.is_active = TRUE
            LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
            WHERE (
                (ta.technician_id IS NOT NULL) OR 
                (sr.is_walk_in = TRUE)
            )
            ${statusFilter}
            ORDER BY sr.created_at DESC
        `, [technicianId]);
        
        console.log(`[DEBUG] Found ${rows.length} service requests for technician ${technicianId}:`);
        console.log('[DEBUG] Service requests:', JSON.stringify(rows, null, 2));
        
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
                i.id as institution_id,
                i.name,
                i.type,
                i.address,
                ta.assigned_at
            FROM technician_assignments ta
            JOIN institutions i ON ta.institution_id = i.id
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
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND (
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        // Get the request details
        const [rows] = await db.query(`
            SELECT 
                sr.*, 
                CONCAT('SR-', YEAR(sr.created_at), '-', LPAD(sr.id, 4, '0')) as request_number,
                i.name as institution_name,
                i.address as location,
                ii.name as printer_name,
                ii.brand as brand,
                ii.model as model,
                ii.serial_number as serial_number,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.email as requester_email
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.id
            LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
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

// Update service request status with proper timestamp tracking
router.put('/service-requests/:requestId/status', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { status } = req.body;
        
        console.log(`[PUT /status] Updating status for request ${requestId} to ${status} by technician ${technicianId}`);
        
        // Validate status
        const validStatuses = ['assigned', 'in_progress', 'on_hold'];
        if (!validStatuses.includes(status)) {
            console.log('[PUT /status] Invalid status provided:', status);
            return res.status(400).json({ error: 'Invalid status. Technicians can only set assigned, in_progress, or on_hold status.' });
        }
        
        // Verify that this technician has access to this request
        console.log('[PUT /status] Checking technician access...');
        const [access] = await db.query(`
            SELECT sr.status, sr.is_walk_in FROM service_requests sr
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND (
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            console.log('[PUT /status] No access - technician not assigned to this request');
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        const currentStatus = access[0].status;
        console.log(`[PUT /status] Current status: ${currentStatus}, new status: ${status}`);
        
        // Verify valid status transition
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            console.log('[PUT /status] Cannot update completed/cancelled request');
            return res.status(400).json({ error: 'Cannot update a completed or cancelled request' });
        }
        
        // Prepare update fields
        let updateFields = 'status = ?, assigned_technician_id = ?, updated_at = NOW()';
        let updateValues = [status, technicianId];
        
        // Add timestamp tracking
        if (status === 'in_progress' && currentStatus !== 'in_progress') {
            updateFields += ', started_at = NOW()';
            console.log('[PUT /status] Adding started_at timestamp');
            
            // Send notification to requester that service has started
            try {
                const [techDetails] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [technicianId]
                );
                const [requestDetails] = await db.query(
                    'SELECT request_number, requested_by_user_id, description FROM service_requests WHERE id = ?',
                    [requestId]
                );
                
                if (techDetails[0] && requestDetails[0] && requestDetails[0].requested_by_user_id) {
                    await createNotification({
                        title: 'Service Started',
                        message: `Technician ${techDetails[0].first_name} ${techDetails[0].last_name} has started working on your service request ${requestDetails[0].request_number}`,
                        type: 'info',
                        user_id: requestDetails[0].requested_by_user_id,
                        sender_id: technicianId,
                        reference_type: 'service_request',
                        reference_id: requestId,
                        priority: 'medium'
                    });
                    console.log('[PUT /status] Notification sent to requester about service start');
                }
            } catch (notifError) {
                console.error('[PUT /status] Failed to send start notification:', notifError);
            }
        }
        
        // Update the status
        console.log('[PUT /status] Executing update query...');
        const updateResult = await db.query(
            `UPDATE service_requests SET ${updateFields} WHERE id = ?`,
            [...updateValues, requestId]
        );
        
        console.log('[PUT /status] Status update result:', updateResult[0]);
        
        // Try to add history record (but don't fail if history table doesn't exist)
        try {
            console.log('[PUT /status] Adding history record...');
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, currentStatus, status, technicianId, `Status updated by technician to ${status}`]
            );
            console.log('[PUT /status] History record added successfully');
        } catch (historyError) {
            console.warn('[PUT /status] Could not add history record (table may not exist):', historyError.message);
            // Continue without failing - history is optional
        }
        
        // Send notification to coordinator about status change
        if (status === 'in_progress' && currentStatus !== 'in_progress') {
            try {
                const [techDetails] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [technicianId]
                );
                const [requestDetails] = await db.query(
                    'SELECT sr.request_number, sr.requested_by_user_id, sr.institution_id, i.user_id as coordinator_id, i.name as institution_name FROM service_requests sr LEFT JOIN institutions i ON sr.institution_id = i.institution_id WHERE sr.id = ?',
                    [requestId]
                );
                
                if (techDetails[0] && requestDetails[0]) {
                    const techName = `${techDetails[0].first_name} ${techDetails[0].last_name}`;
                    const requestNumber = requestDetails[0].request_number;
                    
                    // Notify coordinator
                    if (requestDetails[0].coordinator_id) {
                        await createNotification({
                            title: 'Service Request In Progress',
                            message: `Technician ${techName} has started working on service request ${requestNumber} at ${requestDetails[0].institution_name}.`,
                            type: 'service_request',
                            user_id: requestDetails[0].coordinator_id,
                            sender_id: technicianId,
                            reference_type: 'service_request',
                            reference_id: requestId,
                            priority: 'medium'
                        });
                        console.log('✅ Notification sent to coordinator about service progress');
                    }
                    
                    // Notify requester
                    if (requestDetails[0].requested_by_user_id) {
                        await createNotification({
                            title: 'Service Request In Progress',
                            message: `Technician ${techName} has started working on your service request ${requestNumber}.`,
                            type: 'service_request',
                            user_id: requestDetails[0].requested_by_user_id,
                            sender_id: technicianId,
                            reference_type: 'service_request',
                            reference_id: requestId,
                            priority: 'medium'
                        });
                    }
                }
            } catch (notifError) {
                console.error('❌ Failed to send progress notification:', notifError);
            }
        }
        
        // Get the updated request data to return
        console.log('[PUT /status] Fetching updated request data...');
        const [updatedRequest] = await db.query(
            `SELECT id, status, started_at, updated_at FROM service_requests WHERE id = ?`,
            [requestId]
        );
        
        console.log('[PUT /status] Updated request data:', updatedRequest[0]);
        
        const responseData = { 
            message: 'Status updated successfully',
            status: status,
            started_at: updatedRequest[0]?.started_at,
            updated_at: updatedRequest[0]?.updated_at
        };
        
        console.log('[PUT /status] Sending response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('[PUT /status] Error updating service request status:', error);
        console.error('[PUT /status] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
});

// Complete a service request with enhanced job order functionality and coordinator approval workflow
router.post('/service-requests/:requestId/complete', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { actions, parts, notes } = req.body;
        
        if (!actions) {
            return res.status(400).json({ error: 'Actions description is required' });
        }
        
        // Verify that this technician has access to this request
        const [access] = await db.query(`
            SELECT sr.status, sr.is_walk_in FROM service_requests sr
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND (
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
        `, [requestId, technicianId]);
        
        if (access.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this service request' });
        }
        
        const currentStatus = access[0].status;
        
        // Cannot complete an already completed or cancelled request
        if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'pending_approval') {
            return res.status(400).json({ error: 'Cannot complete a request that is already completed, cancelled, or pending approval' });
        }
        
        // Validate parts availability in technician inventory
        if (parts && Array.isArray(parts) && parts.length > 0) {
            for (const part of parts) {
                if (part.name && part.qty > 0) {
                    // Build query to match by name and optionally brand
                    let query = `
                        SELECT ti.quantity 
                        FROM technician_inventory ti 
                        JOIN printer_parts pp ON ti.part_id = pp.id 
                        WHERE ti.technician_id = ? AND pp.name = ?
                    `;
                    const queryParams = [technicianId, part.name];
                    
                    // If brand is specified, include it in the validation
                    if (part.brand) {
                        query += ` AND pp.brand = ?`;
                        queryParams.push(part.brand);
                    }
                    
                    const [inventoryCheck] = await db.query(query, queryParams);
                    
                    if (inventoryCheck.length === 0 || inventoryCheck[0].quantity < part.qty) {
                        const brandInfo = part.brand ? ` (Brand: ${part.brand})` : '';
                        return res.status(400).json({ 
                            error: `Insufficient inventory for ${part.name}${brandInfo}. Available: ${inventoryCheck[0]?.quantity || 0}, Required: ${part.qty}` 
                        });
                    }
                }
            }
        }
        
        // Start a transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update the service request to pending approval status
            await db.query(
                `UPDATE service_requests 
                 SET status = 'pending_approval', 
                     resolution_notes = ?,
                     resolved_by = ?,
                     resolved_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [actions, technicianId, requestId]
            );
            
            // Add history record
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, currentStatus, 'pending_approval', technicianId, `Service completion submitted for approval. Actions: ${actions.substring(0, 100)}...`]
            );
            
            // Record parts used in service_parts_used table (but don't deduct from inventory yet)
            if (parts && Array.isArray(parts) && parts.length > 0) {
                for (const part of parts) {
                    if (part.name && part.qty > 0) {
                        // Get part_id from printer_parts table, matching by name and optionally brand
                        let query = `SELECT id FROM printer_parts WHERE name = ?`;
                        const queryParams = [part.name];
                        
                        if (part.brand) {
                            query += ` AND brand = ?`;
                            queryParams.push(part.brand);
                        }
                        
                        const [partInfo] = await db.query(query, queryParams);
                        
                        if (partInfo.length > 0) {
                            const brandInfo = part.brand ? ` (Brand: ${part.brand})` : '';
                            await db.query(
                                `INSERT INTO service_parts_used 
                                 (service_request_id, part_id, quantity_used, notes, used_by)
                                 VALUES (?, ?, ?, ?, ?)`,
                                [requestId, partInfo[0].id, part.qty, `Used ${part.qty} ${part.unit || 'pieces'}${brandInfo}`, technicianId]
                            );
                        }
                    }
                }
            }
            
            // Create service approval record
            await db.query(
                `INSERT INTO service_approvals 
                 (service_request_id, status, technician_notes, submitted_at)
                 VALUES (?, ?, ?, NOW())`,
                [requestId, 'pending_approval', actions]
            );
            
            // Get coordinator for notification and send notification ONLY to coordinator
            // Requester will be notified after coordinator approves the service
            try {
                const [techDetails] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [technicianId]
                );
                const [requestDetails] = await db.query(
                    'SELECT sr.request_number, sr.requested_by_user_id, sr.description, sr.institution_id, i.user_id as coordinator_id, i.name as institution_name FROM service_requests sr LEFT JOIN institutions i ON sr.institution_id = i.institution_id WHERE sr.id = ?',
                    [requestId]
                );
                
                if (techDetails[0] && requestDetails[0]) {
                    const techName = `${techDetails[0].first_name} ${techDetails[0].last_name}`;
                    const requestNumber = requestDetails[0].request_number;
                    
                    // Send notification ONLY to coordinator for approval
                    // Requester will be notified after coordinator approves
                    if (requestDetails[0].coordinator_id) {
                        await createNotification({
                            title: 'Service Request Pending Your Approval',
                            message: `Technician ${techName} has completed service request ${requestNumber} at ${requestDetails[0].institution_name}. Please review and approve.`,
                            type: 'service_request',
                            user_id: requestDetails[0].coordinator_id,
                            sender_id: technicianId,
                            reference_type: 'service_request',
                            reference_id: requestId,
                            priority: 'high'
                        });
                        console.log('✅ Notification sent to coordinator for approval');
                    }
                }
            } catch (notifError) {
                console.error('❌ Failed to send completion notifications:', notifError);
            }
            
            // Commit the transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service completion submitted for approval',
                status: 'pending_approval'
            });
        } catch (error) {
            // Rollback in case of error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error submitting service completion:', error);
        res.status(500).json({ error: 'Failed to submit service completion' });
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
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND (
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
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
            SELECT sr.status, sr.is_walk_in FROM service_requests sr
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id
            WHERE sr.id = ? AND (
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
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

// Get available printer parts from technician's inventory
router.get('/parts', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT ti.id, ti.part_id, pp.name, pp.brand, pp.category, ti.quantity as stock, pp.unit
            FROM technician_inventory ti
            JOIN printer_parts pp ON ti.part_id = pp.id
            WHERE ti.technician_id = ? AND ti.quantity > 0
            ORDER BY pp.brand, pp.category, pp.name
        `, [technicianId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching technician inventory parts:', error);
        res.status(500).json({ error: 'Failed to fetch inventory parts' });
    }
});

module.exports = router;