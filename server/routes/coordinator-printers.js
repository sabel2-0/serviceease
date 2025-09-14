/**
 * Coordinator Printer Routes
 * API endpoints for coordinators to manage printers assigned to them
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authenticateCoordinator } = require('../middleware/auth');

/**
 * @route GET /api/coordinators/:id/printers
 * @desc Get printers assigned to a specific coordinator
 * @access Private (Coordinator only)
 */
router.get('/:id/printers', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        
        // Verify that the logged-in user matches the requested coordinator ID
        if (req.user.id.toString() !== coordinatorId && req.user.role !== 'admin') {
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
        
        const queryParams = [coordinatorId];
        
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
        console.error('Error fetching coordinator printers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/printers/:id
 * @desc Get details of a specific printer
 * @access Private (Admin or assigned coordinator)
 */
router.get('/:id/printer/:printerId', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const printerId = req.params.printerId;
        
        // Verify that the logged-in user matches the requested coordinator ID
        if (req.user.id.toString() !== coordinatorId && req.user.role !== 'admin') {
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
            `, [printerId, coordinatorId]);
            
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
 * @route GET /api/coordinators/:id/printers/:printerId/service-history
 * @desc Get service history for a specific printer
 * @access Private (Admin or assigned coordinator)
 */
router.get('/:id/printer/:printerId/service-history', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const printerId = req.params.printerId;
        
        // Verify that the logged-in user matches the requested coordinator ID
        if (req.user.id.toString() !== coordinatorId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // If user is not admin, verify they are assigned to this printer
        if (req.user.role !== 'admin') {
            const [assignments] = await db.query(`
                SELECT * FROM printer_assignments
                WHERE printer_id = ? AND user_id = ? AND status = 'active'
            `, [printerId, coordinatorId]);
            
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
 * @access Private (Coordinator only)
 */
router.post('/service-requests', authenticateCoordinator, async (req, res) => {
    try {
    const { printer_id, type, priority, description, location } = req.body;
        
        // Validate required fields
        if (!printer_id || !type || !priority || !description) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Verify coordinator is assigned to this printer
        const [assignments] = await db.query(`
            SELECT * FROM printer_assignments
            WHERE printer_id = ? AND user_id = ? AND status = 'active'
        `, [printer_id, req.user.id]);
        
        if (assignments.length === 0) {
            return res.status(403).json({ message: 'You are not assigned to this printer' });
        }
        
        // Generate a new request number (e.g., PRINTER-<id>-YYYYMMDDHHMMSS)
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
        const requestNumber = `PRINTER-${printer_id}-${dateStr}`;

        // Debug: print all values to be inserted
        console.log('Inserting service request:', {
            request_number: requestNumber,
            inventory_item_id: printer_id,
            institution_id: req.user.institution_id || null,
            coordinator_id: req.user.id,
            priority,
            status: 'pending',
            location: location || 'Unknown',
            description
        });

        // Insert the service request with request_number and required fields
        const [result] = await db.query(`
            INSERT INTO service_requests 
            (request_number, inventory_item_id, institution_id, coordinator_id, priority, status, location, description, assigned_technician_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
        `, [
            requestNumber,
            printer_id,
            req.user.institution_id || null,
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
            inventory_item_id: printer_id,
            institution_id: req.user.institution_id || null,
            coordinator_id: req.user.id,
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