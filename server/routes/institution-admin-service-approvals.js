const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to check if user is a institution_admin
const authenticateinstitution_admin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'serviceease_dev_secret');
        
        // Get user with role information - note: JWT uses 'id' field, not 'userId'
        const [users] = await db.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?', 
            [decoded.id]  // Changed from decoded.userId to decoded.id
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = users[0];
        
        // Check if user is a institution_admin
        if (user.role !== 'institution_admin') {
            return res.status(403).json({ error: 'institution_admin access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get pending service approvals for the institution_admin
router.get('/pending', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        console.log('[DEBUG] institution_admin ID:', institution_adminId);
        console.log('[DEBUG] User info:', req.user);
        
        // Get pending service approvals based on requested_by in service_requests
        const [pendingApprovals] = await db.query(`
            SELECT 
                sa.id as approval_id,
                sa.service_id,
                sa.status as approval_status,
                sa.submitted_at,
                sa.technician_notes as actions_performed,
                sr.description as request_description,
                sr.priority,
                ii.location,
                ii.department as printer_department,
                sr.resolution_notes,
                sr.technician_id,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                i.name as institution_name,
                GROUP_CONCAT(
                    CONCAT(pp.name, ' (', spu.quantity_used, ' ', COALESCE(pp.unit, 'units'), ')')
                    SEPARATOR ', '
                ) as parts_used
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_id = sr.id
            JOIN users tech ON sr.technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN printers ii ON sr.printer_id = ii.id
            LEFT JOIN service_items_used spu ON sr.id = spu.service_id AND spu.service_type = 'service_request'
            LEFT JOIN printer_items pp ON spu.item_id = pp.id
            WHERE i.user_id = ?
                AND sa.status = 'pending_approval'
                AND sa.service_type = 'service_request'
                AND sr.status = 'pending_approval'
            GROUP BY sa.id, sa.service_id, sa.status, sa.submitted_at,
                     sa.technician_notes, sr.description, sr.priority, ii.location, ii.department, sr.resolution_notes,
                     sr.technician_id, tech.first_name, tech.last_name, i.name
            ORDER BY sa.submitted_at DESC
        `, [institution_adminId]);
        
        console.log('[DEBUG] Pending approvals found:', pendingApprovals.length);
        res.json(pendingApprovals);
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
});

// Get details of a specific service approval
router.get('/:approvalId/details', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        const { approvalId } = req.params;
        
        // Get approval details with full service information
        const [approvalDetails] = await db.query(`
            SELECT 
                sa.id as approval_id,
                sa.service_id,
                sa.status as approval_status,
                sa.submitted_at,
                sa.reviewed_at,
                sr.*,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email,
                i.name as institution_name,
                sa.technician_notes as actions_performed,
                sa.technician_notes as additional_notes,
                sa.submitted_at as job_created_at
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_id = sr.id
            JOIN users tech ON sr.technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sa.id = ? AND i.user_id = ? AND sa.service_type = 'service_request'
        `, [approvalId, institution_adminId]);
        
        if (approvalDetails.length === 0) {
            return res.status(404).json({ error: 'Service approval not found' });
        }
        
        // Get parts used
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.quantity_used,
                spu.consumption_type,
                spu.amount_consumed,
                pp.unit,
                pp.ink_volume,
                pp.toner_weight,
                spu.used_at as created_at,
                pp.name as part_name,
                pp.category,
                pp.brand,
                CASE
                    WHEN spu.consumption_type = 'partial' AND spu.amount_consumed IS NOT NULL THEN
                        CONCAT(spu.amount_consumed, IF(pp.ink_volume IS NOT NULL, 'ml', 'grams'))
                    WHEN spu.consumption_type = 'full' AND spu.amount_consumed IS NOT NULL THEN
                        CONCAT(spu.amount_consumed, IF(pp.ink_volume IS NOT NULL, 'ml', 'grams'))
                    ELSE NULL
                END as display_amount
            FROM service_items_used spu
            JOIN printer_items pp ON spu.item_id = pp.id
            WHERE spu.service_id = ? AND spu.service_type = 'service_request'
            ORDER BY pp.category, pp.name
        `, [approvalDetails[0].service_id]);
        
        res.json({
            approval: approvalDetails[0],
            items_used: partsUsed
        });
    } catch (error) {
        console.error('Error fetching approval details:', error);
        res.status(500).json({ error: 'Failed to fetch approval details' });
    }
});

// Approve a service completion
router.post('/:approvalId/approve', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        const { approvalId } = req.params;
        const { notes } = req.body;
        
        // Verify the approval belongs to this institution_admin's service requests
        const [approvalCheck] = await db.query(`
            SELECT sa.service_id, sr.technician_id, sa.status, sr.status as request_status
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_id = sr.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sa.id = ? AND i.user_id = ? AND sa.status = 'pending_approval' AND sa.service_type = 'service_request'
        `, [approvalId, institution_adminId]);
        
        if (approvalCheck.length === 0) {
            return res.status(404).json({ error: 'Service approval not found or already processed' });
        }
        
        const serviceRequestId = approvalCheck[0].service_id;
        const technicianId = approvalCheck[0].technician_id;
        
        // Get institution_admin information first
        const [institution_adminInfo] = await db.query(`
            SELECT u.first_name, u.last_name, u.role
            FROM users u
            WHERE u.id = ?
        `, [institution_adminId]);
        
        const institution_adminName = institution_adminInfo.length > 0 
            ? `${institution_adminInfo[0].first_name} ${institution_adminInfo[0].last_name}`
            : 'Institution Admin';
        const institution_adminRole = institution_adminInfo.length > 0 
            ? institution_adminInfo[0].role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
            : 'Institution Admin';
        
        // Start transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update service approval status with approver
            await db.query(`
                UPDATE service_approvals 
                SET status = 'approved',
                    approved_by = ?,
                    reviewed_at = NOW()
                WHERE id = ?`,
                [institution_adminId, approvalId]
            );
            // Update service request status to completed with approver information
            const resolutionNotes = `Approved by ${institution_adminRole} - ${institution_adminName}${notes ? '. ' + notes : ''}`;
            await db.query(`
                UPDATE service_requests 
                SET status = 'completed', 
                    completed_at = NOW(),
                    resolution_notes = ?
                WHERE id = ?`,
                [resolutionNotes, serviceRequestId]
            );
            
            // Deduct parts from technician inventory based on consumption type
            const [partsToDeduct] = await db.query(`
                SELECT spu.item_id, spu.quantity_used, spu.consumption_type, spu.amount_consumed
                FROM service_items_used spu
                WHERE spu.service_id = ? AND spu.service_type = 'service_request'
            `, [serviceRequestId]);
            
            for (const part of partsToDeduct) {
                if (part.consumption_type === 'full') {
                    // Full consumption: deduct quantity and reset remaining volume/weight
                    await db.query(`
                        UPDATE technician_inventory 
                        SET quantity = GREATEST(0, quantity - ?),
                            remaining_volume = NULL,
                            remaining_weight = NULL,
                            is_opened = 0
                        WHERE technician_id = ? AND item_id = ?
                    `, [part.quantity_used, technicianId, part.item_id]);
                    
                    console.log(`✅ Full consumption: deducted ${part.quantity_used} units of item ${part.item_id}`);
                    
                } else if (part.consumption_type === 'partial' && part.amount_consumed) {
                    // Partial consumption: update remaining volume/weight, mark as opened, DON'T deduct quantity
                    // Get current remaining from technician inventory and item capacity
                    const [techInventory] = await db.query(`
                        SELECT ti.remaining_volume, ti.remaining_weight, pi.ink_volume, pi.toner_weight
                        FROM technician_inventory ti
                        JOIN printer_items pi ON ti.item_id = pi.id
                        WHERE ti.technician_id = ? AND ti.item_id = ?
                    `, [technicianId, part.item_id]);
                    
                    if (techInventory.length > 0) {
                        const item = techInventory[0];
                        
                        // Determine if it's ink or toner and get current remaining amount
                        const isInk = item.ink_volume && parseFloat(item.ink_volume) > 0;
                        const currentRemaining = isInk ? 
                            (item.remaining_volume || 0) : 
                            (item.remaining_weight || 0);
                        
                        // Calculate new remaining amount after consumption
                        const newRemaining = parseFloat(currentRemaining) - parseFloat(part.amount_consumed);
                        
                        // Update the TECHNICIAN's inventory item remaining amount
                        const updateColumn = isInk ? 'remaining_volume' : 'remaining_weight';
                        await db.query(`
                            UPDATE technician_inventory 
                            SET ${updateColumn} = ?, is_opened = 1 
                            WHERE technician_id = ? AND item_id = ?
                        `, [newRemaining > 0 ? newRemaining : 0, technicianId, part.item_id]);
                        
                        console.log(`✅ Partial consumption: ${part.amount_consumed}${isInk ? 'ml' : 'g'} consumed, remaining ${newRemaining > 0 ? newRemaining : 0}${isInk ? 'ml' : 'g'} (quantity not deducted)`);
                    }
                    
                } else {
                    // No consumption type (old data or non-consumables): deduct quantity as before
                    await db.query(`
                        UPDATE technician_inventory 
                        SET quantity = GREATEST(0, quantity - ?)
                        WHERE technician_id = ? AND item_id = ?
                    `, [part.quantity_used, technicianId, part.item_id]);
                    
                    console.log(`✅ Standard deduction: deducted ${part.quantity_used} units of item ${part.item_id}`);
                }
            }
            
            const [institutionInfo] = await db.query(`
                SELECT i.name as institution_name
                FROM service_requests sr
                JOIN institutions i ON sr.institution_id = i.institution_id
                WHERE sr.id = ?
            `, [serviceRequestId]);
            
            // Add history record with approver name
            await db.query(`
                INSERT INTO service_request_history 
                (request_id, previous_status, new_status, changed_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [serviceRequestId, 'pending_approval', 'completed', institution_adminId, `Service completion approved by ${institution_adminRole} - ${institution_adminName}. ${notes || ''}`]);
            const institutionName = institutionInfo.length > 0 
                ? institutionInfo[0].institution_name
                : 'your institution';
            
            // Create notification for technician
            await db.query(`
                INSERT INTO notifications 
                (user_id, sender_id, type, reference_type, reference_id, title, message, priority, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                technicianId,
                institution_adminId,
                'service_approved',
                'service_request',
                serviceRequestId,
                'Service Completion Approved',
                `Your service completion for request #${serviceRequestId} has been approved by ${institution_adminName} at ${institutionName}. ${notes ? 'Notes: ' + notes : ''}`,
                'low'
            ]);
            
            // Commit transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service completion approved successfully',
                service_id: serviceRequestId
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Error approving service completion:', error);
        res.status(500).json({ error: 'Failed to approve service completion' });
    }
});

