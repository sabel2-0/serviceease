
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateCoordinator, auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Get service requests for a specific institution
router.get('/institution/:institution_id', authenticateCoordinator, async (req, res) => {
    try {
        console.log('Displaying service requests for institution:', req.params.institution_id);
        const institution_id = req.params.institution_id;
        if (!institution_id) {
            return res.status(400).json({ error: 'Institution ID is required.' });
        }
        const [serviceRequests] = await db.query(
            `SELECT sr.*, i.name AS institution_name, ii.name AS printer_name
             FROM service_requests sr
             LEFT JOIN institutions i ON sr.institution_id = i.id
             LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
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

// Get all service requests (for coordinators)
router.get('/', authenticateCoordinator, async (req, res) => {
    try {
        // You can filter by coordinator_id if needed, e.g., req.user.id
        const [serviceRequests] = await db.query(
            `SELECT sr.*, i.name AS institution_name, ii.name AS printer_name
             FROM service_requests sr
             LEFT JOIN institutions i ON sr.institution_id = i.id
             LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
             ORDER BY sr.created_at DESC`
        );
        res.json(serviceRequests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests.' });
    }
});

// Create a new service request
// Allow authenticated users (requesters) to create service requests. The server will
// derive institution_id from the requester, validate the selected printer is assigned
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
            inventory_item_id,
            // institution_id may be provided by coordinators/admins, but for requesters
            // we will derive it server-side to avoid FK mismatches.
            institution_id: institutionIdFromBody,
            priority,
            description,
            location,
            status
        } = req.body;

        // requester info from auth
        const actor = req.user || {};
        const actorId = actor.id;
        const actorRole = actor.role;
        
        // The user who submitted this request (requester or coordinator)
        const requested_by_user_id = actorId;

        // Determine institution_id to use:
        // - For requesters: Get institution from their printer assignment
        // - For coordinators: Get institution they own (institutions.user_id)
        // - For admins: Can use provided institution_id
        let institution_id = null;
        
        if (actorRole === 'requester') {
            // Requesters don't own institutions - get from their printer assignment
            const [assignRows] = await db.query(
                'SELECT institution_id FROM user_printer_assignments WHERE user_id = ? LIMIT 1',
                [actorId]
            );
            if (assignRows && assignRows.length > 0 && assignRows[0].institution_id) {
                institution_id = assignRows[0].institution_id;
            }
        } else if (actorRole === 'coordinator' || actorRole === 'technician' || actorRole === 'operations_officer') {
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
        if (!inventory_item_id || !description) {
            return res.status(400).json({ error: 'Missing required fields: inventory_item_id and description are required' });
        }

        // If actor is a requester, ensure the selected inventory_item_id is assigned to that user
        if (actorRole === 'requester') {
            const [assignRows] = await db.query(
                'SELECT id FROM user_printer_assignments WHERE user_id = ? AND inventory_item_id = ? LIMIT 1',
                [actorId, inventory_item_id]
            );
            if (!assignRows || assignRows.length === 0) {
                return res.status(400).json({ error: 'Selected printer is not assigned to you' });
            }
        }



        // Validate inventory item exists and belongs to institution
        const [inventoryItem] = await db.query(
            `SELECT ii.id 
             FROM inventory_items ii
             JOIN client_printer_assignments cpa ON ii.id = cpa.inventory_item_id
             WHERE ii.id = ? AND cpa.institution_id = ? AND ii.category = 'printer'`,
            [inventory_item_id, institution_id]
        );

        if (!inventoryItem.length) {
            return res.status(400).json({ error: 'Invalid printer selected for this institution' });
        }

        // If no assigned technician found, return clear message per requirements
        if (assignedTechnicianIds.length === 0) {
            return res.status(400).json({ error: 'No active technician is linked to your institution. Please contact your coordinator.' });
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
            inventory_item_id,
            institution_id,
            requested_by_user_id,
            assigned_technician_id: assignedTechnicianId,
            priority,
            status: status || 'new',
            location: location || 'Unknown',
            description
        });

        // Insert into service_requests table within a transaction to ensure FK consistency
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [result] = await conn.query(
                `INSERT INTO service_requests (
                    request_number, institution_id, requested_by_user_id, assigned_technician_id, priority, status, location, description, created_at, updated_at, inventory_item_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
                [
                    requestNumber,
                    institution_id,
                    requested_by_user_id,
                    assignedTechnicianId,
                    normalizedPriority,
                    normalizedStatus,
                    location || 'Unknown',
                    description,
                    inventory_item_id
                ]
            );
            await conn.commit();
            // result available
            // Create notifications outside transaction or after commit
            // Note: Admin notifications are ONLY for coordinator registrations and technician parts requests
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
                            sender_id: requested_by_user_id || actorId || null,
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
                requested_by_user_id,
                assigned_technician_id: assignedTechnicianId,
                priority: normalizedPriority,
                status: normalizedStatus,
                location: location || 'Unknown',
                description,
                inventory_item_id,
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
        // Note: Admin notifications are ONLY for coordinator registrations and technician parts requests
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
                        sender_id: requested_by_user_id || null,
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
            requested_by_user_id,
            assigned_technician_id: assignedTechnicianId,
            priority,
            status: status || 'new',
            location: location || 'Unknown',
            description,
            inventory_item_id,
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

module.exports = router;
