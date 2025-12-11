const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

/**
 * Maintenance Services API
 * Allows technicians to submit scheduled maintenance services for printers
 * Requires dual approval from institution_admin and institution_user
 */

// ==================== TECHNICIAN ENDPOINTS ====================

/**
 * Get technician's assigned public schools with printer stats
 * GET /api/maintenance-services/assigned-schools
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
                COALESCE(printer_counts.total_printers, 0) as total_printers,
                COALESCE(printer_counts.serviced_count, 0) as serviced_count,
                COALESCE(printer_counts.pending_count, 0) as pending_count,
                (COALESCE(printer_counts.total_printers, 0) - COALESCE(printer_counts.serviced_count, 0) - COALESCE(printer_counts.pending_count, 0)) as remaining_count
            FROM technician_assignments ta
            INNER JOIN institutions i ON ta.institution_id = i.institution_id
            LEFT JOIN (
                SELECT 
                    cpa.institution_id,
                    COUNT(DISTINCT cpa.printer_id) as total_printers,
                    COUNT(DISTINCT CASE 
                        WHEN latest_service.latest_status = 'completed'
                        THEN cpa.printer_id
                    END) as serviced_count,
                    COUNT(DISTINCT CASE 
                        WHEN latest_service.latest_status IN ('pending_approval', 'pending_institution_admin', 'pending_institution_user')
                        THEN cpa.printer_id
                    END) as pending_count
                FROM institution_printer_assignments cpa
                LEFT JOIN (
                    SELECT 
                        printer_id,
                        latest_status
                    FROM (
                        -- Get latest Maintenance Service status
                        SELECT 
                            printer_id,
                            CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as latest_status,
                            created_at as latest_date,
                            'Maintenance' as service_type
                        FROM maintenance_services 
                        WHERE technician_id = ?
                        
                        UNION ALL
                        
                        -- Get latest regular service request status
                        SELECT 
                            printer_id as printer_id,
                            CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as latest_status,
                            created_at as latest_date,
                            'regular' as service_type
                        FROM service_requests
                        WHERE technician_id = ?
                            AND printer_id IS NOT NULL
                    ) combined_services
                    WHERE (printer_id, latest_date) IN (
                        SELECT printer_id, MAX(latest_date)
                        FROM (
                            SELECT printer_id, created_at as latest_date FROM maintenance_services WHERE technician_id = ?
                            UNION ALL
                            SELECT printer_id as printer_id, created_at as latest_date FROM service_requests WHERE technician_id = ? AND printer_id IS NOT NULL
                        ) all_dates
                        GROUP BY printer_id
                    )
                ) latest_service ON latest_service.printer_id = cpa.printer_id
                GROUP BY cpa.institution_id
            ) printer_counts ON printer_counts.institution_id = i.institution_id
            WHERE ta.technician_id = ?
                AND i.type = 'public_school'
                AND i.status = 'active'
            GROUP BY i.institution_id, i.name, i.type, i.address, i.status, 
                     printer_counts.total_printers, printer_counts.serviced_count, 
                     printer_counts.pending_count
            ORDER BY i.name ASC
        `;
        
        const [schools] = await db.query(query, [technicianId, technicianId, technicianId, technicianId, technicianId]);
        
        res.json(schools);
    } catch (error) {
        console.error('Error fetching assigned schools:', error);
        res.status(500).json({ error: 'Failed to fetch assigned schools' });
    }
});

/**
 * Get printers in a specific school with service history
 * GET /api/Maintenance-services/school-printers/:institutionId
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
                cpa.assigned_at,
                cpa.status as assignment_status,
                latest_service.last_service_date,
                latest_service.last_service_status,
                latest_service.service_type,
                COALESCE(vs_count.Maintenance_count, 0) as Maintenance_count,
                COALESCE(sr_count.regular_count, 0) as regular_count,
                (COALESCE(vs_count.Maintenance_count, 0) + COALESCE(sr_count.regular_count, 0)) as total_service_count
            FROM institution_printer_assignments cpa
            INNER JOIN printers inv ON inv.id = cpa.printer_id
            LEFT JOIN (
                SELECT 
                    printer_id,
                    latest_date as last_service_date,
                    latest_status as last_service_status,
                    service_type
                FROM (
                    -- Get latest Maintenance Service
                    SELECT 
                        printer_id,
                        CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as latest_status,
                        created_at as latest_date,
                        'Maintenance' as service_type
                    FROM maintenance_services 
                    WHERE technician_id = ?
                    
                    UNION ALL
                    
                    -- Get latest regular service request
                    SELECT 
                        printer_id as printer_id,
                        CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as latest_status,
                        created_at as latest_date,
                        'regular' as service_type
                    FROM service_requests
                    WHERE technician_id = ?
                        AND printer_id IS NOT NULL
                ) combined
                WHERE (printer_id, latest_date) IN (
                    SELECT printer_id, MAX(latest_date)
                    FROM (
                        SELECT printer_id, created_at as latest_date FROM maintenance_services WHERE technician_id = ?
                        UNION ALL
                        SELECT printer_id as printer_id, created_at as latest_date FROM service_requests WHERE technician_id = ? AND printer_id IS NOT NULL
                    ) all_dates
                    GROUP BY printer_id
                )
            ) latest_service ON latest_service.printer_id = inv.id
            LEFT JOIN (
                SELECT printer_id, COUNT(*) as Maintenance_count
                FROM maintenance_services
                WHERE technician_id = ?
                GROUP BY printer_id
            ) vs_count ON vs_count.printer_id = inv.id
            LEFT JOIN (
                SELECT printer_id as printer_id, COUNT(*) as regular_count
                FROM service_requests
                WHERE technician_id = ?
                    AND printer_id IS NOT NULL
                GROUP BY printer_id
            ) sr_count ON sr_count.printer_id = inv.id
            WHERE cpa.institution_id = ?
                AND inv.category = 'printer'
                AND inv.status IN ('available', 'assigned')
            ORDER BY inv.name ASC
        `;
        
        const [printers] = await db.query(query, [technicianId, technicianId, technicianId, technicianId, technicianId, technicianId, institutionId]);
        
        res.json(printers);
    } catch (error) {
        console.error('Error fetching school printers:', error);
        res.status(500).json({ error: 'Failed to fetch school printers' });
    }
});

/**
 * Submit Maintenance Service
 * POST /api/Maintenance-services
 */
