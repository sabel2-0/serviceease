const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

/**
 * Voluntary Services API
 * Allows technicians to submit voluntary services for printers
 * Requires dual approval from coordinator and requester
 */

// ==================== TECHNICIAN ENDPOINTS ====================

/**
 * Get technician's assigned public schools with printer stats
 * GET /api/voluntary-services/assigned-schools
 */
router.get('/assigned-schools', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const query = `
            SELECT 
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                i.address,
                i.status,
                COUNT(DISTINCT upa.inventory_item_id) as total_printers,
                COUNT(CASE 
                    WHEN vs.status = 'completed' 
                    AND vs.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    THEN vs.id 
                END) as serviced_count,
                COUNT(CASE 
                    WHEN vs.status IN ('pending_coordinator', 'pending_requester')
                    THEN vs.id 
                END) as pending_count
            FROM technician_assignments ta
            INNER JOIN institutions i ON ta.institution_id = i.institution_id
            LEFT JOIN user_printer_assignments upa ON upa.institution_id = i.institution_id
            LEFT JOIN voluntary_services vs ON vs.printer_id = upa.inventory_item_id 
                AND vs.technician_id = ?
            WHERE ta.technician_id = ?
                AND i.type = 'public_school'
                AND i.status = 'active'
            GROUP BY i.institution_id, i.name, i.type, i.address, i.status
            ORDER BY i.name ASC
        `;
        
        const [schools] = await db.query(query, [technicianId, technicianId]);
        
        res.json(schools);
    } catch (error) {
        console.error('Error fetching assigned schools:', error);
        res.status(500).json({ error: 'Failed to fetch assigned schools' });
    }
});

/**
 * Get printers in a specific school with service history
 * GET /api/voluntary-services/school-printers/:institutionId
 */
router.get('/school-printers/:institutionId', auth, async (req, res) => {
    try {
        const { institutionId } = req.params;
        const technicianId = req.user.id;
        
        // Verify technician is assigned to this institution
        const [assignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE technician_id = ? AND institution_id = ?',
            [technicianId, institutionId]
        );
        
        if (assignment.length === 0) {
            return res.status(403).json({ error: 'Not assigned to this institution' });
        }
        
        const query = `
            SELECT 
                inv.id,
                inv.name,
                inv.brand,
                inv.model,
                inv.serial_number,
                inv.location,
                inv.status,
                upa.user_id as requester_id,
                u.first_name as requester_first_name,
                u.last_name as requester_last_name,
                u.email as requester_email,
                vs_latest.last_service_date,
                vs_latest.last_service_status,
                COALESCE(vs_count.service_count, 0) as service_count
            FROM user_printer_assignments upa
            INNER JOIN inventory_items inv ON inv.id = upa.inventory_item_id
            INNER JOIN users u ON u.id = upa.user_id
            LEFT JOIN (
                SELECT printer_id, MAX(created_at) as last_service_date, 
                       (SELECT status FROM voluntary_services WHERE printer_id = vs.printer_id ORDER BY created_at DESC LIMIT 1) as last_service_status
                FROM voluntary_services vs
                WHERE technician_id = ?
                GROUP BY printer_id
            ) vs_latest ON vs_latest.printer_id = inv.id
            LEFT JOIN (
                SELECT printer_id, COUNT(*) as service_count
                FROM voluntary_services
                WHERE technician_id = ?
                GROUP BY printer_id
            ) vs_count ON vs_count.printer_id = inv.id
            WHERE upa.institution_id = ?
                AND inv.category = 'printer'
                AND inv.status IN ('available', 'assigned')
            ORDER BY inv.name ASC
        `;
        
        const [printers] = await db.query(query, [technicianId, technicianId, institutionId]);
        
        res.json(printers);
    } catch (error) {
        console.error('Error fetching school printers:', error);
        res.status(500).json({ error: 'Failed to fetch school printers' });
    }
});

/**
 * Submit voluntary service
 * POST /api/voluntary-services
 */
