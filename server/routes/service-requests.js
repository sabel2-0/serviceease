
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateinstitution_admin, auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Get service requests for a specific institution
router.get('/institution/:institution_id', authenticateinstitution_admin, async (req, res) => {
    try {
        console.log('Displaying service requests for institution:', req.params.institution_id);
        const institution_id = req.params.institution_id;
        if (!institution_id) {
            return res.status(400).json({ error: 'Institution ID is required.' });
        }
        const [serviceRequests] = await db.query(
            `SELECT sr.*, 
                    i.name AS institution_name, 
                    ii.name AS printer_name,
                    ii.brand AS printer_brand,
                    ii.model AS printer_model,
                    ii.location AS location,
                    sa.approved_by,
                    approver.first_name AS approver_first_name,
                    approver.last_name AS approver_last_name,
                    approver.role AS approver_role
             FROM service_requests sr
             LEFT JOIN institutions i ON sr.institution_id = i.institution_id
             LEFT JOIN printers ii ON sr.printer_id = ii.id
             LEFT JOIN service_approvals sa ON sr.id = sa.service_request_id
             LEFT JOIN users approver ON sa.approved_by = approver.id
             WHERE sr.institution_id = ?
             ORDER BY sr.created_at DESC`,
            [institution_id]
        );
        res.json(serviceRequests);
    } catch (error) {
        console.error('Error fetching service requests by institution:', error);
        res.status(500).json({ error: 'Failed to fetch service requests.' });
    }
});