router.post('/', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const {
            printer_id,
            institution_id,
            service_description,
            parts_used,
            completion_photo
        } = req.body;
        
        console.log('ðŸ“ Maintenance service submission:', {
            technicianId,
            printer_id,
            institution_id,
            service_description: service_description?.substring(0, 50),
            parts_count: parts_used?.length || 0
        });
        
        // Validate required fields
        if (!printer_id || !institution_id || !service_description) {
            console.log('âŒ Missing required fields');
            return res.status(400).json({ 
                error: 'Printer ID, institution ID, and service description are required' 
            });
        }
        
        // Verify technician is assigned to this institution
        const [assignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE technician_id = ? AND institution_id = ?',
            [technicianId, institution_id]
        );
        
        console.log('ðŸ” Assignment check:', assignment.length > 0 ? 'PASSED' : 'FAILED');
        
        if (assignment.length === 0) {
            return res.status(403).json({ error: 'Not assigned to this institution' });
        }
        
        // Verify printer belongs to this institution
        const [printer] = await db.query(
            `SELECT inv.id, inv.name, inv.brand, inv.model, upa.user_id as requester_id
             FROM printers inv
             INNER JOIN user_printer_assignments upa ON upa.printer_id = inv.id
             WHERE inv.id = ? AND upa.institution_id = ?`,
            [printer_id, institution_id]
        );
        
        console.log('ðŸ–¨ï¸  Printer check:', printer.length > 0 ? 'FOUND' : 'NOT FOUND');
        
        if (printer.length === 0) {
            return res.status(400).json({ error: 'Printer not found in this institution' });
        }
        
        const requester_id = printer[0].requester_id;
        console.log('ðŸ‘¤ institution_user ID:', requester_id);
        
        // Enrich parts_used with part names for display
        let enrichedPartsUsed = null;
        if (parts_used && parts_used.length > 0) {
            enrichedPartsUsed = await Promise.all(parts_used.map(async (part) => {
                const [partInfo] = await db.query(
                    'SELECT name, brand FROM printer_parts WHERE id = ?',
                    [part.part_id]
                );
                return {
                    part_id: part.part_id,
                    name: partInfo[0]?.name || 'Unknown Part',
                    brand: partInfo[0]?.brand || null,
                    qty: part.qty,
                    unit: part.unit
                };
            }));
        }
        
        // Insert maintenance service
        const insertQuery = `
            INSERT INTO maintenance_services (
                technician_id,
                printer_id,
                institution_id,
                service_description,
                parts_used,
                completion_photo,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `;
        
        console.log('ðŸ’¾ Inserting maintenance service...');
        const [result] = await db.query(insertQuery, [
            technicianId,
            printer_id,
            institution_id,
            service_description,
            enrichedPartsUsed ? JSON.stringify(enrichedPartsUsed) : null,
            completion_photo || null
        ]);
        
        console.log('âœ… Service inserted, ID:', result.insertId);
        
        // Parts will be deducted only upon approval (not during submission)
        
        // Create notifications for institution_admin and institution_user
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
                'maintenance_service',
                'New Maintenance Service Submitted',
                CONCAT('A technician has submitted a maintenance service for ', ?, ' at ', i.name),
                ?,
                NOW()
            FROM institutions i
            WHERE i.institution_id = ? AND i.user_id IS NOT NULL
        `;
        
        await db.query(notificationQuery, [printer[0].name, result.insertId, institution_id]);
        
        // Also notify the institution_user
        if (requester_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, reference_id, created_at)
                 VALUES (?, 'maintenance_service', 'Maintenance Service Pending', 
                         'A technician has performed service on your printer. Awaiting institution_admin approval.', ?, NOW())`,
                [requester_id, result.insertId]
            );
        }
        
        res.status(201).json({
            message: 'Maintenance Service submitted successfully',
            service_id: result.insertId
        });
    } catch (error) {
        console.error('âŒ Error submitting Maintenance Service:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Failed to submit Maintenance Service',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get technician's Maintenance Service submissions
 * GET /api/Maintenance-services/my-submissions
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
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                u_coord.first_name as institution_admin_first_name,
                u_coord.last_name as institution_admin_last_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id = i.institution_id
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

// ==================== institution_admin ENDPOINTS ====================

/**
 * Get pending Maintenance Services for institution_admin review
 * GET /api/Maintenance-services/institution_admin/pending
 */
router.get('/institution_admin/pending', auth, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        
        console.log('Fetching Maintenance Services for institution_admin:', institution_adminId);
        
        // Get institution_admin's institutions using the correct architecture:
        // institutions.user_id points to the institution_admin who owns that institution
        const [institutions] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?',
            [institution_adminId]
        );
        
        console.log('ðŸ¢ institution_admin institutions:', institutions);
        
        if (institutions.length === 0) {
            console.log('âš ï¸ No institutions found for institution_admin');
            return res.json({ services: [] });
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        console.log('ðŸ” Looking for services in institutions:', institutionIds);
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE vs.institution_id IN (?)
            AND vs.status NOT IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('âœ… Found', services.length, 'Maintenance Services');
        
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
        console.error('âŒ Error fetching pending services for institution_admin:', error);
        res.status(500).json({ error: 'Failed to fetch pending services' });
    }
});