router.post('/', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const {
            printer_id,
            institution_id,
            service_description,
            parts_used
        } = req.body;
        
        console.log('📝 Voluntary service submission:', {
            technicianId,
            printer_id,
            institution_id,
            service_description: service_description?.substring(0, 50),
            parts_count: parts_used?.length || 0
        });
        
        // Validate required fields
        if (!printer_id || !institution_id || !service_description) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'Printer ID, institution ID, and service description are required' 
            });
        }
        
        // Verify technician is assigned to this institution
        const [assignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE technician_id = ? AND institution_id = ?',
            [technicianId, institution_id]
        );
        
        console.log('🔍 Assignment check:', assignment.length > 0 ? 'PASSED' : 'FAILED');
        
        if (assignment.length === 0) {
            return res.status(403).json({ error: 'Not assigned to this institution' });
        }
        
        // Verify printer belongs to this institution
        const [printer] = await db.query(
            `SELECT inv.id, inv.name, inv.brand, inv.model, upa.user_id as requester_id
             FROM inventory_items inv
             INNER JOIN user_printer_assignments upa ON upa.inventory_item_id = inv.id
             WHERE inv.id = ? AND upa.institution_id = ?`,
            [printer_id, institution_id]
        );
        
        console.log('🖨️  Printer check:', printer.length > 0 ? 'FOUND' : 'NOT FOUND');
        
        if (printer.length === 0) {
            return res.status(400).json({ error: 'Printer not found in this institution' });
        }
        
        const requesterId = printer[0].requester_id;
        console.log('👤 Requester ID:', requesterId);
        
        // Insert voluntary service
        const insertQuery = `
            INSERT INTO voluntary_services (
                technician_id,
                printer_id,
                institution_id,
                requester_id,
                service_description,
                parts_used,
                status,
                coordinator_approval_status,
                requester_approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending_coordinator', 'pending', 'pending')
        `;
        
        console.log('💾 Inserting voluntary service...');
        const [result] = await db.query(insertQuery, [
            technicianId,
            printer_id,
            institution_id,
            requesterId,
            service_description,
            parts_used ? JSON.stringify(parts_used) : null
        ]);
        
        console.log('✅ Service inserted, ID:', result.insertId);
        
        // Parts will be deducted only upon approval (not during submission)
        
        // Create notifications for coordinator and requester
        const notificationQuery = `
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                reference_id,
                created_at
            )
            SELECT 
                i.user_id,
                'voluntary_service',
                'New Voluntary Service Submitted',
                CONCAT('A technician has submitted a voluntary service for ', ?, ' at ', i.name),
                ?,
                NOW()
            FROM institutions i
            WHERE i.institution_id = ? AND i.user_id IS NOT NULL
        `;
        
        await db.query(notificationQuery, [printer[0].name, result.insertId, institution_id]);
        
        // Also notify the requester
        if (requesterId) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, reference_id, created_at)
                 VALUES (?, 'voluntary_service', 'Voluntary Service Pending', 
                         'A technician has performed service on your printer. Awaiting coordinator approval.', ?, NOW())`,
                [requesterId, result.insertId]
            );
        }
        
        res.status(201).json({
            message: 'Voluntary service submitted successfully',
            service_id: result.insertId
        });
    } catch (error) {
        console.error('❌ Error submitting voluntary service:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Failed to submit voluntary service',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get technician's voluntary service submissions
 * GET /api/voluntary-services/my-submissions
 */
router.get('/my-submissions', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { status } = req.query;
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                i.type as institution_type,
                CONCAT(u_req.first_name, ' ', u_req.last_name) as requester_name,
                u_req.first_name as requester_first_name,
                u_req.last_name as requester_last_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as coordinator_name,
                u_coord.first_name as coordinator_first_name,
                u_coord.last_name as coordinator_last_name
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id = i.institution_id
            LEFT JOIN users u_req ON u_req.id = vs.requester_id
            LEFT JOIN users u_coord ON u_coord.id = i.user_id
            WHERE vs.technician_id = ?
            ${status ? 'AND vs.status = ?' : ''}
            ORDER BY vs.created_at DESC
        `;
        
        const params = status ? [technicianId, status] : [technicianId];
        
        const [services] = await db.query(query, params);
        
        // Parse JSON fields
        services.forEach(service => {
            if (service.parts_used) {
                service.parts_used = JSON.parse(service.parts_used);
            }
        });
        
        res.json(services);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// ==================== COORDINATOR ENDPOINTS ====================