// Reject a service completion
router.post('/:approvalId/reject', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        const { approvalId } = req.params;
        const { notes } = req.body;
        
        if (!notes || !notes.trim()) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        // Verify the approval belongs to this institution_admin's service requests
        const [approvalCheck] = await db.query(`
            SELECT sa.service_id, sr.technician_id, sa.status
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_id = sr.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sa.id = ? AND i.user_id = ? AND sa.status = 'pending_approval' AND sa.service_type = 'service_request'
        `, [approvalId, institution_adminId]);
        
        if (approvalCheck.length === 0) {
            return res.status(404).json({ error: 'Service approval not found or already processed' });
        }
        
        const serviceRequestId = approvalCheck[0].service_id;
        const technicianId = approvalCheck[0].technician_id;
        
        // Start transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update service approval status
            await db.query(`
                UPDATE service_approvals 
                SET status = 'rejected', 
                    reviewed_at = NOW()
                WHERE id = ?
            `, [approvalId]);
            
            // Update service request status back to in_progress
            await db.query(`
                UPDATE service_requests 
                SET status = 'in_progress', completed_at = NULL
                WHERE id = ?`,
                [serviceRequestId]
            );
            
            // Remove parts used records (they can be re-added when resubmitted)
            await db.query(`
                DELETE FROM service_items_used 
                WHERE service_id = ? AND service_type = 'service_request'
            `, [serviceRequestId]);
            
            // Add history record
            await db.query(`
                INSERT INTO service_request_history 
                (request_id, previous_status, new_status, changed_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [serviceRequestId, 'pending_approval', 'in_progress', institution_adminId, `Service completion rejected by institution_admin. Reason: ${notes}`]);
            
            // Get institution_admin and institution information for notification
            const [institution_adminInfo] = await db.query(`
                SELECT u.first_name, u.last_name
                FROM users u
                WHERE u.id = ?
            `, [institution_adminId]);
            
            const [institutionInfo] = await db.query(`
                SELECT i.name as institution_name
                FROM service_requests sr
                JOIN institutions i ON sr.institution_id = i.institution_id
                WHERE sr.id = ?
            `, [serviceRequestId]);
            
            const institution_adminName = institution_adminInfo.length > 0 
                ? `${institution_adminInfo[0].first_name} ${institution_adminInfo[0].last_name}`
                : 'institution_admin';
            const institutionName = institutionInfo.length > 0 
                ? institutionInfo[0].institution_name
                : 'your institution';
            
            // Create notification for technician
            await db.query(`
                INSERT INTO notifications 
                (user_id, sender_id, type, reference_type, reference_id, title, message, priority, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                technicianId,
                institution_adminId,
                'service_revision_requested',
                'service_request',
                serviceRequestId,
                'Service Completion Rejected - Revision Required',
                `Your service completion for request #${serviceRequestId} was rejected by ${institution_adminName} at ${institutionName}. Please review and resubmit. Reason: ${notes}`,
                'high'
            ]);
            
            // Commit transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service completion rejected',
                service_id: serviceRequestId
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Error rejecting service completion:', error);
        res.status(500).json({ error: 'Failed to reject service completion' });
    }
});

module.exports = router;




