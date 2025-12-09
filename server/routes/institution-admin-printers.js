/**
 * institution_admin Printer Routes
 * API endpoints for institution_admins to manage printers assigned to them
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authenticateinstitution_admin } = require('../middleware/auth');

/**
 * @route GET /api/institution_admins/:id/printers
 * @desc Get printers assigned to a specific institution_admin
 * @access Private (institution_admin only)
 */
router.get('/:id/printers', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.params.id;
        
        // Verify that the logged-in user matches the requested institution_admin ID
        if (req.user.id.toString() !== institution_adminId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Optional filters from query parameters
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        // Build query with filters
        let query = `
            SELECT ip.*, i.name as institution_name, pa.assignment_id
            FROM institution_printers ip
            JOIN institutions i ON ip.institution_id = i.id
            JOIN printer_assignments pa ON ip.printer_id = pa.printer_id
            WHERE pa.user_id = ? AND pa.status = 'active'
        `;
        
        const queryParams = [institution_adminId];
        
        // Add search filter if provided
        if (search) {
            query += ` AND (ip.model LIKE ? OR ip.serial_number LIKE ? OR i.name LIKE ?)`;
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        // Add status filter if provided
        if (status) {
            query += ` AND ip.status = ?`;
            queryParams.push(status);
        }
        
        // Execute the query
        const [printers] = await db.query(query, queryParams);
        
        res.json(printers);
    } catch (error) {
        console.error('Error fetching institution_admin printers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/printers/:id
 * @desc Get details of a specific printer
 * @access Private (Admin or assigned institution_admin)
 */
router.get('/:id/printer/:printerId', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.params.id;
        const printerId = req.params.printerId;
        
        // Verify that the logged-in user matches the requested institution_admin ID
        if (req.user.id.toString() !== institution_adminId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get printer details
        const [printers] = await db.query(`
            SELECT ip.*, i.name as institution_name
            FROM institution_printers ip
            JOIN institutions i ON ip.institution_id = i.id
            WHERE ip.printer_id = ?
        `, [printerId]);
        
        if (printers.length === 0) {
            return res.status(404).json({ message: 'Printer not found' });
        }
        
        const printer = printers[0];
        
        // If user is not admin, verify they are assigned to this printer
        if (req.user.role !== 'admin') {
            const [assignments] = await db.query(`
                SELECT * FROM printer_assignments
                WHERE printer_id = ? AND user_id = ? AND status = 'active'
            `, [printerId, institution_adminId]);
            
            if (assignments.length === 0) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        
        res.json(printer);
    } catch (error) {
        console.error('Error fetching printer details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/institution_admins/:id/printers/:printerId/service-history
 * @desc Get service history for a specific printer
 * @access Private (Admin or assigned institution_admin)
 */
router.get('/:id/printer/:printerId/service-history', authenticateinstitution_admin, async (req, res) => {
    try {
        const institution_adminId = req.params.id;
        const printerId = req.params.printerId;
        
        // Verify that the logged-in user matches the requested institution_admin ID
        if (req.user.id.toString() !== institution_adminId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // If user is not admin, verify they are assigned to this printer
        if (req.user.role !== 'admin') {
            const [assignments] = await db.query(`
                SELECT * FROM printer_assignments
                WHERE printer_id = ? AND user_id = ? AND status = 'active'
            `, [printerId, institution_adminId]);
            
            if (assignments.length === 0) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        
        // Get service history
        const [history] = await db.query(`
            SELECT sh.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as technician_name
            FROM service_history sh
            LEFT JOIN users u ON sh.technician_id = u.id
            WHERE sh.printer_id = ?
            ORDER BY sh.service_date DESC
        `, [printerId]);
        
        res.json(history);
    } catch (error) {
        console.error('Error fetching printer service history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/service-requests
 * @desc Create a new service request for a printer
 * @access Private (institution_admin only)
 */
router.post('/service-requests', authenticateinstitution_admin, async (req, res) => {
    try {
        // Temporary debug log to identify duplicate/alternate POSTs
        try {
            console.log('[DEBUG] route=institution_admin-printers POST hit', { time: new Date().toISOString(), path: req.originalUrl, user: req.user ? { id: req.user.id, role: req.user.role } : null, bodySummary: Object.keys(req.body).slice(0,8) });
        } catch (le) {
            console.warn('[DEBUG] failed to log institution_admin-printers entry:', le && le.message);
        }
    const { printer_id, type, priority, description, location } = req.body;
        
        // Validate required fields
        if (!printer_id || !type || !priority || !description) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Verify institution_admin is assigned to this printer
        const [assignments] = await db.query(`
            SELECT * FROM printer_assignments
            WHERE printer_id = ? AND user_id = ? AND status = 'active'
        `, [printer_id, req.user.id]);
        
        if (assignments.length === 0) {
            return res.status(403).json({ message: 'You are not assigned to this printer' });
        }
        
        // Get institution owned by this institution_admin
        const [institutionRows] = await db.query(
            'SELECT institution_id FROM institutions WHERE user_id = ? LIMIT 1',
            [req.user.id]
        );
        
        const institution_id = institutionRows.length > 0 ? institutionRows[0].institution_id : null;
        
        if (!institution_id) {
            return res.status(400).json({ error: 'No institution found for this user' });
        }

        // Generate a new request number (e.g., PRINTER-<id>-YYYYMMDDHHMMSS)
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
        const requestNumber = `PRINTER-${printer_id}-${dateStr}`;

        // Debug: print all values to be inserted
        console.log('Inserting service request:', {
            request_number: requestNumber,
            printer_id: printer_id,
            institution_id: institution_id,
            requested_by: req.user.id,
            priority,
            status: 'pending',
            location: location || 'Unknown',
            description
        });

        // Insert the service request with request_number and required fields
        const [result] = await db.query(`
            INSERT INTO service_requests 
            (request_number, printer_id, institution_id, requested_by, priority, status, location, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            requestNumber,
            printer_id,
            institution_id,
            req.user.id,
            priority,
            'pending',
            location || 'Unknown',
            description
        ]);

        // Update the printer status to reflect that it needs service
        await db.query(`
            UPDATE institution_printers
            SET status = 'needs_service'
            WHERE printer_id = ?
        `, [printer_id]);

        res.status(201).json({
            message: 'Service request created successfully',
            request_id: result.insertId,
            request_number: requestNumber,
            printer_id: printer_id,
            institution_id: institution_id,
            requested_by: req.user.id,
            priority,
            status: 'pending',
            location: location || 'Unknown',
            description
        });
    } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;