/**
 * Get pending voluntary services for coordinator review
 * GET /api/voluntary-services/coordinator/pending
 */
router.get('/coordinator/pending', auth, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        console.log('📋 Fetching voluntary services for coordinator:', coordinatorId);
        
        // Get coordinator's institutions using the correct architecture:
        // institutions.user_id points to the coordinator who owns that institution
        const [institutions] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        
        console.log('🏢 Coordinator institutions:', institutions);
        
        if (institutions.length === 0) {
            console.log('⚠️ No institutions found for coordinator');
            return res.json({ services: [] });
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        console.log('🔍 Looking for services in institutions:', institutionIds);
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as coordinator_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email,
                CONCAT(u_req.first_name, ' ', u_req.last_name) as requester_name
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN users u_req ON u_req.id = vs.requester_id
            WHERE vs.institution_id IN (?)
            AND vs.coordinator_approval_status = 'pending'
            AND vs.status != 'completed'
            AND vs.status != 'rejected'
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('✅ Found', services.length, 'voluntary services');
        
        // Parse JSON fields
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            }
        });
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching pending services for coordinator:', error);
        res.status(500).json({ error: 'Failed to fetch pending services' });
    }
});

/**
 * Get coordinator's voluntary service history (completed/rejected)
 * GET /api/voluntary-services/coordinator/history
 */
router.get('/coordinator/history', auth, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        console.log('📋 Fetching voluntary services history for coordinator:', coordinatorId);
        
        // Get coordinator's institutions
        const [institutions] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        
        if (institutions.length === 0) {
            return res.json({ services: [] });
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as coordinator_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email,
                CONCAT(u_req.first_name, ' ', u_req.last_name) as requester_name
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN users u_req ON u_req.id = vs.requester_id
            WHERE vs.institution_id IN (?)
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('✅ Found', services.length, 'voluntary services in history');
        
        // Parse JSON fields
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            }
        });
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching history for coordinator:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Approve voluntary service (Coordinator)
 * PATCH /api/voluntary-services/coordinator/:id/approve
 */
router.patch('/coordinator/:id/approve', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const coordinatorId = req.user.id;
        const { notes } = req.body;
        
        console.log('✅ Coordinator', coordinatorId, 'approving service', serviceId);
        
        // Verify coordinator owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as coordinator_id
             FROM voluntary_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].coordinator_id !== coordinatorId) {
            return res.status(403).json({ error: 'You do not have permission to approve this service' });
        }
        
        if (service[0].coordinator_approval_status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed by coordinator' });
        }
        
        if (service[0].status === 'completed') {
            return res.status(400).json({ error: 'Service has already been completed' });
        }
        
        // Check if requester already approved - if so, this completes the service
        const alreadyApproved = service[0].requester_approval_status === 'approved';
        const newStatus = alreadyApproved ? 'completed' : service[0].status;
        
        console.log(`📝 Requester already approved: ${alreadyApproved}, new status: ${newStatus}`);
        
        // Update coordinator approval status (and complete if requester already approved)
        await db.query(
            `UPDATE voluntary_services 
             SET coordinator_approval_status = 'approved',
                 coordinator_notes = ?,
                 coordinator_reviewed_at = NOW(),
                 coordinator_reviewed_by = ?,
                 status = ?,
                 completed_at = ${alreadyApproved ? 'NOW()' : 'completed_at'}
             WHERE id = ?`,
            [notes || null, coordinatorId, newStatus, serviceId]
        );
        
        // Only deduct parts if this approval completes the service (requester already approved OR single approval mode)
        if (alreadyApproved && service[0].parts_used) {
            const parts_used = JSON.parse(service[0].parts_used);
            console.log('📦 Deducting parts from inventory after approval...');
            
            for (const part of parts_used) {
                try {
                    // Clean the part name
                    let cleanPartName = part.name.replace(/^[✓⚠✗]\s*/, '').trim();
                    cleanPartName = cleanPartName.replace(/\s*\(Stock:\s*\d+\)\s*$/, '').trim();
                    
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_parts pp ON ti.part_id = pp.id
                         WHERE ti.technician_id = ? 
                         AND pp.name = ? 
                         AND pp.brand = ?
                         LIMIT 1`,
                        [service[0].technician_id, cleanPartName, part.brand]
                    );
                    
                    if (inventoryItem.length > 0) {
                        const currentQty = inventoryItem[0].quantity;
                        const deductQty = parseInt(part.qty) || 0;
                        
                        if (currentQty >= deductQty) {
                            const newQty = currentQty - deductQty;
                            await db.query(
                                'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                [newQty, inventoryItem[0].id]
                            );
                            console.log(`✅ Deducted ${deductQty} ${cleanPartName}, new qty: ${newQty}`);
                        }
                    }
                } catch (partError) {
                    console.error(`❌ Error deducting part:`, partError);
                }
            }
        }
        
        // Notify technician that service was approved
        const notificationMessage = alreadyApproved 
            ? 'Your voluntary service has been approved by the coordinator and is now completed'
            : 'Your voluntary service has been approved by the coordinator';
        
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Voluntary Service Approved', ?, ?)`,
            [service[0].technician_id, notificationMessage, serviceId]
        );
        
        res.json({ 
            message: alreadyApproved ? 'Service approved and completed successfully' : 'Service approved successfully',
            completed: alreadyApproved
        });
    } catch (error) {
        console.error('Error approving service:', error);
        res.status(500).json({ error: 'Failed to approve service' });
    }
});

