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
                ii.location,
                sr.status,
                sr.priority,
                sr.created_at,
                sr.started_at,
                sr.completed_at,
                sr.resolution_notes,
                sr.completion_photo_url,
                sr.printer_id,
                sr.walk_in_customer_name,
                sr.printer_brand as walk_in_printer_brand,
                sr.is_walk_in,
                sa.approved_by,
                i.name as institution_name,
                i.type as institution_type,
                institution_user.first_name as institution_user_first_name,
                institution_user.last_name as institution_user_last_name,
                institution_user.role as institution_user_role,
                ii.name as printer_name,
                ii.brand as printer_brand,
                ii.model as printer_model,
                ii.serial_number as printer_serial_number,
                ii.department as printer_department,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details,
                approver.first_name as approver_first_name,
                approver.last_name as approver_last_name,
                approver.role as approver_role
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users institution_user ON sr.requested_by = institution_user.id
            LEFT JOIN printers ii ON sr.printer_id = ii.id
            LEFT JOIN service_approvals sa ON sr.id = sa.service_request_id
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE sr.technician_id = ?
            ORDER BY sr.completed_at DESC
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
                LEFT JOIN printer_items pp ON spu.part_id = pp.id
                LEFT JOIN users u ON spu.used_by = u.id
                WHERE spu.service_request_id = ?
                ORDER BY spu.used_at ASC
            `, [serviceHistory[i].id]);
            
            serviceHistory[i].history = history;
            serviceHistory[i].parts_used = partsUsed;
            
            // Debug log to check parts data
            if (partsUsed.length > 0) {
                console.log(`Service Request #${serviceHistory[i].id} has ${partsUsed.length} parts:`, partsUsed);
            }
        }
        
        console.log(`Returning ${serviceHistory.length} service requests for technician ${technicianId}`);
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
                institution_user.first_name as institution_user_first_name,
                institution_user.last_name as institution_user_last_name,
                institution_user.email as institution_user_email,
                institution_user.role as institution_user_role,
                ii.name as printer_name,
                ii.brand as printer_brand,
                ii.model as printer_model,
                ii.serial_number as printer_serial_number,
                ii.department as printer_department,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users institution_user ON sr.requested_by = institution_user.id
            LEFT JOIN printers ii ON sr.printer_id = ii.id
            WHERE sr.id = ? AND sr.technician_id = ?
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
            WHERE technician_id = ?
        `, [technicianId]);
        
        // Get recent activity (last 30 days)
        const [recentActivity] = await db.execute(`
            SELECT COUNT(*) as recent_completed
            FROM service_requests 
            WHERE technician_id = ? 
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



