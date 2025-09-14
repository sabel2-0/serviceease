
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/coordinator-auth');

// Get service requests for a specific institution
router.get('/institution/:institution_id', auth, async (req, res) => {
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
router.get('/', auth, async (req, res) => {
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
router.post('/', auth, async (req, res) => {
        // Debug log: print full SQL query and values
        const sql = `INSERT INTO service_requests (
            request_number, institution_id, coordinator_id, assigned_technician_id, priority, status, location, description, created_at, updated_at, inventory_item_id
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NOW(), NOW(), ?)`;
        const values = [
            requestNumber,
            institution_id,
            coordinator_id,
            priority,
            status || 'new',
            location || 'Unknown',
            description,
            inventory_item_id
        ];
        console.log('SQL:', sql);
        console.log('Values:', values);
    console.log('SERVICE REQUEST ROUTE HIT');
    try {
        const {
            inventory_item_id,
            institution_id,
            priority,
            description,
            location,
            coordinator_id,
            status
        } = req.body;

        // Log the generated request number and all inserted data
        console.log('Generated request_number:', requestNumber);
        console.log('Inserting service request with data:', {
            request_number: requestNumber,
            inventory_item_id,
            institution_id,
            coordinator_id,
            priority,
            status: status || 'new',
            location: location || 'Unknown',
            description
        });

        // Validate required fields
        if (!inventory_item_id || !institution_id || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }



        // Validate inventory item exists and belongs to institution
        const [inventoryItem] = await db.query(
            'SELECT id FROM inventory_items WHERE id = ? AND institution_id = ? AND type = "printer"',
            [inventory_item_id, institution_id]
        );

        if (!inventoryItem.length) {
            return res.status(400).json({ error: 'Invalid printer selected' });
        }

        // Generate a new request number (e.g., INST-004-YYYYMMDD-HHMMSS)
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
        const requestNumber = `${institution_id}-${dateStr}`;

        // Insert into service_requests table with exact column order
        const [result] = await db.query(
            `INSERT INTO service_requests (
                request_number, institution_id, coordinator_id, assigned_technician_id, priority, status, location, description, created_at, updated_at, inventory_item_id
            ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NOW(), NOW(), ?)`,
            [
                requestNumber,
                institution_id,
                coordinator_id,
                priority,
                status || 'new',
                location || 'Unknown',
                description,
                inventory_item_id
            ]
        );

        // Return the created request including the request number and all relevant data
        res.status(201).json({
            message: 'Service request created successfully',
            request_id: result.insertId,
            request_number: requestNumber,
            institution_id,
            coordinator_id,
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