/**
 * Reject voluntary service (Coordinator)
 * PATCH /api/voluntary-services/coordinator/:id/reject
 */
router.patch('/coordinator/:id/reject', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const coordinatorId = req.user.id;
        const { reason, notes } = req.body;
        
        const rejectionReason = reason || notes;
        
        if (!rejectionReason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        console.log('❌ Coordinator', coordinatorId, 'rejecting service', serviceId);
        
        // Verify coordinator owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as coordinator_id
             FROM voluntary_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].coordinator_id !== coordinatorId) {
            return res.status(403).json({ error: 'You do not have permission to reject this service' });
        }
        
        if (service[0].coordinator_approval_status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed' });
        }
        
        // Update service
        await db.query(
            `UPDATE voluntary_services 
             SET coordinator_approval_status = 'rejected',
                 coordinator_notes = ?,
                 status = 'rejected'
             WHERE id = ?`,
            [rejectionReason, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Service Rejected', 
                     'Your voluntary service submission has been rejected by the coordinator', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service rejected' });
    } catch (error) {
        console.error('Error rejecting service:', error);
        res.status(500).json({ error: 'Failed to reject service' });
    }
});

/**
 * Approve voluntary service (Requester)
 * PATCH /api/voluntary-services/requester/:id/approve
 */