/**
 * Get institution_admin's Maintenance Service history (completed/rejected)
 * GET /api/Maintenance-services/institution_admin/history
 */
router.get('/institution_admin/history', auth, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        
        console.log('Fetching Maintenance Services history for institution_admin:', institution_adminId);
        
        // Get institution_admin's institutions
        const [institutions] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?',
            [institution_adminId]
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
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE vs.institution_id IN (?)
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('âœ… Found', services.length, 'Maintenance Services in history');
        
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
        console.error('âŒ Error fetching history for institution_admin:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Approve Maintenance Service (institution_admin)
 * PATCH /api/Maintenance-services/institution_admin/:id/approve
 */
router.patch('/institution_admin/:id/approve', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const institution_adminId = req.user.id;
        const { notes } = req.body;
        
        console.log('âœ… institution_admin', institution_adminId, 'approving service', serviceId);
        
        // Verify institution_admin owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as institution_admin_id
             FROM maintenance_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        console.log('ðŸ” Service data retrieved:', {
            id: service[0]?.id,
            technician_id: service[0]?.technician_id,
            parts_used_type: typeof service[0]?.parts_used,
            parts_used_value: service[0]?.parts_used,
            status: service[0]?.status
        });
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].institution_admin_id !== institution_adminId) {
            return res.status(403).json({ error: 'You do not have permission to approve this service' });
        }
        
        if (service[0].status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed' });
        }
        
        if (service[0].status === 'completed') {
            return res.status(400).json({ error: 'Service has already been completed' });
        }
        
        // Single approval mode: institution_admin approval immediately completes the service
        const newStatus = 'completed';
        
        console.log(`ðŸ“ institution_admin approving - service will be completed immediately`);
        
        // Update approval status and complete the service
        await db.query(
            `UPDATE maintenance_services 
             SET status = 'completed',
                 approved_by_user_id = ?,
                 approved_at = NOW(),
                 completed_at = NOW()
             WHERE id = ?`,
            [institution_adminId, serviceId]
        );
        
        // Deduct parts from inventory after institution_admin approval
        if (service[0].parts_used) {
            const parts_used = JSON.parse(service[0].parts_used);
            console.log('ðŸ“¦ Deducting parts from inventory after approval...');
            console.log('ðŸ“¦ Parts to deduct:', JSON.stringify(parts_used, null, 2));
            console.log('ðŸ‘¤ Technician ID:', service[0].technician_id);
            
            // First, let's see what's in the technician's inventory
            const [techInventory] = await db.query(
                `SELECT ti.id, ti.quantity, pp.id as part_id, pp.name, pp.brand, pp.category, pp.is_universal
                 FROM technician_inventory ti
                 INNER JOIN printer_parts pp ON ti.part_id = pp.id
                 WHERE ti.technician_id = ?`,
                [service[0].technician_id]
            );
            console.log('Technician inventory:', JSON.stringify(techInventory, null, 2));
            
            for (const part of parts_used) {
                try {
                    console.log(`\nðŸ” Processing part_id: ${part.part_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Unit: ${part.unit}`);
                    
                    // Query by part_id directly
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_parts pp ON ti.part_id = pp.id
                         WHERE ti.technician_id = ? AND ti.part_id = ?
                         LIMIT 1`,
                        [service[0].technician_id, part.part_id]
                    );
                    
                    console.log(`Query result: ${inventoryItem.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
                    if (inventoryItem.length > 0) {
                        console.log(`Found inventory: ID=${inventoryItem[0].id}, Part="${inventoryItem[0].name}", Current Qty=${inventoryItem[0].quantity}`);
                        const currentQty = inventoryItem[0].quantity;
                        const deductQty = parseInt(part.qty) || 0;
                        
                        if (currentQty >= deductQty) {
                            const newQty = currentQty - deductQty;
                            await db.query(
                                'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                [newQty, inventoryItem[0].id]
                            );
                            console.log(`   âœ… Deducted ${deductQty} of "${inventoryItem[0].name}", new qty: ${newQty}`);
                        } else {
                            console.log(`   âš ï¸ Insufficient stock: have ${currentQty}, need ${deductQty}`);
                        }
                    } else {
                        console.log(`   âŒ Part ID ${part.part_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(`âŒ Error deducting part:`, partError);
                }
            }
        } else {
            console.log('ðŸ“¦ No parts to deduct (parts_used is null/empty)');
        }
        
        // Notify technician that service was approved and completed
        const notificationMessage = 'Your maintenance service has been approved by the institution_admin and is now completed';
        
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'maintenance_service', 'Maintenance Service Approved', ?, ?)`,
            [service[0].technician_id, notificationMessage, serviceId]
        );
        
        res.json({ 
            message: 'Service approved and completed successfully',
            completed: true
        });
    } catch (error) {
        console.error('Error approving service:', error);
        res.status(500).json({ error: 'Failed to approve service' });
    }
});

/**
 * Reject Maintenance Service (institution_admin)
 * PATCH /api/Maintenance-services/institution_admin/:id/reject
 */
router.patch('/institution_admin/:id/reject', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const institution_adminId = req.user.id;
        const { reason, notes } = req.body;
        
        const rejectionReason = reason || notes;
        
        if (!rejectionReason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        console.log('âŒ institution_admin', institution_adminId, 'rejecting service', serviceId);
        
        // Verify institution_admin owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as institution_admin_id
             FROM maintenance_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].institution_admin_id !== institution_adminId) {
            return res.status(403).json({ error: 'You do not have permission to reject this service' });
        }
        
        if (service[0].status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed' });
        }
        
        // Update service
        await db.query(
            `UPDATE maintenance_services 
             SET status = 'rejected',
                 approved_by_user_id = ?,
                 approved_at = NOW()
             WHERE id = ?`,
            [institution_adminId, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'maintenance_service', 'Service Rejected', 
                     'Your Maintenance Service submission has been rejected by the institution_admin', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service rejected' });
    } catch (error) {
        console.error('Error rejecting service:', error);
        res.status(500).json({ error: 'Failed to reject service' });
    }
});

/**
 * Get technician's Maintenance Service history
 * GET /api/Maintenance-services/history
 */
router.get('/history', auth, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const query = `
            SELECT 
                vs.id,
                vs.service_description as description,
                vs.parts_used,
                vs.completion_photo as completion_photo_url,
                vs.status,
                vs.created_at,
                vs.approved_by_user_id,
                vs.approved_at,
                vs.approval_notes,
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                inv.name as printer_name,
                inv.brand as printer_brand,
                inv.model as printer_model,
                inv.serial_number as printer_serial_number,
                inv.location,
                CONCAT('VS-', vs.id) as request_number,
                CONCAT(approver.first_name, ' ', approver.last_name) as approver_name,
                approver.role as approver_role,
                CONCAT(institution_admin.first_name, ' ', institution_admin.last_name) as institution_admin_name,
                institution_admin.first_name as institution_admin_first_name,
                institution_admin.last_name as institution_admin_last_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users approver ON vs.approved_by_user_id = approver.id
            LEFT JOIN users institution_admin ON i.user_id = institution_admin.id
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
        console.error('Error fetching Maintenance Service history:', error);
        res.status(500).json({ error: 'Failed to fetch Maintenance Service history' });
    }
});

// ==================== institution_user ENDPOINTS ====================

/**
 * Get Maintenance Services for institution_user (their printers)
 * GET /api/Maintenance-services/institution_user/pending
 */
router.get('/institution_user/pending', auth, async (req, res) => {
    try {
        const requester_id = req.user.id;
        
        console.log('Fetching Maintenance Services for institution_user:', requester_id);
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN user_printer_assignments upa ON upa.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.status NOT IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requester_id, requester_id]);
        
        console.log('âœ… Found', services.length, 'Maintenance Services for institution_user');
        
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
        console.error('âŒ Error fetching services for institution_user:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

/**
 * Get institution_user's Maintenance Service history
 * GET /api/Maintenance-services/institution_user/history
 */
router.get('/institution_user/history', auth, async (req, res) => {
    try {
        const requester_id = req.user.id;
        
        const query = `
            SELECT 
                vs.*,
                inv.name as printer_name,
                inv.brand,
                inv.model,
                inv.location,
                i.name as institution_name,
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN user_printer_assignments upa ON upa.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requester_id, requester_id]);
        
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
        console.error('âŒ Error fetching history for institution_user:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Approve Maintenance Service (institution_user)
 * PATCH /api/Maintenance-services/institution_user/:id/approve
 */
router.patch('/institution_user/:id/approve', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requester_id = req.user.id;
        const { notes } = req.body;
        
        console.log('✅ institution_user', requester_id, 'approving service', serviceId);
        
        // Verify institution_user owns the printer
        const [service] = await db.query(
            `SELECT vs.*, upa.user_id as printer_owner_id
             FROM maintenance_services vs
             INNER JOIN user_printer_assignments upa ON upa.printer_id = vs.printer_id
             WHERE vs.id = ? AND upa.user_id = ?`,
            [serviceId, requester_id]
        );
        
        console.log('🔍 Service query result:', {
            found: service.length > 0,
            service_id: service[0]?.id,
            printer_owner_id: service[0]?.printer_owner_id,
            requester_id: requester_id,
            match: service[0]?.printer_owner_id === requester_id
        });
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found or you do not have permission' });
        }
        
        if (service[0].status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed' });
        }
        
        // Mark as completed when institution_user approves
        await db.query(
            `UPDATE maintenance_services 
             SET status = 'completed',
                 approved_by_user_id = ?,
                 approved_at = NOW(),
                 completed_at = NOW()
             WHERE id = ?`,
            [requester_id, serviceId]
        );
        
        // Deduct parts from inventory after approval
        if (service[0].parts_used) {
            const parts_used = JSON.parse(service[0].parts_used);
            console.log('📦 Deducting parts from inventory after institution_user approval...');
            console.log('📦 Parts to deduct:', JSON.stringify(parts_used, null, 2));
            console.log('👤 Technician ID:', service[0].technician_id);
            
            for (const part of parts_used) {
                try {
                    console.log(`\n🔍 Processing part_id: ${part.part_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Unit: ${part.unit}`);
                    
                    // Query by part_id directly
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_parts pp ON ti.part_id = pp.id
                         WHERE ti.technician_id = ? AND ti.part_id = ?
                         LIMIT 1`,
                        [service[0].technician_id, part.part_id]
                    );
                    
                    console.log(`Query result: ${inventoryItem.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
                    if (inventoryItem.length > 0) {
                        console.log(`Found inventory: ID=${inventoryItem[0].id}, Part="${inventoryItem[0].name}", Current Qty=${inventoryItem[0].quantity}`);
                        const currentQty = inventoryItem[0].quantity;
                        const deductQty = parseInt(part.qty) || 0;
                        
                        if (currentQty >= deductQty) {
                            const newQty = currentQty - deductQty;
                            await db.query(
                                'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                [newQty, inventoryItem[0].id]
                            );
                            console.log(`   ✅ Deducted ${deductQty} of "${inventoryItem[0].name}", new qty: ${newQty}`);
                        } else {
                            console.log(`   ⚠️ Insufficient stock: have ${currentQty}, need ${deductQty}`);
                        }
                    } else {
                        console.log(`   ❌ Part ID ${part.part_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(`❌ Error deducting part:`, partError);
                }
            }
        } else {
            console.log('📦 No parts to deduct (parts_used is null/empty)');
        }
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'maintenance_service', 'Maintenance Service Approved', 
                     'Your Maintenance Service has been approved by the institution_user', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service approved successfully' });
    } catch (error) {
        console.error('Error approving service:', error);
        res.status(500).json({ error: 'Failed to approve service' });
    }
});

/**
 * Reject Maintenance Service (institution_user)
 * PATCH /api/Maintenance-services/institution_user/:id/reject
 */
router.patch('/institution_user/:id/reject', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const requester_id = req.user.id;
        const { reason, notes } = req.body;
        
        const rejectionReason = reason || notes;
        
        if (!rejectionReason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        console.log('âŒ institution_user', requester_id, 'rejecting service', serviceId);
        
        // Verify institution_user owns the printer
        const [service] = await db.query(
            `SELECT vs.*, upa.user_id as printer_owner_id
             FROM maintenance_services vs
             INNER JOIN user_printer_assignments upa ON upa.printer_id = vs.printer_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        if (service.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service[0].printer_owner_id !== requester_id) {
            return res.status(403).json({ error: 'You do not have permission to reject this service' });
        }
        
        if (service[0].status !== 'pending') {
            return res.status(400).json({ error: 'Service has already been reviewed' });
        }
        
        // Update service
        await db.query(
            `UPDATE maintenance_services 
             SET status = 'rejected',
                 approved_by_user_id = ?,
                 approved_at = NOW()
             WHERE id = ?`,
            [requester_id, serviceId]
        );
        
        // Notify technician
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES (?, 'maintenance_service', 'Service Rejected', 
                     'Your Maintenance Service has been rejected by the institution_user', ?)`,
            [service[0].technician_id, serviceId]
        );
        
        res.json({ message: 'Service rejected' });
    } catch (error) {
        console.error('Error rejecting service:', error);
        res.status(500).json({ error: 'Failed to reject service' });
    }
});

/**
 * Get Monthly Maintenance Services for Billing (Institution Admin)
 * GET /api/maintenance-services/institution_admin/monthly-billing
 * Query params: year, month (defaults to current month)
 */
router.get('/institution_admin/monthly-billing', auth, async (req, res) => {
    try {
        const institution_adminId = req.user.id;
        const currentDate = new Date();
        const year = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
        const month = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
        
        console.log(`📅 Fetching monthly billing for institution_admin ${institution_adminId}: ${year}-${month}`);
        
        // Get institution_admin's institutions
        const [institutions] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?',
            [institution_adminId]
        );
        
        if (institutions.length === 0) {
            return res.json({ 
                summary: { 
                    totalPrinters: 0, 
                    totalServices: 0, 
                    uniquePrinters: 0,
                    institutions: []
                },
                dailyServices: [],
                services: []
            });
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        // Get maintenance services for the month (completed only for billing)
        const maintenanceQuery = `
            SELECT 
                ms.*,
                p.name as printer_name,
                p.brand,
                p.model,
                p.serial_number,
                p.location,
                i.name as institution_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email,
                DATE(ms.completed_at) as service_date,
                'maintenance_service' as service_type
            FROM maintenance_services ms
            INNER JOIN printers p ON ms.printer_id = p.id
            INNER JOIN institutions i ON ms.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            INNER JOIN users u_tech ON ms.technician_id = u_tech.id
            WHERE ms.institution_id IN (?)
                AND ms.status = 'completed'
                AND YEAR(ms.completed_at) = ?
                AND MONTH(ms.completed_at) = ?
            ORDER BY ms.completed_at DESC
        `;
        
        // Get completed service requests for the month
        const serviceRequestsQuery = `
            SELECT 
                sr.id,
                sr.request_number,
                sr.description,
                sr.priority,
                sr.status,
                sr.created_at,
                sr.started_at,
                sr.completed_at,
                sr.printer_id,
                sr.institution_id,
                sr.technician_id,
                p.name as printer_name,
                p.brand,
                p.model,
                p.serial_number,
                sr.location,
                i.name as institution_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email,
                DATE(sr.completed_at) as service_date,
                'service_request' as service_type
            FROM service_requests sr
            INNER JOIN printers p ON sr.printer_id = p.id
            INNER JOIN institutions i ON sr.institution_id = i.institution_id
            INNER JOIN users u_tech ON sr.technician_id = u_tech.id
            WHERE sr.institution_id IN (?)
                AND sr.status = 'completed'
                AND YEAR(sr.completed_at) = ?
                AND MONTH(sr.completed_at) = ?
            ORDER BY sr.completed_at DESC
        `;
        
        const [maintenanceServices] = await db.query(maintenanceQuery, [institutionIds, year, month]);
        const [serviceRequests] = await db.query(serviceRequestsQuery, [institutionIds, year, month]);
        
        // Combine both types of services
        const services = [...maintenanceServices, ...serviceRequests].sort((a, b) => 
            new Date(b.completed_at) - new Date(a.completed_at)
        );
        
        // Parse parts_used JSON
        services.forEach(service => {
            if (service.parts_used) {
                try {
                    service.parts_used = JSON.parse(service.parts_used);
                } catch (e) {
                    service.parts_used = [];
                }
            }
        });
        
        // Calculate summary statistics
        const uniquePrinters = new Set(services.map(s => s.printer_id)).size;
        const totalServices = services.length;
        
        // Group services by date for calendar view
        const dailyServicesMap = {};
        services.forEach(service => {
            const date = service.service_date;
            if (!dailyServicesMap[date]) {
                dailyServicesMap[date] = {
                    date,
                    count: 0,
                    printers: new Set(),
                    services: []
                };
            }
            dailyServicesMap[date].count++;
            dailyServicesMap[date].printers.add(service.printer_id);
            dailyServicesMap[date].services.push({
                id: service.id,
                printer_name: service.printer_name,
                technician_name: service.technician_name
            });
        });
        
        // Convert to array and format
        const dailyServices = Object.values(dailyServicesMap).map(day => ({
            date: day.date,
            serviceCount: day.count,
            uniquePrinterCount: day.printers.size,
            services: day.services
        }));
        
        // Group by institution
        const institutionStats = {};
        institutions.forEach(inst => {
            institutionStats[inst.institution_id] = {
                institution_id: inst.institution_id,
                institution_name: inst.name,
                totalServices: 0,
                uniquePrinters: new Set()
            };
        });
        
        services.forEach(service => {
            if (institutionStats[service.institution_id]) {
                institutionStats[service.institution_id].totalServices++;
                institutionStats[service.institution_id].uniquePrinters.add(service.printer_id);
            }
        });
        
        const institutionSummary = Object.values(institutionStats).map(stat => ({
            institution_id: stat.institution_id,
            institution_name: stat.institution_name,
            totalServices: stat.totalServices,
            uniquePrinters: stat.uniquePrinters.size
        }));
        
        res.json({
            summary: {
                year,
                month,
                totalServices,
                uniquePrinters,
                institutions: institutionSummary
            },
            dailyServices: dailyServices.sort((a, b) => new Date(b.date) - new Date(a.date)),
            services
        });
        
    } catch (error) {
        console.error('❌ Error fetching monthly billing:', error);
        res.status(500).json({ error: 'Failed to fetch monthly billing data' });
    }
});

module.exports = router;





