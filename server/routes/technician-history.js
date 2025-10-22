const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateTechnician } = require('../middleware/auth');

// Get technician's service history
router.get('/service-history', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        // Get service requests assigned to this technician with history
        const [serviceHistory] = await db.execute(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.description,
                sr.location,
                sr.status,
                sr.priority,
                sr.created_at,
                sr.started_at,
                sr.completed_at,
                sr.resolution_notes,
                i.name as institution_name,
                i.type as institution_type,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.role as requester_role
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
            WHERE sr.assigned_technician_id = ?
            ORDER BY sr.created_at DESC
        `, [technicianId]);
        
        // For each service request, get its history and parts used
        for (let i = 0; i < serviceHistory.length; i++) {
            // Get status change history
            const [history] = await db.execute(`
                SELECT 
                    srh.id,
                    srh.previous_status,
                    srh.new_status,
                    srh.notes,
                    srh.created_at,
                    u.first_name,
                    u.last_name,
                    u.role
                FROM service_request_history srh
                LEFT JOIN users u ON srh.changed_by = u.id
                WHERE srh.request_id = ?
                ORDER BY srh.created_at ASC
            `, [serviceHistory[i].id]);
            
            // Get parts used for this service request
            const [partsUsed] = await db.execute(`
                SELECT 
                    spu.id,
                    spu.quantity_used,
                    spu.notes as part_notes,
                    spu.used_at,
                    pp.name as part_name,
                    pp.brand,
                    pp.unit,
                    pp.category,
                    u.first_name as used_by_first_name,
                    u.last_name as used_by_last_name
                FROM service_parts_used spu
                LEFT JOIN printer_parts pp ON spu.part_id = pp.id
                LEFT JOIN users u ON spu.used_by = u.id
                WHERE spu.service_request_id = ?
                ORDER BY spu.used_at ASC
            `, [serviceHistory[i].id]);
            
            serviceHistory[i].history = history;
            serviceHistory[i].parts_used = partsUsed;
        }
        
        res.json(serviceHistory);
        
    } catch (error) {
        console.error('Error fetching technician service history:', error);
        res.status(500).json({ error: 'Failed to fetch service history' });
    }
});

// Get specific service request details with full history
router.get('/service-history/:requestId', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const requestId = req.params.requestId;
        
        // Get service request details
        const [serviceRequests] = await db.execute(`
            SELECT 
                sr.*,
                i.name as institution_name,
                i.type as institution_type,
                i.address as institution_address,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.email as requester_email,
                requester.role as requester_role
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
            WHERE sr.id = ? AND sr.assigned_technician_id = ?
        `, [requestId, technicianId]);
        
        if (serviceRequests.length === 0) {
            return res.status(404).json({ error: 'Service request not found or not assigned to you' });
        }
        
        const serviceRequest = serviceRequests[0];
        
        // Get history for this request
        const [history] = await db.execute(`
            SELECT 
                srh.id,
                srh.previous_status,
                srh.new_status,
                srh.notes,
                srh.created_at,
                u.first_name,
                u.last_name,
                u.role,
                u.email
            FROM service_request_history srh
            LEFT JOIN users u ON srh.changed_by = u.id
            WHERE srh.request_id = ?
            ORDER BY srh.created_at ASC
        `, [requestId]);
        
        serviceRequest.history = history;
        
        res.json(serviceRequest);
        
    } catch (error) {
        console.error('Error fetching service request details:', error);
        res.status(500).json({ error: 'Failed to fetch service request details' });
    }
});

// Get summary stats for technician dashboard
router.get('/stats', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        // Get counts by status
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_approval,
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned
            FROM service_requests 
            WHERE assigned_technician_id = ?
        `, [technicianId]);
        
        // Get recent activity (last 30 days)
        const [recentActivity] = await db.execute(`
            SELECT COUNT(*) as recent_completed
            FROM service_requests 
            WHERE assigned_technician_id = ? 
            AND status = 'completed' 
            AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [technicianId]);
        
        res.json({
            ...stats[0],
            recent_completed: recentActivity[0].recent_completed
        });
        
    } catch (error) {
        console.error('Error fetching technician stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;