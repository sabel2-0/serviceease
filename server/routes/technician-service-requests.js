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
                ii.location,
                ii.department as printer_department,
                sr.description as issue,
                sr.created_at,
                sr.printer_id,
                ii.name as printer_name,
                ii.brand as brand,
                ii.model as model,
                ii.serial_number as serial_number,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details,
                institution_user.first_name as institution_user_first_name,
                institution_user.last_name as institution_user_last_name,
                institution_user.email as institution_user_email,
                institution_user.role as institution_user_role,
                sr.is_walk_in,
                sr.walk_in_customer_name,
                sr.printer_brand
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN technician_assignments ta ON sr.institution_id = ta.institution_id AND ta.technician_id = ? AND ta.is_active = TRUE
            LEFT JOIN printers ii ON sr.printer_id = ii.id
            LEFT JOIN users institution_user ON sr.requested_by = institution_user.id
            WHERE (
                (sr.technician_id = ?) OR
                (ta.technician_id IS NOT NULL) OR 
                (sr.is_walk_in = TRUE)
            )
            ${statusFilter}
            ORDER BY sr.created_at DESC
        `, [technicianId, technicianId]);
        
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
                institution_user.first_name as institution_user_first_name,
                institution_user.last_name as institution_user_last_name,
                institution_user.email as institution_user_email
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.id
            LEFT JOIN printers ii ON sr.printer_id = ii.id
            LEFT JOIN users institution_user ON sr.requested_by = institution_user.id
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
        
        // Get parts used for this service request
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.quantity_used,
                spu.notes as part_notes,
                spu.used_at,
                pp.name as part_name,
                pp.brand,
                pp.category,
                pp.color,
                pp.page_yield,
                pp.ink_volume,
                pp.is_universal,
                pp.unit,
                CONCAT(u.first_name, ' ', u.last_name) as used_by_name,
                u.first_name as used_by_first_name,
                u.last_name as used_by_last_name
            FROM service_items_used spu
            JOIN printer_items pp ON spu.item_id = pp.id
            LEFT JOIN users u ON spu.used_by = u.id
            WHERE spu.service_id = ? AND spu.service_type = 'service_request'
            ORDER BY spu.used_at DESC
        `, [requestId]);
        
        request.parts_used = partsUsed;
        
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
                (sr.technician_id = ?) OR
                (ta.technician_id = ? AND ta.is_active = TRUE) OR
                (sr.is_walk_in = TRUE)
            )
        `, [requestId, technicianId, technicianId]);
        
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
        let updateFields = 'status = ?, technician_id = ?';
        let updateValues = [status, technicianId];
        
        // Add timestamp tracking
        if (status === 'in_progress' && currentStatus !== 'in_progress') {
            updateFields += ', started_at = NOW()';
            console.log('[PUT /status] Adding started_at timestamp');
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
        
        // Send notification to institution_admin about status change
        if (status === 'in_progress' && currentStatus !== 'in_progress') {
            try {
                const [techDetails] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [technicianId]
                );
                const [requestDetails] = await db.query(
                    'SELECT sr.request_number, sr.requested_by, sr.institution_id, sr.is_walk_in, sr.walk_in_customer_name, i.user_id as institution_admin_id, i.name as institution_name FROM service_requests sr LEFT JOIN institutions i ON sr.institution_id = i.institution_id WHERE sr.id = ?',
                    [requestId]
                );
                
                if (techDetails[0] && requestDetails[0]) {
                    const techName = `${techDetails[0].first_name} ${techDetails[0].last_name}`;
                    const requestNumber = requestDetails[0].request_number;
                    
                    // If it's a walk-in request, notify admins/operations officers instead of institution_admin
                    if (requestDetails[0].is_walk_in) {
                        const [admins] = await db.query(
                            `SELECT id FROM users WHERE role IN ('admin', 'operations_officer') AND status = 'active'`
                        );
                        
                        const customerName = requestDetails[0].walk_in_customer_name || 'Walk-in Customer';
                        
                        for (const admin of admins) {
                            try {
                                await createNotification({
                                    title: 'Walk-In Service Request In Progress',
                                    message: `Technician ${techName} has started working on walk-in service request ${requestNumber} for ${customerName}.`,
                                    type: 'service_request',
                                    user_id: admin.id,
                                    sender_id: technicianId,
                                    reference_type: 'service_request',
                                    reference_id: requestId,
                                    priority: 'medium'
                                });
                            } catch (notifError) {
                                console.error('Failed to create notification for admin:', admin.id, notifError);
                            }
                        }
                        console.log('✅ Notifications sent to admins/operations officers about walk-in service progress');
                    } else {
                        // For regular requests, notify institution_admin
                        if (requestDetails[0].institution_admin_id) {
                            await createNotification({
                                title: 'Service Request In Progress',
                                message: `Technician ${techName} has started working on service request ${requestNumber} at ${requestDetails[0].institution_name}.`,
                                type: 'service_request',
                                user_id: requestDetails[0].institution_admin_id,
                                sender_id: technicianId,
                                reference_type: 'service_request',
                                reference_id: requestId,
                                priority: 'medium'
                            });
                            console.log('✅ Notification sent to institution_admin about service progress');
                        }
                    }
                    
                    // Notify institution_user (for non-walk-in requests)
                    if (requestDetails[0].requested_by && !requestDetails[0].is_walk_in) {
                        await createNotification({
                            title: 'Service Request In Progress',
                            message: `Technician ${techName} has started working on your service request ${requestNumber}.`,
                            type: 'service_request',
                            user_id: requestDetails[0].requested_by,
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
            `SELECT id, status, started_at FROM service_requests WHERE id = ?`,
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

// Complete a service request with enhanced job order functionality and institution_admin approval workflow
router.post('/service-requests/:requestId/complete', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { requestId } = req.params;
        const { actions, parts, notes, completion_photo } = req.body;
        
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
                        JOIN printer_items pp ON ti.item_id = pp.id 
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
        
        // Upload completion photo to Cloudinary if provided
        let photoUrl = null;
        if (completion_photo) {
            try {
                const cloudinary = require('cloudinary').v2;
                const uploadResult = await cloudinary.uploader.upload(completion_photo, {
                    folder: 'serviceease/completion_photos',
                    resource_type: 'auto'
                });
                photoUrl = uploadResult.secure_url;
                console.log('[COMPLETE] Photo uploaded to Cloudinary:', photoUrl);
            } catch (uploadError) {
                console.error('[COMPLETE] Error uploading completion photo:', uploadError);
                return res.status(500).json({ error: 'Failed to upload completion photo' });
            }
        }

        // Start a transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update the service request to pending approval status with photo
            await db.query(
                `UPDATE service_requests 
                 SET status = 'pending_approval', 
                     resolution_notes = ?,
                     completion_photo_url = ?
                 WHERE id = ?`,
                [actions, photoUrl, requestId]
            );
            
            // Add history record
            await db.query(
                `INSERT INTO service_request_history 
                 (request_id, previous_status, new_status, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [requestId, currentStatus, 'pending_approval', technicianId, `Service completion submitted for approval. Actions: ${actions.substring(0, 100)}...`]
            );
            
            // Delete existing parts if resubmitting (to prevent duplicates)
            await db.query(
                'DELETE FROM service_items_used WHERE service_id = ? AND service_type = \'service_request\'',
                [requestId]
            );
            
            console.log('[COMPLETE] Parts received:', JSON.stringify(parts, null, 2));
            
            // Record parts used in service_items_used table (but don't deduct from inventory yet)
            if (parts && Array.isArray(parts) && parts.length > 0) {
                console.log('[COMPLETE] Processing', parts.length, 'parts');
                for (const part of parts) {
                    console.log('[COMPLETE] Processing part:', part);
                    if (part.name && part.qty > 0) {
                        // Get item_id from printer_items table, prioritizing parts in technician's inventory
                        let query = `
                            SELECT pp.id, 
                                   CASE WHEN ti.id IS NOT NULL THEN 1 ELSE 0 END as in_inventory
                            FROM printer_items pp
                            LEFT JOIN technician_inventory ti ON pp.id = ti.item_id 
                                AND ti.technician_id = ? 
                                AND ti.quantity > 0
                            WHERE pp.name = ?`;
                        const queryParams = [technicianId, part.name];
                        
                        if (part.brand) {
                            query += ` AND pp.brand = ?`;
                            queryParams.push(part.brand);
                        }
                        
                        query += ` ORDER BY in_inventory DESC, pp.is_universal DESC, pp.id ASC LIMIT 1`;
                        
                        const [partInfo] = await db.query(query, queryParams);
                        
                        console.log('[COMPLETE] Part lookup result:', partInfo);
                        
                        if (partInfo.length > 0) {
                            const brandInfo = part.brand ? ` (Brand: ${part.brand})` : '';
                            console.log('[COMPLETE] Inserting part usage:', {
                                service_id: requestId,
                                item_id: partInfo[0].id,
                                quantity_used: part.qty,
                                consumption_type: part.consumption_type || null,
                                amount_consumed: part.amount_consumed || null,
                                notes: `Used ${part.qty} ${part.unit || 'pieces'}${brandInfo}`,
                                used_by: technicianId
                            });
                            
                            // Insert service item usage
                            await db.query(
                                `INSERT INTO service_items_used 
                                 (service_id, service_type, item_id, quantity_used, consumption_type, amount_consumed, notes, used_by)
                                 VALUES (?, 'service_request', ?, ?, ?, ?, ?, ?)`,
                                [
                                    requestId, 
                                    partInfo[0].id, 
                                    part.qty, 
                                    part.consumption_type || null,
                                    part.amount_consumed || null,
                                    `Used ${part.qty} ${part.unit || 'pieces'}${brandInfo}`, 
                                    technicianId
                                ]
                            );
                            
                            // Handle partial consumption for inventory updates
                            if (part.consumption_type === 'partial' && part.amount_consumed) {
                                // Get item details to determine if it's ink or toner
                                const [itemDetails] = await db.query(
                                    'SELECT ink_volume, toner_weight FROM printer_items WHERE id = ?',
                                    [partInfo[0].id]
                                );
                                
                                if (itemDetails.length > 0) {
                                    const item = itemDetails[0];
                                    const capacity = item.ink_volume || item.toner_weight;
                                    
                                    if (capacity && parseFloat(capacity) > 0) {
                                        const remaining = parseFloat(capacity) - parseFloat(part.amount_consumed);
                                        
                                        // Update the item's remaining amount and mark as opened
                                        const updateColumn = item.ink_volume ? 'remaining_volume' : 'remaining_weight';
                                        await db.query(
                                            `UPDATE printer_items 
                                             SET ${updateColumn} = ?, is_opened = 1 
                                             WHERE id = ?`,
                                            [remaining, partInfo[0].id]
                                        );
                                        
                                        console.log('[COMPLETE] Updated partial consumption:', {
                                            itemId: partInfo[0].id,
                                            column: updateColumn,
                                            remaining: remaining
                                        });
                                    }
                                }
                            }
                            
                            console.log('[COMPLETE] Part usage inserted successfully');
                        } else {
                            console.log('[COMPLETE] Part not found in database:', part.name, part.brand);
                        }
                    }
                }
            }
            
            // Create or update service approval record
            const [existingApproval] = await db.query(
                'SELECT id FROM service_approvals WHERE service_id = ?',
                [requestId]
            );
            
            if (existingApproval.length === 0) {
                await db.query(
                    `INSERT INTO service_approvals 
                     (service_id, service_type, status, technician_notes, submitted_at)
                     VALUES (?, 'service_request', ?, ?, NOW())`,
                    [requestId, 'pending_approval', actions]
                );
            } else {
                // Update existing record back to pending_approval if it was rejected
                await db.query(
                    `UPDATE service_approvals 
                     SET status = 'pending_approval',
                         technician_notes = ?,
                         submitted_at = NOW(),
                         approved_by = NULL,
                         institution_admin_notes = NULL,
                         reviewed_at = NULL
                     WHERE service_id = ?`,
                    [actions, requestId]
                );
            }
            
            // Get institution_admin for notification and send notification ONLY to institution_admin
            // institution_user will be notified after institution_admin approves the service
            try {
                const [techDetails] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [technicianId]
                );
                const [requestDetails] = await db.query(
                    'SELECT sr.request_number, sr.requested_by, sr.description, sr.institution_id, sr.is_walk_in, sr.walk_in_customer_name, i.user_id as institution_admin_id, i.name as institution_name FROM service_requests sr LEFT JOIN institutions i ON sr.institution_id = i.institution_id WHERE sr.id = ?',
                    [requestId]
                );
                
                if (techDetails[0] && requestDetails[0]) {
                    const techName = `${techDetails[0].first_name} ${techDetails[0].last_name}`;
                    const requestNumber = requestDetails[0].request_number;
                    
                    // If it's a walk-in request, notify admins and operations officers
                    if (requestDetails[0].is_walk_in) {
                        const [admins] = await db.query(
                            `SELECT id FROM users WHERE role IN ('admin', 'operations_officer') AND status = 'active'`
                        );
                        
                        const customerName = requestDetails[0].walk_in_customer_name || 'Unknown Customer';
                        
                        for (const admin of admins) {
                            await createNotification({
                                title: 'Walk-In Service Completed - Requires Approval',
                                message: `Technician ${techName} has completed walk-in service request ${requestNumber} for customer "${customerName}". Please review and approve.`,
                                type: 'service_request',
                                user_id: admin.id,
                                sender_id: technicianId,
                                reference_type: 'service_request',
                                reference_id: requestId,
                                priority: 'high'
                            });
                        }
                        console.log('✅ Notification sent to admins/operations officers for walk-in approval');
                    } else {
                        // Send notification ONLY to institution_admin for approval
                        // institution_user will be notified after institution_admin approves
                        if (requestDetails[0].institution_admin_id) {
                            await createNotification({
                                title: 'Service Request Pending Your Approval',
                                message: `Technician ${techName} has completed service request ${requestNumber} at ${requestDetails[0].institution_name}. Please review and approve.`,
                                type: 'service_request',
                                user_id: requestDetails[0].institution_admin_id,
                                sender_id: technicianId,
                                reference_type: 'service_request',
                                reference_id: requestId,
                                priority: 'high'
                            });
                            console.log('✅ Notification sent to institution_admin for approval');
                        }
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

// NOTE: The GET /parts endpoint has been removed from this file to avoid duplication.
// Technicians' parts inventory is now handled exclusively by technician-inventory.js
// which returns ONLY the parts from the technician's personal inventory (not admin's central inventory)

module.exports = router;