router.patch('/requester/:id/approve', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requesterId = req.user.id;
        const { notes } = req.body;
        
        // Verify requester owns this printer
        const [service] = await db.query(
            `SELECT vs.*
             FROM voluntary_services vs
             WHERE vs.id = ? AND vs.requester_id = ?`,
            [serviceId, requesterId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }
        
        if (service[0].requester_approval_status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed by requester' });
        }
        
        if (service[0].status === 'completed') {
            return res.status(400).json({ error: 'Service has already been completed' });
        }
        
        // Check if coordinator already approved - if so, this completes the service
        const alreadyApproved = service[0].coordinator_approval_status === 'approved';
        const newStatus = alreadyApproved ? 'completed' : service[0].status;
        
        console.log(`📝 Coordinator already approved: ${alreadyApproved}, new status: ${newStatus}`);
        
        // Update requester approval status (and complete if coordinator already approved)
        await db.query(
            `UPDATE voluntary_services 
             SET requester_approval_status = 'approved',
                 requester_notes = ?,
                 status = ?,
                 completed_at = ${alreadyApproved ? 'NOW()' : 'completed_at'}
             WHERE id = ?`,
            [notes || null, newStatus, serviceId]
        );
        
        // Only deduct parts if this approval completes the service (coordinator already approved OR single approval mode)
        if (alreadyApproved && service[0].parts_used) {
            const parts_used = JSON.parse(service[0].parts_used);
            console.log('📦 Deducting parts from inventory after requester approval...');
            
            for (const part of parts_used) {
                try {
                    // Clean the part name
                    let cleanPartName = part.name.replace(/^[✓⚠✗]\s*/, '').trim();
                    cleanPartName = cleanPartName.replace(/\s*\(Stock:\s*\d+\)\s*$/, '').trim();
                    
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_parts pp ON ti.part_id = pp.id
                         WHERE ti.technician_id = ? 
                         AND pp.name = ? 
                         AND pp.brand = ?
                         LIMIT 1`,
                        [service[0].technician_id, cleanPartName, part.brand]
                    );
                    
                    if (inventoryItem.length > 0) {
                        const currentQty = inventoryItem[0].quantity;
                        const deductQty = parseInt(part.qty) || 0;
                        
                        if (currentQty >= deductQty) {
                            const newQty = currentQty - deductQty;
                            await db.query(
                                'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                [newQty, inventoryItem[0].id]
                            );
                            console.log(`✅ Deducted ${deductQty} ${cleanPartName}, new qty: ${newQty}`);
                        }
                    }
                } catch (partError) {
                    console.error(`❌ Error deducting part:`, partError);
                }
            }
        }
        
        // Notify technician
        const notificationMessage = alreadyApproved
            ? 'Your voluntary service has been approved by the requester and is now completed'
            : 'Your voluntary service has been approved by the requester';
        
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Service Approved', ?, ?)`,
            [service[0].technician_id, notificationMessage, serviceId]
        );
        
        res.json({ 
            message: alreadyApproved ? 'Service approved and completed successfully' : 'Service approved successfully',
            completed: alreadyApproved
        });
    } catch (error) {
        console.error('Error approving service:', error);
        res.status(500).json({ error: 'Failed to approve service' });
    }
});

/**
 * Reject voluntary service (Requester)
 * PATCH /api/voluntary-services/requester/:id/reject
 */
router.patch('/requester/:id/reject', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requesterId = req.user.id;
        const { notes } = req.body;
        
        if (!notes) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        // Verify requester owns this printer
        const [service] = await db.query(
            `SELECT vs.*
             FROM voluntary_services vs
             WHERE vs.id = ? AND vs.requester_id = ?`,
            [serviceId, requesterId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }
        
        // Update service
        await db.query(
            `UPDATE voluntary_services 
             SET requester_approval_status = 'rejected',
                 requester_notes = ?,
                 status = 'rejected'
             WHERE id = ?`,
            [notes, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Service Rejected', 
                     'Your voluntary service has been rejected by the requester', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service rejected' });
    } catch (error) {
        console.error('Error rejecting service:', error);
        res.status(500).json({ error: 'Failed to reject service' });
    }
});

/**
 * Get technician's voluntary service history
 * GET /api/voluntary-services/history
 */
router.get('/history', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const query = `
            SELECT 
                vs.id,
                vs.service_description as description,
                vs.parts_used,
                vs.status,
                vs.created_at,
                vs.coordinator_approval_status,
                vs.requester_approval_status,
                vs.coordinator_notes,
                vs.requester_notes,
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                inv.name as printer_name,
                inv.brand as printer_brand,
                inv.model as printer_model,
                inv.serial_number as printer_serial_number,
                inv.location,
                CONCAT('VS-', vs.id) as request_number,
                CONCAT(requester.first_name, ' ', requester.last_name) as requester_name,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                CONCAT(coordinator.first_name, ' ', coordinator.last_name) as coordinator_name,
                coordinator.first_name as coordinator_first_name,
                coordinator.last_name as coordinator_last_name
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users requester ON vs.requester_id = requester.id
            LEFT JOIN users coordinator ON i.user_id = coordinator.id
            WHERE vs.technician_id = ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [technicianId]);
        
        // Parse parts_used JSON for each service
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            } else {
                service.parts_used = [];
            }
        });
        
        res.json(services);
    } catch (error) {
        console.error('Error fetching voluntary service history:', error);
        res.status(500).json({ error: 'Failed to fetch voluntary service history' });
    }
});

// ==================== REQUESTER ENDPOINTS ====================

/**
 * Get voluntary services for requester (their printers)
 * GET /api/voluntary-services/requester/pending
 */
router.get('/requester/pending', auth, async (req, res) => {
    try {
        const requesterId = req.user.id;
        
        console.log('📋 Fetching voluntary services for requester:', requesterId);
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as coordinator_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN user_printer_assignments upa ON upa.inventory_item_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.requester_approval_status = 'pending'
            AND vs.status != 'completed'
            AND vs.status != 'rejected'
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requesterId, requesterId]);
        
        console.log('✅ Found', services.length, 'voluntary services for requester');
        
        // Parse JSON fields
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            }
        });
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching services for requester:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

/**
 * Get requester's voluntary service history
 * GET /api/voluntary-services/requester/history
 */
router.get('/requester/history', auth, async (req, res) => {
    try {
        const requesterId = req.user.id;
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as coordinator_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM voluntary_services vs
            INNER JOIN inventory_items inv ON vs.printer_id = inv.id
            INNER JOIN user_printer_assignments upa ON upa.inventory_item_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requesterId, requesterId]);
        
        // Parse JSON fields
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            }
        });
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching history for requester:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Approve voluntary service (Requester)
 * PATCH /api/voluntary-services/requester/:id/approve
 */
router.patch('/requester/:id/approve', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requesterId = req.user.id;
        const { notes } = req.body;
        
        console.log('✅ Requester', requesterId, 'approving service', serviceId);
        
        // Verify requester owns the printer
        const [service] = await db.query(
            `SELECT vs.*, upa.user_id as printer_owner_id
             FROM voluntary_services vs
             INNER JOIN user_printer_assignments upa ON upa.inventory_item_id = vs.printer_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].printer_owner_id !== requesterId) {
            return res.status(403).json({ error: 'You do not have permission to approve this service' });
        }
        
        if (service[0].requester_approval_status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed by you' });
        }
        
        // Mark as completed when requester approves (either coordinator or requester approval completes it)
        await db.query(
            `UPDATE voluntary_services 
             SET requester_approval_status = 'approved',
                 requester_notes = ?,
                 requester_reviewed_at = NOW(),
                 requester_reviewed_by = ?,
                 status = 'completed',
                 completed_at = NOW()
             WHERE id = ?`,
            [notes || null, requesterId, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Voluntary Service Approved', 
                     'Your voluntary service has been approved by the requester', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service approved successfully' });
    } catch (error) {
        console.error('Error approving service:', error);
        res.status(500).json({ error: 'Failed to approve service' });
    }
});

