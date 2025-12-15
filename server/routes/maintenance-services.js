const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authenticateAdmin } = require('../middleware/auth');

/**
 * Maintenance Services API
 * Allows technicians to submit scheduled maintenance services for printers
 * Requires dual approval from institution_admin and institution_user
 */

// ==================== TECHNICIAN ENDPOINTS ====================

/**
 * Get technician's Maintenance Service history
 * GET /api/maintenance-services/history
 * IMPORTANT: This must come BEFORE /:id route to avoid route collision
 */
router.get('/history', auth, async (req, res) => {
    console.log('🔍 /history endpoint hit - user:', req.user.id, 'role:', req.user.role);
    try {
        const technicianId = req.user.id;
        
        console.log('📋 Fetching maintenance services for technician:', technicianId);
        
        const query = `
            SELECT 
                vs.id,
                vs.service_description as description,
                vs.completion_photo as completion_photo_url,
                vs.status,
                vs.created_at,
                sa.approved_by as approved_by_user_id,
                sa.approved_at,
                sa.notes as approval_notes,
                i.institution_id,
                i.name as institution_name,
                i.type as institution_type,
                inv.name as printer_name,
                inv.brand as printer_brand,
                inv.model as printer_model,
                inv.serial_number as printer_serial_number,
                inv.location,
                inv.department as printer_department,
                CONCAT('MS-', vs.id) as request_number,
                CONCAT(approver.first_name, ' ', approver.last_name) as approver_name,
                approver.role as approver_role,
                CONCAT(institution_admin.first_name, ' ', institution_admin.last_name) as institution_admin_name,
                institution_admin.first_name as institution_admin_first_name,
                institution_admin.last_name as institution_admin_last_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN service_approvals sa ON sa.service_id = vs.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users approver ON sa.approved_by = approver.id
            LEFT JOIN users institution_admin ON i.user_id = institution_admin.id
            WHERE vs.technician_id = ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [technicianId]);
        
        console.log(`✅ Found ${services.length} maintenance services for technician ${technicianId}`);
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        console.log(`📤 Returning ${services.length} maintenance services`);
        res.json(services);
    } catch (error) {
        console.error('❌ Error fetching Maintenance Service history:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch Maintenance Service history' });
    }
});

/**
 * Get technician's Maintenance Service submissions
 * GET /api/maintenance-services/my-submissions
 * IMPORTANT: This must come BEFORE /:id route to avoid route collision
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
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        res.json(services);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

/**
 * Get technician's assigned public schools with printer stats
 * GET /api/maintenance-services/assigned-schools
 * IMPORTANT: This must come BEFORE /:id route to avoid route collision
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
                        WHEN latest_service.latest_status = 'pending'
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
                            CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_0900_ai_ci as latest_status,
                            created_at as latest_date,
                            'Maintenance' as service_type
                        FROM maintenance_services 
                        WHERE technician_id = ?
                        
                        UNION ALL
                        
                        -- Get latest regular service request status
                        SELECT 
                            printer_id as printer_id,
                            CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_0900_ai_ci as latest_status,
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
 * GET /api/maintenance-services/school-printers/:institutionId
 * IMPORTANT: This must come BEFORE /:id route to avoid route collision
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
                inv.department,
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
                        CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_0900_ai_ci as latest_status,
                        created_at as latest_date,
                        'Maintenance' as service_type
                    FROM maintenance_services 
                    WHERE technician_id = ?
                    
                    UNION ALL
                    
                    -- Get latest regular service request
                    SELECT 
                        printer_id as printer_id,
                        CAST(status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_0900_ai_ci as latest_status,
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
 * Check if printer has pending maintenance service
 * GET /api/maintenance-services/printer/:printerId/pending
 * Returns whether a printer has any pending maintenance services
 */
router.get('/printer/:printerId/pending', auth, async (req, res) => {
    try {
        const { printerId } = req.params;
        
        console.log('🔍 Checking pending maintenance for printer:', printerId);
        
        const [pendingServices] = await db.query(
            `SELECT ms.id, CONCAT('MS-', ms.id) as service_number, ms.status
             FROM maintenance_services ms
             WHERE ms.printer_id = ? 
             AND ms.status = 'pending'
             LIMIT 1`,
            [printerId]
        );
        
        if (pendingServices.length > 0) {
            console.log('✅ Found pending service:', pendingServices[0].service_number);
            return res.json({
                hasPendingService: true,
                pendingService: {
                    service_number: pendingServices[0].service_number,
                    status: pendingServices[0].status
                }
            });
        }
        
        console.log('✅ No pending services found');
        res.json({ hasPendingService: false });
        
    } catch (error) {
        console.error('Error checking pending maintenance services:', error);
        res.status(500).json({ error: 'Failed to check pending services' });
    }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get a single maintenance service by ID
 * GET /api/maintenance-services/:id
 * Accessible by: admin, operations officer, technician (own services), institution_admin (own institution), institution_user (own institution)
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const [services] = await db.query(`
            SELECT 
                ms.id,
                CONCAT('MS-', ms.id) as service_number,
                ms.service_description,
                ms.completion_photo,
                ms.status,
                ms.created_at,
                sa.approved_by as approved_by_user_id,
                sa.approved_at,
                sa.notes as approval_notes,
                ms.technician_id,
                i.institution_id,
                i.name as institution_name,
                i.user_id as institution_admin_id,
                p.id as printer_id,
                p.name as printer_name,
                p.location,
                p.department,
                CONCAT(tech.first_name, ' ', tech.last_name) as technician_name,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
            FROM maintenance_services ms
            JOIN printers p ON ms.printer_id = p.id
            JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN service_approvals sa ON sa.service_id = ms.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users tech ON ms.technician_id = tech.id
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE ms.id = ?
        `, [serviceId]);
        
        if (services.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        const service = services[0];
        
        // Fetch items_used from service_items_used table
        const [items] = await db.query(`
            SELECT 
                siu.item_id,
                siu.quantity_used as qty,
                siu.notes as unit,
                pi.name,
                pi.brand
            FROM service_items_used siu
            INNER JOIN printer_items pi ON siu.item_id = pi.id
            WHERE siu.service_id = ?
        `, [service.id]);
        
        service.items_used = items;
        
        // Role-based access control
        if (userRole === 'admin' || userRole === 'operations_officer') {
            // Admins and operations officers can view all services
            return res.json(service);
        } else if (userRole === 'technician' && service.technician_id === userId) {
            // Technicians can view their own services
            return res.json(service);
        } else if (userRole === 'institution_admin' && service.institution_admin_id === userId) {
            // Institution admins can view services for their institution
            return res.json(service);
        } else if (userRole === 'institution_user') {
            // Institution users can view services for printers they manage
            // Check if they have access to this institution
            const [userInstitution] = await db.query(
                'SELECT institution_id FROM users WHERE id = ?',
                [userId]
            );
            if (userInstitution.length > 0 && userInstitution[0].institution_id === service.institution_id) {
                return res.json(service);
            }
        }
        
        // If none of the above conditions are met, deny access
        return res.status(403).json({ error: 'Access denied. You do not have permission to view this service.' });
        
    } catch (error) {
        console.error('Error fetching maintenance service:', error);
        res.status(500).json({ error: 'Failed to fetch service details' });
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
            items_used,
            completion_photo
        } = req.body;
        
        console.log('📝 Maintenance service submission:', {
            technicianId,
            printer_id,
            institution_id,
            service_description: service_description?.substring(0, 50),
            parts_count: items_used?.length || 0
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
            `SELECT inv.id, inv.name, inv.brand, inv.model, ipa.institution_id
             FROM printers inv
             INNER JOIN institution_printer_assignments ipa ON ipa.printer_id = inv.id
             WHERE inv.id = ? AND ipa.institution_id = ?`,
            [printer_id, institution_id]
        );
        
        console.log('🖨️  Printer check:', printer.length > 0 ? 'FOUND' : 'NOT FOUND');
        
        if (printer.length === 0) {
            return res.status(400).json({ error: 'Printer not found in this institution' });
        }
        
        // Check for active service requests on this printer
        const [activeServiceRequests] = await db.query(
            `SELECT sr.id, sr.request_number, sr.status
             FROM service_requests sr
             WHERE sr.printer_id = ? 
             AND sr.status IN ('pending', 'assigned', 'in_progress', 'pending_approval')
             LIMIT 1`,
            [printer_id]
        );
        
        console.log('Active service request check:', activeServiceRequests.length > 0 ? 'FOUND ACTIVE' : 'NONE');
        
        if (activeServiceRequests.length > 0) {
            const activeRequest = activeServiceRequests[0];
            console.log('Cannot perform maintenance - active service request exists:', activeRequest.request_number);
            return res.status(400).json({ 
                error: 'Cannot perform maintenance service. This printer has an active service request that must be completed first.',
                activeRequest: {
                    request_number: activeRequest.request_number,
                    status: activeRequest.status
                }
            });
        }

        // Check for pending maintenance services on this printer
        console.log('🔍 Checking for pending maintenance services on printer_id:', printer_id);
        const [pendingMaintenanceServices] = await db.query(
            `SELECT ms.id, CONCAT('MS-', ms.id) as service_number, ms.status
             FROM maintenance_services ms
             WHERE ms.printer_id = ? 
             AND ms.status = 'pending'
             LIMIT 1`,
            [printer_id]
        );
        
        console.log('📊 Pending maintenance service check results:', {
            found: pendingMaintenanceServices.length > 0,
            count: pendingMaintenanceServices.length,
            services: pendingMaintenanceServices
        });
        
        if (pendingMaintenanceServices.length > 0) {
            const pendingService = pendingMaintenanceServices[0];
            console.log('❌ Cannot submit new maintenance - pending service exists:', pendingService.service_number, 'Status:', pendingService.status);
            return res.status(400).json({ 
                error: 'Cannot submit another maintenance service. This printer has a pending maintenance service that must be approved first.',
                pendingService: {
                    service_number: pendingService.service_number,
                    status: pendingService.status
                }
            });
        }
        
        console.log('✅ No pending services found, proceeding with submission');
        
        const requester_id = printer[0].requester_id;
        console.log('👤 institution_user ID:', requester_id);
        
        // Insert maintenance service
        const insertQuery = `
            INSERT INTO maintenance_services (
                technician_id,
                printer_id,
                institution_id,
                service_description,
                completion_photo,
                status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        
        console.log('💾 Inserting maintenance service...');
        const [result] = await db.query(insertQuery, [
            technicianId,
            printer_id,
            institution_id,
            service_description,
            completion_photo || null
        ]);
        
        const serviceId = result.insertId;
        console.log('✅ Service inserted, ID:', serviceId);
        
        // Insert items into service_items_used table
        if (items_used && items_used.length > 0) {
            const itemsQuery = `
                INSERT INTO service_items_used (service_id, item_id, quantity_used, used_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            for (const item of items_used) {
                await db.query(itemsQuery, [
                    serviceId,
                    item.item_id,
                    item.qty,
                    technicianId,
                    item.unit || null
                ]);
            }
            console.log(`✅ Inserted ${items_used.length} items into service_items_used`);
        }
        
        console.log('✅ Service inserted, ID:', result.insertId);
        
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
        console.error('❌ Error submitting Maintenance Service:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Failed to submit Maintenance Service',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
        
        console.log('🏢 institution_admin institutions:', institutions);
        
        if (institutions.length === 0) {
            console.log('⚠️ No institutions found for institution_admin');
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
                CONCAT(u_coord.first_name, ' ', u_coord.last_name) as institution_admin_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE vs.institution_id IN (?)
            AND vs.status NOT IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('✅ Found', services.length, 'Maintenance Services');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching pending services for institution_admin:', error);
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
                u_tech.email as technician_email,
                sa.approved_by,
                sa.approved_at,
                sa.approval_status,
                sa.notes as approval_notes,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN service_approvals sa ON sa.service_id = vs.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE vs.institution_id IN (?)
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log('✅ Found', services.length, 'Maintenance Services in history');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching history for institution_admin:', error);
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
        
        console.log('✅ institution_admin', institution_adminId, 'approving service', serviceId);
        
        // Verify institution_admin owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as institution_admin_id
             FROM maintenance_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        console.log('🔍 Service data retrieved:', {
            id: service[0]?.id,
            technician_id: service[0]?.technician_id,
            items_used_type: typeof service[0]?.items_used,
            items_used_value: service[0]?.items_used,
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
        
        console.log(`📝 institution_admin approving - service will be completed immediately`);
        
        // Update status and complete the service
        await db.query(
            `UPDATE maintenance_services 
             SET status = 'completed',
                 completed_at = NOW()
             WHERE id = ?`,
            [serviceId]
        );
        
        // Insert approval record into service_approvals table
        await db.query(
            `INSERT INTO service_approvals (service_id, service_type, approved_by, approved_at, approval_status, notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'approved', ?)`,
            [serviceId, institution_adminId, notes || null]
        );
        
        // Deduct parts from inventory after institution_admin approval
        // Fetch items_used from service_items_used table
        const [itemsUsedRows] = await db.query(`
            SELECT item_id, quantity_used as qty
            FROM service_items_used
            WHERE service_id = ?
        `, [serviceId]);
        
        if (itemsUsedRows && itemsUsedRows.length > 0) {
            console.log('📦 Deducting parts from inventory after approval...');
            console.log('📦 Parts to deduct:', JSON.stringify(itemsUsedRows, null, 2));
            console.log('👤 Technician ID:', service[0].technician_id);
            
            // First, let's see what's in the technician's inventory
            const [techInventory] = await db.query(
                `SELECT ti.id, ti.quantity, pp.id as item_id, pp.name, pp.brand, pp.category, pp.is_universal
                 FROM technician_inventory ti
                 INNER JOIN printer_items pp ON ti.item_id = pp.id
                 WHERE ti.technician_id = ?`,
                [service[0].technician_id]
            );
            console.log('Technician inventory:', JSON.stringify(techInventory, null, 2));
            
            for (const part of itemsUsedRows) {
                try {
                    console.log(`\n🔍 Processing item_id: ${part.item_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Unit: ${part.unit}`);
                    
                    // Query by item_id directly
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_items pp ON ti.item_id = pp.id
                         WHERE ti.technician_id = ? AND ti.item_id = ?
                         LIMIT 1`,
                        [service[0].technician_id, part.item_id]
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
                        console.log(`   ❌ Item ID ${part.item_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(`❌ Error deducting part:`, partError);
                }
            }
        } else {
            console.log('📦 No parts to deduct (items_used is null/empty)');
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
        
        console.log('❌ institution_admin', institution_adminId, 'rejecting service', serviceId);
        
        // Verify institution_admin owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as institution_admin_id
             FROM maintenance_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
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
             SET status = 'rejected'
             WHERE id = ?`,
            [serviceId]
        );
        
        // Insert rejection record into service_approvals table
        await db.query(
            `INSERT INTO service_approvals (service_id, service_type, approved_by, approved_at, approval_status, notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'rejected', ?)`,
            [serviceId, institution_adminId, rejectionReason]
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
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.status NOT IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requester_id, requester_id]);
        
        console.log('✅ Found', services.length, 'Maintenance Services for institution_user');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching services for institution_user:', error);
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
                u_tech.email as technician_email,
                sa.approved_by,
                sa.approved_at,
                sa.approval_status,
                sa.notes as approval_notes,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN user_printer_assignments upa ON upa.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN service_approvals sa ON sa.service_id = vs.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE upa.user_id = ?
            AND vs.technician_id != ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [requester_id, requester_id]);
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    pi.name,
                    pi.brand
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ?
            `, [service.id]);
            
            service.items_used = items;
        }
        
        res.json({ services });
    } catch (error) {
        console.error('❌ Error fetching history for institution_user:', error);
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
        
        console.log('? institution_user', requester_id, 'approving service', serviceId);
        
        // Verify institution_user owns the printer
        const [service] = await db.query(
            `SELECT vs.*, upa.user_id as printer_owner_id
             FROM maintenance_services vs
             INNER JOIN user_printer_assignments upa ON upa.printer_id = vs.printer_id
             WHERE vs.id = ? AND upa.user_id = ?`,
            [serviceId, requester_id]
        );
        
        console.log('?? Service query result:', {
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
                 completed_at = NOW()
             WHERE id = ?`,
            [serviceId]
        );
        
        // Insert approval record into service_approvals table
        await db.query(
            `INSERT INTO service_approvals (service_id, service_type, approved_by, approved_at, approval_status, notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'approved', ?)`,
            [serviceId, requester_id, notes || null]
        );
        
        // Deduct parts from inventory after approval
        // Fetch items_used from service_items_used table
        const [itemsUsedRows] = await db.query(`
            SELECT item_id, quantity_used as qty
            FROM service_items_used
            WHERE service_id = ?
        `, [serviceId]);
        
        if (itemsUsedRows && itemsUsedRows.length > 0) {
            console.log('?? Deducting parts from inventory after institution_user approval...');
            console.log('?? Parts to deduct:', JSON.stringify(itemsUsedRows, null, 2));
            console.log('?? Technician ID:', service[0].technician_id);
            
            for (const part of itemsUsedRows) {
                try {
                    console.log(`\n?? Processing item_id: ${part.item_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Unit: ${part.unit}`);
                    
                    // Query by item_id directly
                    const [inventoryItem] = await db.query(
                        `SELECT ti.id, ti.quantity, pp.name, pp.brand
                         FROM technician_inventory ti
                         INNER JOIN printer_items pp ON ti.item_id = pp.id
                         WHERE ti.technician_id = ? AND ti.item_id = ?
                         LIMIT 1`,
                        [service[0].technician_id, part.item_id]
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
                            console.log(`   ? Deducted ${deductQty} of "${inventoryItem[0].name}", new qty: ${newQty}`);
                        } else {
                            console.log(`   ?? Insufficient stock: have ${currentQty}, need ${deductQty}`);
                        }
                    } else {
                        console.log(`   ? Item ID ${part.item_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(`? Error deducting part:`, partError);
                }
            }
        } else {
            console.log('?? No parts to deduct (items_used is null/empty)');
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
        
        console.log('❌ institution_user', requester_id, 'rejecting service', serviceId);
        
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
             SET status = 'rejected'
             WHERE id = ?`,
            [serviceId]
        );
        
        // Insert rejection record into service_approvals table
        await db.query(
            `INSERT INTO service_approvals (service_id, service_type, approved_by, approved_at, approval_status, notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'rejected', ?)`,
            [serviceId, requester_id, rejectionReason]
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
        
        console.log(`?? Fetching monthly billing for institution_admin ${institution_adminId}: ${year}-${month}`);
        
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
            INNER JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
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
                p.location,
                p.department,
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
        
        // Fetch items_used for maintenance services from service_items_used table
        for (const service of services) {
            if (service.service_type === 'maintenance') {
                const [items] = await db.query(`
                    SELECT 
                        siu.item_id,
                        siu.quantity_used as qty,
                        siu.notes as unit,
                        pi.name,
                        pi.brand
                    FROM service_items_used siu
                    INNER JOIN printer_items pi ON siu.item_id = pi.id
                    WHERE siu.service_id = ?
                `, [service.id]);
                
                service.items_used = items;
            } else if (service.items_used) {
                // For service_requests, parse JSON if needed
                try {
                    service.items_used = JSON.parse(service.items_used);
                } catch (e) {
                    service.items_used = [];
                }
            }
        }
        
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
        console.error('? Error fetching monthly billing:', error);
        res.status(500).json({ error: 'Failed to fetch monthly billing data' });
    }
});

module.exports = router;