// Get all service requests (for institution_admins)
router.get('/', authenticateinstitution_admin, async (req, res) => {
    try {
        // You can filter by institution_admin_id if needed, e.g., req.user.id
        const [serviceRequests] = await db.query(
            `SELECT sr.*, i.name AS institution_name, ii.name AS printer_name
             FROM service_requests sr
             LEFT JOIN institutions i ON sr.institution_id = i.id
             LEFT JOIN printers ii ON sr.printer_id = ii.id
             ORDER BY sr.created_at DESC`
        );
        res.json(serviceRequests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests.' });
    }
});

// Create a new service request
// Allow authenticated users (institution_users) to create service requests. The server will
// derive institution_id from the institution_user, validate the selected printer is assigned
// to that user, and determine the assigned technician for the institution.
router.post('/', auth, async (req, res) => {
    // SERVICE REQUEST ROUTE HIT (canonical service-requests handler)
    try {
        console.log('[DEBUG] route=service-requests POST hit', { time: new Date().toISOString(), path: req.originalUrl, user: req.user ? { id: req.user.id, role: req.user.role } : null, bodySummary: Object.keys(req.body).slice(0,8) });
    } catch (logErr) {
        console.warn('[DEBUG] failed to log service-requests entry:', logErr && logErr.message);
    }
    try {
        const {
            printer_id,
            // institution_id may be provided by institution_admins/admins, but for institution_users
            // we will derive it server-side to avoid FK mismatches.
            institution_id: institutionIdFromBody,
            priority,
            description,
            location: rawLocation,
            department: rawDepartment,
            status
        } = req.body;
        
        // Normalize location and department: convert empty string to null
        const location = rawLocation && rawLocation.trim() ? rawLocation.trim() : null;
        const department = rawDepartment && rawDepartment.trim() ? rawDepartment.trim() : null;

        // institution_user info from auth
        const actor = req.user || {};
        const actorId = actor.id;
        const actorRole = actor.role;
        
        // The user who submitted this request (institution_user or institution_admin)
        const requested_by = actorId;

        // Determine institution_id to use:
        // - For institution_users: Get institution from their printer assignment
        // - For institution_admins: Get institution they own (institutions.user_id)
        // - For admins: Can use provided institution_id
        let institution_id = null;
        
        if (actorRole === 'institution_user') {
            // institution_users don't own institutions - get from their printer assignment
            const [assignRows] = await db.query(
                'SELECT institution_id FROM user_printer_assignments WHERE user_id = ? LIMIT 1',
                [actorId]
            );
            if (assignRows && assignRows.length > 0 && assignRows[0].institution_id) {
                institution_id = assignRows[0].institution_id;
            }
        } else if (actorRole === 'institution_admin' || actorRole === 'technician' || actorRole === 'operations_officer') {
            // Get institution owned by this user
            const [instRows] = await db.query(
                'SELECT institution_id FROM institutions WHERE user_id = ? LIMIT 1',
                [actorId]
            );
            if (instRows && instRows.length > 0 && instRows[0].institution_id) {
                institution_id = instRows[0].institution_id;
            }
        } else if (actorRole === 'admin') {
            // Admin can provide institution_id or use their owned institution
            if (institutionIdFromBody) {
                institution_id = institutionIdFromBody;
            } else {
                const [instRows] = await db.query(
                    'SELECT institution_id FROM institutions WHERE user_id = ? LIMIT 1',
                    [actorId]
                );
                if (instRows && instRows.length > 0) {
                    institution_id = instRows[0].institution_id;
                }
            }
        }

        if (!institution_id) return res.status(400).json({ error: 'Could not determine institution for this request' });

        // Find active technicians assigned to this institution
        const [techRows] = await db.query(
            'SELECT technician_id FROM technician_assignments WHERE institution_id = ? AND is_active = TRUE',
            [institution_id]
        );
        // Build list of assigned technician IDs (may be empty)
        const assignedTechnicianIds = (techRows || []).map(r => r.technician_id).filter(Boolean);
        let assignedTechnicianId = assignedTechnicianIds.length > 0 ? assignedTechnicianIds[0] : null; // keep first for response

        // Validate required fields
        if (!printer_id || !description) {
            return res.status(400).json({ error: 'Missing required fields: printer_id and description are required' });
        }

        // If actor is a institution_user, ensure the selected printer_id is assigned to that user
        if (actorRole === 'institution_user') {
            const [assignRows] = await db.query(
                'SELECT id FROM user_printer_assignments WHERE user_id = ? AND printer_id = ? LIMIT 1',
                [actorId, printer_id]
            );
            if (!assignRows || assignRows.length === 0) {
                return res.status(400).json({ error: 'Selected printer is not assigned to you' });
            }
        }



        // Validate inventory item exists and belongs to institution
        const [inventoryItem] = await db.query(
            `SELECT ii.id 
             FROM printers ii
             JOIN institution_printer_assignments cpa ON ii.id = cpa.printer_id
             WHERE ii.id = ? AND cpa.institution_id = ? AND ii.category = 'printer'`,
            [printer_id, institution_id]
        );

        if (!inventoryItem.length) {
            return res.status(400).json({ error: 'Invalid printer selected for this institution' });
        }

        // Check if there's already an active service request for this printer
        const [activeRequests] = await db.query(
            `SELECT sr.id, sr.request_number, sr.status, ii.name as printer_name
             FROM service_requests sr
             LEFT JOIN printers ii ON sr.printer_id = ii.id
             WHERE sr.printer_id = ? 
             AND sr.status IN ('pending', 'assigned', 'in_progress', 'pending_approval')
             LIMIT 1`,
            [printer_id]
        );

        if (activeRequests.length > 0) {
            const existing = activeRequests[0];
            return res.status(400).json({ 
                error: `There is already an active service request (${existing.request_number}) for this printer. Please wait for it to be completed before submitting a new request.`,
                activeRequest: {
                    id: existing.id,
                    request_number: existing.request_number,
                    status: existing.status,
                    printer_name: existing.printer_name
                }
            });
        }

        // Check if there's a pending maintenance service for this printer
        console.log('🔍 [SERVICE REQUEST CHECK] Checking for pending maintenance services on printer_id:', printer_id);
        const [pendingMaintenance] = await db.query(
            `SELECT ms.id, CONCAT('MS-', ms.id) as service_number, ms.status, ii.name as printer_name
             FROM maintenance_services ms
             LEFT JOIN printers ii ON ms.printer_id = ii.id
             WHERE ms.printer_id = ? 
             AND ms.status IN ('pending', 'pending_approval', 'pending_institution_admin', 'pending_institution_user')
             LIMIT 1`,
            [printer_id]
        );

        console.log('📊 [SERVICE REQUEST CHECK] Pending maintenance check results:', {
            printer_id,
            found: pendingMaintenance.length > 0,
            count: pendingMaintenance.length,
            services: pendingMaintenance
        });

        if (pendingMaintenance.length > 0) {
            const existing = pendingMaintenance[0];
            console.log('❌ [SERVICE REQUEST CHECK] BLOCKING service request - pending maintenance service exists:', existing.service_number);
            return res.status(400).json({ 
                error: `This printer has a pending maintenance service (${existing.service_number}) that must be approved first. Please wait for it to be completed before submitting a new service request.`,
                pendingMaintenance: {
                    service_number: existing.service_number,
                    status: existing.status,
                    printer_name: existing.printer_name
                }
            });
        }

        console.log('✅ [SERVICE REQUEST CHECK] No pending maintenance services found, allowing service request submission');

        // If no assigned technician found, return clear message per requirements
        if (assignedTechnicianIds.length === 0) {
            return res.status(400).json({ error: 'No active technician is linked to your institution. Please contact your institution_admin.' });
        }

        // Normalize status and priority to match database enum values
        const statusMap = {
            'new': 'pending',
            'pending': 'pending',
            'assigned': 'assigned',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'on_hold': 'on_hold'
        };
        const priorityMap = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'urgent': 'high'
        };

        const normalizedStatus = status ? (statusMap[String(status).toLowerCase()] || 'pending') : 'pending';
        const normalizedPriority = priority ? (priorityMap[String(priority).toLowerCase()] || 'medium') : 'medium';

        // Generate a new request number in format: SR-YYYY-###### (e.g., SR-2025-000001)
        const now = new Date();
        const year = now.getFullYear();
        
        // Get the highest request number for this year
        const [maxResult] = await db.query(
            `SELECT MAX(CAST(SUBSTRING_INDEX(request_number, '-', -1) AS UNSIGNED)) as max_num 
             FROM service_requests 
             WHERE request_number LIKE ?`,
            [`SR-${year}-%`]
        );
        
        const maxNum = maxResult[0]?.max_num || 0;
        const nextNum = maxNum + 1;
        const requestNumber = `SR-${year}-${String(nextNum).padStart(6, '0')}`;

        // Log the generated request number and all inserted data
        console.log('Generated request_number:', requestNumber);
        console.log('Inserting service request with data:', {
            request_number: requestNumber,
            printer_id,
            institution_id,
            requested_by,
            priority,
            status: status || 'new',
            location: location,
            description
        });

        // Update printer location and department if provided
        if (location !== null || department !== null) {
            const updateFields = [];
            const updateValues = [];
            
            if (location !== null) {
                updateFields.push('location = ?');
                updateValues.push(location);
            }
            if (department !== null) {
                updateFields.push('department = ?');
                updateValues.push(department);
            }
            
            if (updateFields.length > 0) {
                updateValues.push(printer_id);
                await db.query(
                    `UPDATE printers SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
                console.log('Updated printer location/department:', { printer_id, location, department });
            }
        }

        // Insert into service_requests table within a transaction to ensure FK consistency
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [result] = await conn.query(
                `INSERT INTO service_requests (
                    request_number, institution_id, requested_by, priority, status, description, created_at, printer_id
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
                [
                    requestNumber,
                    institution_id,
                    requested_by,
                    normalizedPriority,
                    normalizedStatus,
                    description,
                    printer_id
                ]
            );
            await conn.commit();
            // result available
            // Create notifications outside transaction or after commit
            // Note: Admin notifications are ONLY for institution_admin registrations and technician parts requests
            try {
                const notifTitle = 'New Service Request Assigned';

                if (assignedTechnicianIds.length > 0) {
                    for (const techId of assignedTechnicianIds) {
                        const notifMessage = `Request ${requestNumber} created and assigned to you: ${description ? description.substring(0,120) : ''}`;
                        await createNotification({
                            title: notifTitle,
                            message: notifMessage,
                            type: 'service_request',
                            user_id: techId,
                            sender_id: requested_by || actorId || null,
                            reference_type: 'service_request',
                            reference_id: result.insertId,
                            priority: priority || 'medium'
                        });
                    }
                    console.log(`Created notifications for ${assignedTechnicianIds.length} assigned technician(s)`);
                } else {
                    // No assigned technicians: Do NOT create admin notification per requirements
                    console.log('No assigned technicians for service request - no notification created');
                }
            } catch (notifErr) {
                console.error('Failed to create notification(s) for new service request:', notifErr);
            }

            res.status(201).json({
                message: 'Service request created successfully',
                request_id: result.insertId,
                request_number: requestNumber,
                institution_id,
                requested_by,
                technician_id: assignedTechnicianId,
                priority: normalizedPriority,
                status: normalizedStatus,
                location: location,
                description,
                printer_id,
                created_at: now,
                updated_at: now
            });
            return;
        } catch (txErr) {
            try { await conn.rollback(); } catch (e) { console.error('Rollback failed', e); }
            throw txErr;
        } finally {
            try { conn.release(); } catch (e) {}
        }

        // Create in-app notifications for assigned technicians only
        // Note: Admin notifications are ONLY for institution_admin registrations and technician parts requests
        try {
            const notifTitle = 'New Service Request Assigned';

            if (assignedTechnicianIds.length > 0) {
                // Notify each assigned technician individually
                for (const techId of assignedTechnicianIds) {
                    const notifMessage = `Request ${requestNumber} created and assigned to you: ${description ? description.substring(0,120) : ''}`;
                    await createNotification({
                        title: notifTitle,
                        message: notifMessage,
                        type: 'service_request',
                        user_id: techId,
                        sender_id: requested_by || null,
                        reference_type: 'service_request',
                        reference_id: result.insertId,
                        priority: priority || 'medium'
                    });
                }
                console.log(`Created notifications for ${assignedTechnicianIds.length} assigned technician(s)`);
            } else {
                // No assigned technicians: Do NOT create admin notification per requirements
                console.log('No assigned technicians for service request - no notification created');
            }
        } catch (notifErr) {
            console.error('Failed to create notification(s) for new service request:', notifErr);
            // don't fail the request creation if notification fails
        }

        // Return the created request including the request number and all relevant data
        res.status(201).json({
            message: 'Service request created successfully',
            request_id: result.insertId,
            request_number: requestNumber,
            institution_id,
            requested_by,
            technician_id: assignedTechnicianId,
            priority,
            status: status || 'new',
            location: location,
            description,
            printer_id,
            created_at: now,
            updated_at: now
        });
    } catch (error) {
        console.error('Service request creation error:', error);
        
        // Handle specific MySQL errors
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Invalid reference: Please check printer and institution IDs' });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Duplicate request number. Please try again.' });
        }
        
        res.status(500).json({ error: 'Failed to create service request. Please try again.' });
    }
});

