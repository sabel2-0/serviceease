const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to check if user is a coordinator
const authenticateCoordinator = async (req, res, next) => {
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
        
        // Check if user is a coordinator
        if (user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Coordinator access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get pending service approvals for the coordinator
router.get('/pending', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        console.log('[DEBUG] Coordinator ID:', coordinatorId);
        console.log('[DEBUG] User info:', req.user);
        
        // Get pending service approvals based on requested_by_user_id in service_requests
        const [pendingApprovals] = await db.query(`
            SELECT 
                sa.id as approval_id,
                sa.service_request_id,
                sa.status as approval_status,
                sa.submitted_at,
                sa.technician_notes as actions_performed,
                sr.description as request_description,
                sr.priority,
                sr.location,
                sr.resolution_notes,
                sr.resolved_at,
                sr.assigned_technician_id,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                i.name as institution_name,
                GROUP_CONCAT(
                    CONCAT(pp.name, ' (', spu.quantity_used, ' ', COALESCE(pp.unit, 'units'), ')')
                    SEPARATOR ', '
                ) as parts_used
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            JOIN users tech ON sr.assigned_technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            LEFT JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE sr.requested_by_user_id = ?
                AND sa.status = 'pending_approval'
                AND sr.status = 'pending_approval'
            GROUP BY sa.id, sa.service_request_id, sa.status, sa.submitted_at,
                     sa.technician_notes, sr.description, sr.priority, sr.location, sr.resolution_notes, sr.resolved_at,
                     sr.assigned_technician_id, tech.first_name, tech.last_name, i.name
            ORDER BY sa.submitted_at DESC
        `, [coordinatorId]);
        
        console.log('[DEBUG] Pending approvals found:', pendingApprovals.length);
        res.json(pendingApprovals);
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
});

// Get details of a specific service approval
router.get('/:approvalId/details', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const { approvalId } = req.params;
        
        // Get approval details with full service information
        const [approvalDetails] = await db.query(`
            SELECT 
                sa.id as approval_id,
                sa.service_request_id,
                sa.status as approval_status,
                sa.submitted_at,
                sa.reviewed_at,
                sa.coordinator_notes as approval_notes,
                sr.*,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email,
                i.name as institution_name,
                sa.technician_notes as actions_performed,
                sa.technician_notes as additional_notes,
                sa.submitted_at as job_created_at
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            JOIN users tech ON sr.assigned_technician_id = tech.id
            JOIN institutions i ON sr.institution_id = i.institution_id
            WHERE sa.id = ? AND sr.requested_by_user_id = ?
        `, [approvalId, coordinatorId]);
        
        if (approvalDetails.length === 0) {
            return res.status(404).json({ error: 'Service approval not found' });
        }
        
        // Get parts used
        const [partsUsed] = await db.query(`
            SELECT 
                spu.id,
                spu.quantity_used,
                pp.unit,
                spu.used_at as created_at,
                pp.name as part_name,
                pp.category,
                pp.brand
            FROM service_parts_used spu
            JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE spu.service_request_id = ?
            ORDER BY pp.category, pp.name
        `, [approvalDetails[0].service_request_id]);
        
        res.json({
            approval: approvalDetails[0],
            parts_used: partsUsed
        });
    } catch (error) {
        console.error('Error fetching approval details:', error);
        res.status(500).json({ error: 'Failed to fetch approval details' });
    }
});