/**
 * Reject voluntary service (Requester)
 * PATCH /api/voluntary-services/requester/:id/reject
 */
router.patch('/requester/:id/reject', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requesterId = req.user.id;
        const { reason, notes } = req.body;
        
        const rejectionReason = reason || notes;
        
        if (!rejectionReason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        console.log('❌ Requester', requesterId, 'rejecting service', serviceId);
        
        // Verify requester owns the printer
        const [service] = await db.query(
            `SELECT vs.*, upa.user_id as printer_owner_id
             FROM voluntary_services vs
             INNER JOIN user_printer_assignments upa ON upa.inventory_item_id = vs.printer_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].printer_owner_id !== requesterId) {
            return res.status(403).json({ error: 'You do not have permission to reject this service' });
        }
        
        if (service[0].requester_approval_status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed by you' });
        }
        
        // Update service
        await db.query(
            `UPDATE voluntary_services 
             SET requester_approval_status = 'rejected',
                 requester_notes = ?,
                 requester_reviewed_at = NOW(),
                 requester_reviewed_by = ?,
                 status = 'rejected'
             WHERE id = ?`,
            [rejectionReason, requesterId, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'voluntary_service', 'Service Rejected', 
                     'Your voluntary service has been rejected by the requester', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service rejected' });
    } catch (error) {
        console.error('Error rejecting service:', error);
        res.status(500).json({ error: 'Failed to reject service' });
    }
});

module.exports = router;