// Get single service request by ID (for admins/institution_admins)
router.get('/:id', auth, async (req, res) => {
    try {
        console.log('[DEBUG] GET /api/service-requests/:id hit', { id: req.params.id, user: req.user });
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Build query based on user role
        let whereClause = 'sr.id = ?';
        let params = [id];
        
        // institution_admins can only see their own institution's requests
        if (userRole === 'institution_admin') {
            whereClause += ' AND i.user_id = ?';
            params.push(userId);
        }
        // institution_users can only see requests they created
        else if (userRole === 'institution_user') {
            whereClause += ' AND sr.requested_by = ?';
            params.push(userId);
        }
        // admins and operations_officers can see all
        
        const [rows] = await db.query(`
            SELECT 
                sr.*, 
                CONCAT('SR-', YEAR(sr.created_at), '-', LPAD(sr.id, 4, '0')) as request_number,
                i.name as institution_name,
                p.name as printer_name,
                p.brand,
                p.model,
                p.serial_number,
                CONCAT(t.first_name, ' ', t.last_name) as technician_name,
                t.first_name as technician_first_name,
                t.last_name as technician_last_name,
                CONCAT(u.first_name, ' ', u.last_name) as requested_by_name,
                u.first_name as institution_user_first_name,
                u.last_name as institution_user_last_name,
                u.email as institution_user_email,
                u.role as institution_user_role
            FROM service_requests sr
            LEFT JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN printers p ON sr.printer_id = p.id
            LEFT JOIN users t ON sr.technician_id = t.id
            LEFT JOIN users u ON sr.requested_by = u.id
            WHERE ${whereClause}
        `, params);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        const request = rows[0];
        
        // Get parts used
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
            FROM service_parts_used spu
            JOIN printer_parts pp ON spu.part_id = pp.id
            LEFT JOIN users u ON spu.used_by = u.id
            WHERE spu.service_request_id = ?
            ORDER BY spu.used_at DESC
        `, [id]);
        
        request.parts_used = partsUsed;
        
        res.json(request);
    } catch (error) {
        console.error('Error fetching service request details:', error);
        res.status(500).json({ error: 'Failed to fetch service request details' });
    }
});

module.exports = router;