// Approve a service completion
router.post('/:approvalId/approve', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const { approvalId } = req.params;
        const { notes } = req.body;
        
        // Verify the approval belongs to this coordinator's service requests
        const [approvalCheck] = await db.query(`
            SELECT sa.service_request_id, sr.assigned_technician_id, sa.status, sr.status as request_status
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            WHERE sa.id = ? AND sr.requested_by_user_id = ? AND sa.status = 'pending_approval'
        `, [approvalId, coordinatorId]);
        
        if (approvalCheck.length === 0) {
            return res.status(404).json({ error: 'Service approval not found or already processed' });
        }
        
        const serviceRequestId = approvalCheck[0].service_request_id;
        const technicianId = approvalCheck[0].assigned_technician_id;
        
        // Start transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update service approval status
            await db.query(`
                UPDATE service_approvals 
                SET status = 'approved', 
                    reviewed_at = NOW(),
                    coordinator_notes = ?
                WHERE id = ?
            `, [notes || null, approvalId]);
            
            // Update service request status to completed
            await db.query(`
                UPDATE service_requests 
                SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                WHERE id = ?
            `, [serviceRequestId]);
            
            // Deduct parts from technician inventory
            const [partsToDeduct] = await db.query(`
                SELECT spu.part_id, spu.quantity_used
                FROM service_parts_used spu
                WHERE spu.service_request_id = ?
            `, [serviceRequestId]);
            
            for (const part of partsToDeduct) {
                await db.query(`
                    UPDATE technician_inventory 
                    SET quantity = GREATEST(0, quantity - ?)
                    WHERE technician_id = ? AND part_id = ?
                `, [part.quantity_used, technicianId, part.part_id]);
            }
            
            // Add history record
            await db.query(`
                INSERT INTO service_request_history 
                (request_id, previous_status, new_status, changed_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [serviceRequestId, 'pending_approval', 'completed', coordinatorId, `Service completion approved by coordinator. ${notes || ''}`]);
            
            // Get coordinator and institution information for notification
            const [coordinatorInfo] = await db.query(`
                SELECT u.first_name, u.last_name
                FROM users u
                WHERE u.id = ?
            `, [coordinatorId]);
            
            const [institutionInfo] = await db.query(`
                SELECT i.name as institution_name
                FROM service_requests sr
                JOIN institutions i ON sr.institution_id = i.institution_id
                WHERE sr.id = ?
            `, [serviceRequestId]);
            
            const coordinatorName = coordinatorInfo.length > 0 
                ? `${coordinatorInfo[0].first_name} ${coordinatorInfo[0].last_name}`
                : 'coordinator';
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
                coordinatorId,
                'service_approved',
                'service_request',
                serviceRequestId,
                'Service Completion Approved',
                `Your service completion for request #${serviceRequestId} has been approved by ${coordinatorName} at ${institutionName}. ${notes ? 'Notes: ' + notes : ''}`,
                'low'
            ]);
            
            // Commit transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service completion approved successfully',
                service_request_id: serviceRequestId
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
router.post('/:approvalId/reject', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const { approvalId } = req.params;
        const { notes } = req.body;
        
        if (!notes || !notes.trim()) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        // Verify the approval belongs to this coordinator's service requests
        const [approvalCheck] = await db.query(`
            SELECT sa.service_request_id, sr.assigned_technician_id, sa.status
            FROM service_approvals sa
            JOIN service_requests sr ON sa.service_request_id = sr.id
            WHERE sa.id = ? AND sr.requested_by_user_id = ? AND sa.status = 'pending_approval'
        `, [approvalId, coordinatorId]);
        
        if (approvalCheck.length === 0) {
            return res.status(404).json({ error: 'Service approval not found or already processed' });
        }
        
        const serviceRequestId = approvalCheck[0].service_request_id;
        const technicianId = approvalCheck[0].assigned_technician_id;
        
        // Start transaction
        await db.query('START TRANSACTION');
        
        try {
            // Update service approval status
            await db.query(`
                UPDATE service_approvals 
                SET status = 'rejected', 
                    reviewed_at = NOW(),
                    coordinator_notes = ?
                WHERE id = ?
            `, [notes, approvalId]);
            
            // Update service request status back to in_progress
            await db.query(`
                UPDATE service_requests 
                SET status = 'in_progress', updated_at = NOW()
                WHERE id = ?
            `, [serviceRequestId]);
            
            // Remove parts used records (they can be re-added when resubmitted)
            await db.query(`
                DELETE FROM service_parts_used 
                WHERE service_request_id = ?
            `, [serviceRequestId]);
            
            // Add history record
            await db.query(`
                INSERT INTO service_request_history 
                (request_id, previous_status, new_status, changed_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [serviceRequestId, 'pending_approval', 'in_progress', coordinatorId, `Service completion rejected by coordinator. Reason: ${notes}`]);
            
            // Get coordinator and institution information for notification
            const [coordinatorInfo] = await db.query(`
                SELECT u.first_name, u.last_name
                FROM users u
                WHERE u.id = ?
            `, [coordinatorId]);
            
            const [institutionInfo] = await db.query(`
                SELECT i.name as institution_name
                FROM service_requests sr
                JOIN institutions i ON sr.institution_id = i.institution_id
                WHERE sr.id = ?
            `, [serviceRequestId]);
            
            const coordinatorName = coordinatorInfo.length > 0 
                ? `${coordinatorInfo[0].first_name} ${coordinatorInfo[0].last_name}`
                : 'coordinator';
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
                coordinatorId,
                'service_revision_requested',
                'service_request',
                serviceRequestId,
                'Service Completion Rejected - Revision Required',
                `Your service completion for request #${serviceRequestId} was rejected by ${coordinatorName} at ${institutionName}. Please review and resubmit. Reason: ${notes}`,
                'high'
            ]);
            
            // Commit transaction
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Service completion rejected',
                service_request_id: serviceRequestId
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