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
    console.log(' /history endpoint hit - user:', req.user.id, 'role:', req.user.role);
    try {
        const technicianId = req.user.id;
        
        console.log(' Fetching maintenance services for technician:', technicianId);
        
        // Use subquery to get only the latest service_approval for each maintenance service
        const query = `
            SELECT 
                vs.id,
                vs.service_description as description,
                vs.service_description as technician_notes,
                vs.completion_photo as completion_photo_url,
                vs.status,
                vs.created_at,
                vs.completed_at,
                sa.approved_by as approved_by_user_id,
                sa.reviewed_at as approved_at,
                sa.institution_admin_notes as approval_notes,
                sa.technician_notes as sa_technician_notes,
                sa.submitted_at as pending_approval_at,
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
                approver.first_name as approver_first_name,
                approver.last_name as approver_last_name,
                approver.role as approver_role,
                CONCAT(institution_admin.first_name, ' ', institution_admin.last_name) as institution_admin_name,
                institution_admin.first_name as institution_admin_first_name,
                institution_admin.last_name as institution_admin_last_name,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN (
                SELECT service_id, service_type, approved_by, reviewed_at, institution_admin_notes, 
                       technician_notes, submitted_at,
                       ROW_NUMBER() OVER (PARTITION BY service_id, service_type ORDER BY id DESC) as rn
                FROM service_approvals 
                WHERE service_type = 'maintenance_service'
            ) sa ON sa.service_id = vs.id AND sa.rn = 1
            LEFT JOIN users approver ON sa.approved_by = approver.id
            LEFT JOIN users institution_admin ON i.user_id = institution_admin.id
            LEFT JOIN users tech ON vs.technician_id = tech.id
            WHERE vs.technician_id = ?
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [technicianId]);
        
        console.log(` Found ${services.length} maintenance services for technician ${technicianId}`);
        
        // Fetch items_used for each service and build synthetic history
        for (const service of services) {
            try {
                const [items] = await db.query(`
                    SELECT 
                        siu.item_id,
                        siu.quantity_used as qty,
                        siu.quantity_used as quantity_used,
                        siu.notes as part_notes,
                        siu.consumption_type,
                        siu.amount_consumed,
                        COALESCE(siu.display_amount, 
                            CASE 
                                WHEN siu.amount_consumed IS NOT NULL AND siu.amount_consumed > 0 THEN
                                    CONCAT(siu.amount_consumed, IF(pi.ink_volume IS NOT NULL AND pi.ink_volume > 0, 'ml', 'g'))
                                ELSE NULL
                            END
                        ) as display_amount,
                        pi.name as part_name,
                        pi.name,
                        pi.brand,
                        pi.color,
                        pi.unit,
                        pi.ink_volume,
                        pi.toner_weight,
                        pi.category
                    FROM service_items_used siu
                    INNER JOIN printer_items pi ON siu.item_id = pi.id
                    WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
                `, [service.id]);
                
                // Debug log to see what items are returned
                console.log(`Service ${service.id} items:`, JSON.stringify(items, null, 2));
                
                service.items_used = items;
            } catch (itemError) {
                console.error(`Error fetching items for service ${service.id}:`, itemError);
                service.items_used = [];
            }
            
            // Build synthetic service progress history to match service requests flow:
            // pending -> in_progress -> pending_approval -> completed/rejected
            const history = [];
            
            // Calculate timestamps for synthetic history
            const createdAt = new Date(service.created_at);
            const pendingApprovalAt = service.pending_approval_at ? new Date(service.pending_approval_at) : new Date(createdAt.getTime() + 1000);
            const completedAt = service.approved_at ? new Date(service.approved_at) : null;
            
            // 1. Service Created (Pending)
            history.push({
                id: 1,
                previous_status: null,
                new_status: 'pending',
                notes: 'Maintenance service created',
                created_at: createdAt,
                first_name: service.technician_first_name,
                last_name: service.technician_last_name,
                role: 'technician'
            });
            
            // 2. In Progress (technician started work)
            history.push({
                id: 2,
                previous_status: 'pending',
                new_status: 'in_progress',
                notes: 'Status updated by technician to in_progress',
                created_at: new Date(createdAt.getTime() + 500),
                first_name: service.technician_first_name,
                last_name: service.technician_last_name,
                role: 'technician'
            });
            
            // 3. Pending Approval (submitted for review)
            history.push({
                id: 3,
                previous_status: 'in_progress',
                new_status: 'pending_approval',
                notes: `Service completion submitted for approval. Actions: ${service.description || 'N/A'}`,
                created_at: pendingApprovalAt,
                first_name: service.technician_first_name,
                last_name: service.technician_last_name,
                role: 'technician'
            });
            
            // 4. Completed/Rejected
            if (service.status === 'completed' && completedAt) {
                history.push({
                    id: 4,
                    previous_status: 'pending_approval',
                    new_status: 'completed',
                    notes: service.approval_notes || `Approved by ${service.approver_role === 'admin' ? 'Admin' : service.approver_role === 'institution_admin' ? 'Institution Admin' : 'User'} - ${service.approver_name || 'Unknown'}`,
                    created_at: completedAt,
                    first_name: service.approver_first_name,
                    last_name: service.approver_last_name,
                    role: service.approver_role || 'institution_admin'
                });
            } else if (service.status === 'rejected' && completedAt) {
                history.push({
                    id: 4,
                    previous_status: 'pending_approval',
                    new_status: 'rejected',
                    notes: service.approval_notes || 'Service rejected',
                    created_at: completedAt,
                    first_name: service.approver_first_name,
                    last_name: service.approver_last_name,
                    role: service.approver_role || 'institution_admin'
                });
            }
            
            service.history = history;
            
            // Use sa_technician_notes if available, otherwise fallback to description
            if (service.sa_technician_notes) {
                service.technician_notes = service.sa_technician_notes;
            }
        }
        
        console.log(` Returning ${services.length} maintenance services`);
        res.json(services);
    } catch (error) {
        console.error(' Error fetching Maintenance Service history:', error);
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
                    siu.consumption_type,
                    siu.amount_consumed,
                    pi.name,
                    pi.brand,
                    pi.color,
                    pi.ink_volume,
                    pi.toner_weight
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
            `, [service.id]);
            
            service.items_used = items.map(item => ({
                ...item,
                display_amount: item.amount_consumed 
                    ? `${item.amount_consumed}${item.ink_volume && parseFloat(item.ink_volume) > 0 ? 'ml' : 'g'}`
                    : null
            }));
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
        
        console.log(' Checking pending maintenance for printer:', printerId);
        
        const [pendingServices] = await db.query(
            `SELECT ms.id, CONCAT('MS-', ms.id) as service_number, ms.status
             FROM maintenance_services ms
             WHERE ms.printer_id = ? 
             AND ms.status = 'pending'
             LIMIT 1`,
            [printerId]
        );
        
        if (pendingServices.length > 0) {
            console.log(' Found pending service:', pendingServices[0].service_number);
            return res.json({
                hasPendingService: true,
                pendingService: {
                    service_number: pendingServices[0].service_number,
                    status: pendingServices[0].status
                }
            });
        }
        
        console.log(' No pending services found');
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
                sa.reviewed_at as approved_at,
                sa.institution_admin_notes as approval_notes,
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
            JOIN institutions i ON ms.institution_id = i.institution_id
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
                siu.consumption_type,
                siu.amount_consumed,
                pi.name,
                pi.brand,
                pi.color,
                pi.ink_volume,
                pi.toner_weight,
                CASE
                    WHEN siu.consumption_type = 'partial' AND siu.amount_consumed IS NOT NULL THEN
                        CONCAT(siu.amount_consumed, IF(pi.ink_volume IS NOT NULL AND pi.ink_volume > 0, 'ml', 'g'))
                    WHEN siu.consumption_type = 'full' AND siu.amount_consumed IS NOT NULL THEN
                        CONCAT(siu.amount_consumed, IF(pi.ink_volume IS NOT NULL AND pi.ink_volume > 0, 'ml', 'g'))
                    ELSE NULL
                END as display_amount
            FROM service_items_used siu
            INNER JOIN printer_items pi ON siu.item_id = pi.id
            WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
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
        
        console.log(' Maintenance service submission:', {
            technicianId,
            printer_id,
            institution_id,
            service_description: service_description?.substring(0, 50),
            parts_count: items_used?.length || 0
        });
        
        // Validate required fields
        if (!printer_id || !institution_id || !service_description) {
            console.log(' Missing required fields');
            return res.status(400).json({ 
                error: 'Printer ID, institution ID, and service description are required' 
            });
        }
        
        // Verify technician is assigned to this institution
        const [assignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE technician_id = ? AND institution_id = ?',
            [technicianId, institution_id]
        );
        
        console.log(' Assignment check:', assignment.length > 0 ? 'PASSED' : 'FAILED');
        
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
        console.log(' Checking for pending maintenance services on printer_id:', printer_id);
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
            console.log(' Cannot submit new maintenance - pending service exists:', pendingService.service_number, 'Status:', pendingService.status);
            return res.status(400).json({ 
                error: 'Cannot submit another maintenance service. This printer has a pending maintenance service that must be approved first.',
                pendingService: {
                    service_number: pendingService.service_number,
                    status: pendingService.status
                }
            });
        }
        
        console.log(' No pending services found, proceeding with submission');
        
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
        console.log(' Service inserted, ID:', serviceId);
        
        // Insert items into service_items_used table
        if (items_used && items_used.length > 0) {
            const itemsQuery = `
                INSERT INTO service_items_used (
                    service_id, service_type, item_id, quantity_used, used_by, notes,
                    consumption_type, amount_consumed
                )
                VALUES (?, 'maintenance_service', ?, ?, ?, ?, ?, ?)
            `;
            
            for (const item of items_used) {
                // Validate item_id exists
                if (!item.item_id || item.item_id === null) {
                    console.error(' Invalid item_id in items_used:', item);
                    continue; // Skip invalid items
                }
                
                await db.query(itemsQuery, [
                    serviceId,
                    item.item_id,
                    item.qty,
                    technicianId,
                    item.unit || null,
                    item.consumption_type || 'full',
                    item.amount_consumed || null
                ]);
                
                // NOTE: Inventory deduction (quantity and remaining volume/weight) 
                // will happen ONLY when institution admin approves the service
                // This just records what was used for approval review
                
                console.log('Item usage recorded (inventory will be deducted upon approval):', {
                    technicianId,
                    itemId: item.item_id,
                    quantity: item.quantity_used,
                    consumption_type: item.consumption_type,
                    amount_consumed: item.amount_consumed
                });
            }
            console.log(` Inserted ${items_used.length} items into service_items_used with consumption data`);
        }
        
        console.log(' Service inserted, ID:', result.insertId);
        
        // Parts will be deducted only upon approval (not during submission)
        
        // Create service_approvals record with technician_notes (service_description contains the actions performed)
        await db.query(
            `INSERT INTO service_approvals (service_id, service_type, status, technician_notes, submitted_at)
             VALUES (?, 'maintenance_service', 'pending_approval', ?, NOW())`,
            [serviceId, service_description]
        );
        console.log(' Service approval record created with technician notes');
        
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
        
        res.status(201).json({
            message: 'Maintenance Service submitted successfully',
            service_id: result.insertId
        });
    } catch (error) {
        console.error(' Error submitting Maintenance Service:', error);
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
            console.log(' No institutions found for institution_admin');
            return res.json({ services: [] });
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        console.log(' Looking for services in institutions:', institutionIds);
        
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
                sa.technician_notes,
                CONCAT(approver.first_name, ' ', approver.last_name) as approver_name,
                approver.role as approver_role,
                sa.reviewed_at as approved_at
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN service_approvals sa ON sa.service_id = vs.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE vs.institution_id IN (?)
            AND vs.status NOT IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log(' Found', services.length, 'Maintenance Services');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            try {
                const [items] = await db.query(`
                    SELECT 
                        siu.item_id,
                        siu.quantity_used as qty,
                        siu.notes as unit,
                        siu.consumption_type,
                        siu.amount_consumed,
                        pi.name,
                        pi.brand,
                        pi.color,
                        pi.ink_volume,
                        pi.toner_weight
                    FROM service_items_used siu
                    INNER JOIN printer_items pi ON siu.item_id = pi.id
                    WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
                `, [service.id]);
                
                service.items_used = items.map(item => ({
                    ...item,
                    display_amount: item.amount_consumed 
                        ? `${item.amount_consumed}${item.ink_volume && parseFloat(item.ink_volume) > 0 ? 'ml' : 'g'}`
                        : null
                }));
            } catch (itemError) {
                console.error(`Error fetching items for service ${service.id}:`, itemError);
                service.items_used = []; // Set empty array on error
            }
        }
        
        res.json({ services });
    } catch (error) {
        console.error(' Error fetching pending services for institution_admin:', error);
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
                sa.technician_notes,
                CONCAT(approver.first_name, ' ', approver.last_name) as approver_name,
                approver.role as approver_role,
                sa.reviewed_at as approved_at
            FROM maintenance_services vs
            INNER JOIN printers inv ON vs.printer_id = inv.id
            INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            LEFT JOIN users u_coord ON i.user_id = u_coord.id
            INNER JOIN users u_tech ON vs.technician_id = u_tech.id
            LEFT JOIN service_approvals sa ON sa.service_id = vs.id AND sa.service_type = 'maintenance_service'
            LEFT JOIN users approver ON sa.approved_by = approver.id
            WHERE vs.institution_id IN (?)
            AND vs.status IN ('completed', 'rejected')
            ORDER BY vs.created_at DESC
        `;
        
        const [services] = await db.query(query, [institutionIds]);
        
        console.log(' Found', services.length, 'Maintenance Services in history');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            try {
                const [items] = await db.query(`
                    SELECT 
                        siu.item_id,
                        siu.quantity_used as qty,
                        siu.notes as unit,
                        siu.consumption_type,
                        siu.amount_consumed,
                        pi.name,
                        pi.brand,
                        pi.color,
                        pi.ink_volume,
                        pi.toner_weight
                    FROM service_items_used siu
                    INNER JOIN printer_items pi ON siu.item_id = pi.id
                    WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
                `, [service.id]);
                
                service.items_used = items.map(item => ({
                    ...item,
                    display_amount: item.amount_consumed 
                        ? `${item.amount_consumed}${item.ink_volume && parseFloat(item.ink_volume) > 0 ? 'ml' : 'g'}`
                        : null
                }));
            } catch (itemError) {
                console.error(`Error fetching items for service ${service.id}:`, itemError);
                service.items_used = []; // Set empty array on error
            }
        }
        
        res.json({ services });
    } catch (error) {
        console.error(' Error fetching history for institution_admin:', error);
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
        
        console.log(' institution_admin', institution_adminId, 'approving service', serviceId);
        
        // Verify institution_admin owns this institution
        const [service] = await db.query(
            `SELECT vs.*, i.user_id as institution_admin_id
             FROM maintenance_services vs
             INNER JOIN institutions i ON vs.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
             WHERE vs.id = ?`,
            [serviceId]
        );
        
        console.log(' Service data retrieved:', {
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
        
        console.log(` institution_admin approving - service will be completed immediately`);
        
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
            `INSERT INTO service_approvals (service_id, service_type, approved_by, reviewed_at, status, institution_admin_notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'approved', ?)`,
            [serviceId, institution_adminId, notes || null]
        );
        
        // Deduct parts from inventory after institution_admin approval
        // Fetch items_used with consumption data from service_items_used table
        const [itemsUsedRows] = await db.query(`
            SELECT item_id, quantity_used as qty, consumption_type, amount_consumed
            FROM service_items_used
            WHERE service_id = ? AND service_type = 'maintenance_service'
        `, [serviceId]);
        
        if (itemsUsedRows && itemsUsedRows.length > 0) {
            console.log(' Deducting parts from inventory after approval...');
            console.log(' Parts to deduct:', JSON.stringify(itemsUsedRows, null, 2));
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
                    console.log(`\n Processing item_id: ${part.item_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Consumption type: ${part.consumption_type}`);
                    
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
                        
                        // Check if this is a consumable item with consumption tracking
                        if (part.consumption_type && (part.consumption_type === 'full' || part.consumption_type === 'partial')) {
                            // Get current inventory state
                            const [techInv] = await db.query(`
                                SELECT ti.quantity, ti.remaining_volume, ti.remaining_weight, ti.is_opened,
                                       pi.ink_volume, pi.toner_weight
                                FROM technician_inventory ti
                                JOIN printer_items pi ON ti.item_id = pi.id
                                WHERE ti.id = ?
                            `, [inventoryItem[0].id]);
                            
                            if (techInv.length > 0) {
                                const item = techInv[0];
                                const isInk = item.ink_volume && parseFloat(item.ink_volume) > 0;
                                const capacityPerPiece = isInk ? parseFloat(item.ink_volume) : parseFloat(item.toner_weight || 0);
                                
                            // Get current remaining (null means no item opened yet)
                            let currentRemaining = isInk ? 
                                (item.remaining_volume ? parseFloat(item.remaining_volume) : null) : 
                                (item.remaining_weight ? parseFloat(item.remaining_weight) : null);
                            
                            let newRemaining = currentRemaining;
                            let newQty = item.quantity;
                            
                            if (part.consumption_type === 'full') {
                                // FULL consumption - use a sealed bottle from stock
                                // Do NOT touch the currently opened bottle
                                if (newQty > 0) {
                                    newQty--; // Deduct one sealed bottle
                                    console.log(`  Full consumption: using 1 sealed bottle. Qty: ${item.quantity} → ${newQty}`);
                                } else {
                                    console.warn(`  ⚠️ No sealed bottles available for full consumption`);
                                }
                                // newRemaining stays the same - opened bottle is untouched
                            } else {
                                // PARTIAL consumption - use from the opened bottle
                                const amountToConsume = parseFloat(part.amount_consumed);
                                
                                // If no item is currently opened, open one first
                                if (currentRemaining === null && newQty > 0) {
                                    newRemaining = capacityPerPiece;
                                    console.log(`  Opening first ${isInk ? 'ink' : 'toner'} - set to ${newRemaining}${isInk ? 'ml' : 'g'}`);
                                }
                                
                                // Deduct from currently opened item
                                newRemaining = newRemaining - amountToConsume;
                                
                                // Handle consuming multiple items or depleting current one
                                while (newRemaining <= 0 && newQty > 0) {
                                    // Current item is depleted
                                    newQty--;
                                    if (newRemaining < 0 && newQty > 0) {
                                        // Need to open next item
                                        newRemaining = capacityPerPiece + newRemaining;
                                        console.log(`  Item depleted, opening next. Remaining: ${newRemaining}${isInk ? 'ml' : 'g'}, Qty: ${newQty}`);
                                    } else {
                                        // Exactly depleted or no more items
                                        newRemaining = 0;
                                        break;
                                    }
                                }
                                console.log(`  Partial consumption: ${amountToConsume}${isInk ? 'ml' : 'g'} consumed, remaining: ${currentRemaining} → ${newRemaining}`);
                            }
                            
                            // Update inventory - when remaining is 0 or less, reset to null and is_opened = 0
                            const updateColumn = isInk ? 'remaining_volume' : 'remaining_weight';
                            const finalRemaining = newRemaining > 0 ? newRemaining : null;
                            const finalIsOpened = newRemaining > 0 ? 1 : 0;
                            
                            await db.query(
                                `UPDATE technician_inventory 
                                 SET quantity = ?, 
                                     ${updateColumn} = ?,
                                     is_opened = ?,
                                     last_updated = NOW() 
                                 WHERE id = ?`,
                                [
                                    newQty,
                                    finalRemaining,
                                    finalIsOpened,
                                    inventoryItem[0].id
                                ]
                            );
                            
                            console.log(`    ${part.consumption_type} consumption complete. Quantity: ${item.quantity} → ${newQty}, Remaining: ${currentRemaining} → ${finalRemaining || 'null'}`);
                            }
                        } else {
                            // No consumption type (old data or non-consumables): deduct quantity as before
                            if (currentQty >= deductQty) {
                                const newQty = currentQty - deductQty;
                                await db.query(
                                    'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                    [newQty, inventoryItem[0].id]
                                );
                                console.log(`    Deducted ${deductQty} of "${inventoryItem[0].name}", new qty: ${newQty}`);
                            } else {
                                console.log(`    Insufficient stock: have ${currentQty}, need ${deductQty}`);
                            }
                        }
                    } else {
                        console.log(`    Item ID ${part.item_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(` Error deducting part:`, partError);
                }
            }
        } else {
            console.log(' No parts to deduct (items_used is null/empty)');
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
        
        console.log(' institution_admin', institution_adminId, 'rejecting service', serviceId);
        
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
            `INSERT INTO service_approvals (service_id, service_type, approved_by, reviewed_at, status, institution_admin_notes)
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
        
        console.log(' Found', services.length, 'Maintenance Services for institution_user');
        
        // Fetch items_used for each service from service_items_used table
        for (const service of services) {
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.notes as unit,
                    siu.consumption_type,
                    siu.amount_consumed,
                    pi.name,
                    pi.brand,
                    pi.color,
                    pi.ink_volume,
                    pi.toner_weight
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
            `, [service.id]);
            
            service.items_used = items.map(item => ({
                ...item,
                display_amount: item.amount_consumed 
                    ? `${item.amount_consumed}${item.ink_volume && parseFloat(item.ink_volume) > 0 ? 'ml' : 'g'}`
                    : null
            }));
        }
        
        res.json({ services });
    } catch (error) {
        console.error(' Error fetching services for institution_user:', error);
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
                sa.reviewed_at as approved_at,
                sa.status as approval_status,
                sa.institution_admin_notes as approval_notes,
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
            try {
                const [items] = await db.query(`
                    SELECT 
                        siu.item_id,
                        siu.quantity_used as qty,
                        siu.notes as unit,
                        siu.consumption_type,
                        siu.amount_consumed,
                        pi.name,
                        pi.brand,
                        pi.color,
                        pi.ink_volume,
                        pi.toner_weight
                    FROM service_items_used siu
                    INNER JOIN printer_items pi ON siu.item_id = pi.id
                    WHERE siu.service_id = ? AND siu.service_type = 'maintenance_service'
                `, [service.id]);
                
                service.items_used = items.map(item => ({
                    ...item,
                    display_amount: item.amount_consumed 
                        ? `${item.amount_consumed}${item.ink_volume && parseFloat(item.ink_volume) > 0 ? 'ml' : 'g'}`
                        : null
                }));
            } catch (itemError) {
                console.error(`Error fetching items for service ${service.id}:`, itemError);
                service.items_used = [];
            }
        }
        
        res.json({ services });
    } catch (error) {
        console.error(' Error fetching history for institution_user:', error);
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
        
        console.log('Service query result:', {
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
            `INSERT INTO service_approvals (service_id, service_type, approved_by, reviewed_at, status, institution_admin_notes)
             VALUES (?, 'maintenance_service', ?, NOW(), 'approved', ?)`,
            [serviceId, requester_id, notes || null]
        );
        
        // Deduct parts from inventory after approval
        // Fetch items_used from service_items_used table
        const [itemsUsedRows] = await db.query(`
            SELECT item_id, quantity_used as qty, consumption_type, amount_consumed
            FROM service_items_used
            WHERE service_id = ? AND service_type = 'maintenance_service'
        `, [serviceId]);
        
        if (itemsUsedRows && itemsUsedRows.length > 0) {
            console.log('[INVENTORY DEDUCTION] Deducting parts from inventory after institution_user approval...');
            console.log('[INVENTORY DEDUCTION] Parts to deduct:', JSON.stringify(itemsUsedRows, null, 2));
            console.log('[INVENTORY DEDUCTION] Technician ID:', service[0].technician_id);
            
            for (const part of itemsUsedRows) {
                try {
                    console.log(`\n[INVENTORY DEDUCTION] Processing item_id: ${part.item_id}`);
                    console.log(`   Qty to deduct: ${part.qty}, Consumption type: ${part.consumption_type}`);
                    
                    // Get current inventory state with volume/weight tracking
                    const [techInventory] = await db.query(`
                        SELECT ti.id, ti.quantity, ti.remaining_volume, ti.remaining_weight, ti.is_opened,
                               pp.name, pp.brand, pp.ink_volume, pp.toner_weight
                        FROM technician_inventory ti
                        INNER JOIN printer_items pp ON ti.item_id = pp.id
                        WHERE ti.technician_id = ? AND ti.item_id = ?
                        LIMIT 1`,
                        [service[0].technician_id, part.item_id]
                    );
                    
                    console.log(`Query result: ${techInventory.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
                    
                    if (techInventory.length > 0) {
                        const item = techInventory[0];
                        const isInk = item.ink_volume && parseFloat(item.ink_volume) > 0;
                        const capacityPerPiece = isInk ? parseFloat(item.ink_volume) : parseFloat(item.toner_weight || 0);
                        
                        // Check if this is a consumable item with consumption tracking
                        if (part.consumption_type && (part.consumption_type === 'full' || part.consumption_type === 'partial')) {
                            // Get current remaining volume/weight (null means no item opened yet)
                            let currentRemaining = isInk ? 
                                (item.remaining_volume ? parseFloat(item.remaining_volume) : null) : 
                                (item.remaining_weight ? parseFloat(item.remaining_weight) : null);
                            
                            let newRemaining = currentRemaining;
                            let newQty = item.quantity;
                            
                            if (part.consumption_type === 'full') {
                                // FULL consumption - use a sealed bottle from stock
                                // Do NOT touch the currently opened bottle
                                if (newQty > 0) {
                                    newQty--; // Deduct one sealed bottle
                                    console.log(`[INVENTORY]  Full consumption: using 1 sealed bottle. Qty: ${item.quantity} → ${newQty}`);
                                } else {
                                    console.warn(`[INVENTORY] ⚠️ No sealed bottles available for full consumption`);
                                }
                                // newRemaining stays the same - opened bottle is untouched
                            } else {
                                // PARTIAL consumption - use from the opened bottle
                                const amountToConsume = parseFloat(part.amount_consumed);
                                
                                // If no item is currently opened, open one first
                                if (currentRemaining === null && newQty > 0) {
                                    newRemaining = capacityPerPiece;
                                    console.log(`[INVENTORY]  Opening first ${isInk ? 'ink' : 'toner'} - set to ${newRemaining}${isInk ? 'ml' : 'g'}`);
                                }
                                
                                // Deduct from currently opened item
                                newRemaining = newRemaining - amountToConsume;
                                
                                // Handle consuming multiple items or depleting current one
                                while (newRemaining <= 0 && newQty > 0) {
                                    // Current item is depleted
                                    newQty--;
                                    if (newRemaining < 0 && newQty > 0) {
                                        // Need to open next item
                                        newRemaining = capacityPerPiece + newRemaining;
                                        console.log(`[INVENTORY]  Item depleted, opening next. Remaining: ${newRemaining}${isInk ? 'ml' : 'g'}, Qty: ${newQty}`);
                                    } else {
                                        // Exactly depleted or no more items
                                        newRemaining = 0;
                                        break;
                                    }
                                }
                                console.log(`[INVENTORY]  Partial consumption: ${amountToConsume}${isInk ? 'ml' : 'g'} consumed, remaining: ${currentRemaining} → ${newRemaining}`);
                            }
                            
                            // Update inventory - when remaining is 0 or less, reset to null and is_opened = 0
                            const updateColumn = isInk ? 'remaining_volume' : 'remaining_weight';
                            const finalRemaining = newRemaining > 0 ? newRemaining : null;
                            const finalIsOpened = newRemaining > 0 ? 1 : 0;
                            
                            await db.query(`
                                UPDATE technician_inventory 
                                SET quantity = ?,
                                    ${updateColumn} = ?,
                                    is_opened = ?,
                                    last_updated = NOW()
                                WHERE id = ?`,
                                [
                                    newQty,
                                    finalRemaining,
                                    finalIsOpened,
                                    item.id
                                ]
                            );
                            
                            console.log(`[INVENTORY DEDUCTION] ✅ ${part.consumption_type} consumption complete. Quantity: ${item.quantity} → ${newQty}, Remaining: ${currentRemaining} → ${finalRemaining || 'null'}`);
                            
                        } else {
                            // No consumption type (old data or non-consumables): deduct quantity as before
                            const currentQty = item.quantity;
                            const deductQty = parseInt(part.qty) || 0;
                            
                            if (currentQty >= deductQty) {
                                const newQty = currentQty - deductQty;
                                await db.query(
                                    'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
                                    [newQty, item.id]
                                );
                                console.log(`[INVENTORY DEDUCTION]  Deducted ${deductQty} of "${item.name}", new qty: ${newQty}`);
                            } else {
                                console.log(`[INVENTORY WARNING]  Insufficient stock: have ${currentQty}, need ${deductQty}`);
                            }
                        }
                    } else {
                        console.log(`[INVENTORY WARNING]  Item ID ${part.item_id} not found in technician's inventory`);
                    }
                } catch (partError) {
                    console.error(`[INVENTORY ERROR]  Error deducting part:`, partError);
                }
            }
        } else {
            console.log('[INVENTORY DEDUCTION] No parts to deduct (items_used is null/empty)');
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
        
        console.log(' institution_user', requester_id, 'rejecting service', serviceId);
        
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
            `INSERT INTO service_approvals (service_id, service_type, approved_by, reviewed_at, status, institution_admin_notes)
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
        
        console.log(`Fetching monthly billing for institution_admin ${institution_adminId}: ${year}-${month}`);
        
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
                DATE_FORMAT(CONVERT_TZ(ms.completed_at, '+00:00', '+08:00'), '%Y-%m-%d') as service_date,
                'maintenance_service' as service_type
            FROM maintenance_services ms
            INNER JOIN printers p ON ms.printer_id = p.id
            INNER JOIN institutions i ON ms.institution_id COLLATE utf8mb4_0900_ai_ci = i.institution_id
            INNER JOIN users u_tech ON ms.technician_id = u_tech.id
            WHERE ms.institution_id IN (?)
                AND ms.status = 'completed'
                AND YEAR(CONVERT_TZ(ms.completed_at, '+00:00', '+08:00')) = ?
                AND MONTH(CONVERT_TZ(ms.completed_at, '+00:00', '+08:00')) = ?
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
                sr.completion_photo_url,
                p.name as printer_name,
                p.brand,
                p.model,
                p.serial_number,
                p.location,
                p.department,
                i.name as institution_name,
                CONCAT(u_tech.first_name, ' ', u_tech.last_name) as technician_name,
                u_tech.email as technician_email,
                DATE_FORMAT(CONVERT_TZ(sr.completed_at, '+00:00', '+08:00'), '%Y-%m-%d') as service_date,
                'service_request' as service_type
            FROM service_requests sr
            INNER JOIN printers p ON sr.printer_id = p.id
            INNER JOIN institutions i ON sr.institution_id = i.institution_id
            INNER JOIN users u_tech ON sr.technician_id = u_tech.id
            WHERE sr.institution_id IN (?)
                AND sr.status = 'completed'
                AND YEAR(CONVERT_TZ(sr.completed_at, '+00:00', '+08:00')) = ?
                AND MONTH(CONVERT_TZ(sr.completed_at, '+00:00', '+08:00')) = ?
            ORDER BY sr.completed_at DESC
        `;
        
        const [maintenanceServices] = await db.query(maintenanceQuery, [institutionIds, year, month]);
        const [serviceRequests] = await db.query(serviceRequestsQuery, [institutionIds, year, month]);
        
        console.log(`[Monthly Billing] Found ${maintenanceServices.length} maintenance services`);
        console.log(`[Monthly Billing] Found ${serviceRequests.length} service requests`);
        if (serviceRequests.length > 0) {
            console.log(`[Monthly Billing] Sample service_dates:`, serviceRequests.slice(0, 3).map(s => s.service_date));
        }
        
        // Combine both types of services
        const services = [...maintenanceServices, ...serviceRequests].sort((a, b) => 
            new Date(b.completed_at) - new Date(a.completed_at)
        );
        
        // Fetch items_used for all services from service_items_used table
        for (const service of services) {
            const serviceType = service.service_type === 'maintenance_service' ? 'maintenance_service' : 'service_request';
            const [items] = await db.query(`
                SELECT 
                    siu.item_id,
                    siu.quantity_used as qty,
                    siu.consumption_type,
                    siu.amount_consumed,
                    siu.notes,
                    pi.name,
                    pi.brand,
                    pi.color,
                    pi.category,
                    pi.ink_volume,
                    pi.toner_weight
                FROM service_items_used siu
                INNER JOIN printer_items pi ON siu.item_id = pi.id
                WHERE siu.service_id = ? AND siu.service_type = ?
            `, [service.id, serviceType]);
            
            // Format items with display_amount for consumption
            service.items_used = items.map(item => ({
                ...item,
                display_amount: item.consumption_type === 'partial' 
                    ? `${item.amount_consumed}${item.category === 'ink-bottle' || item.category === 'ink-cartridge' ? 'ml' : 'g'}`
                    : item.consumption_type === 'full'
                    ? `Full (${item.ink_volume || item.toner_weight}${item.ink_volume ? 'ml' : 'g'})`
                    : `${item.qty} pieces`
            }));
        }
        
        // Calculate summary statistics
        const uniquePrinters = new Set(services.map(s => s.printer_id)).size;
        const totalServices = services.length;
        
        // Group services by date for calendar view
        const dailyServicesMap = {};
        services.forEach(service => {
            // service_date is now a string 'YYYY-MM-DD' directly from DATE_FORMAT in MySQL
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







