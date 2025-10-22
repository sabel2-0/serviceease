const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateTechnician } = require('../middleware/auth');

// Get technician's personal inventory
router.get('/inventory', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT 
                ti.id as inventory_id,
                ti.quantity as assigned_quantity,
                ti.assigned_at,
                ti.last_updated,
                ti.notes,
                pp.id as part_id,
                pp.name,
                pp.brand,
                pp.category,
                pp.part_type,
                pp.unit,
                CONCAT(u.first_name, ' ', u.last_name) as assigned_by_name
            FROM technician_inventory ti
            JOIN printer_parts pp ON ti.part_id = pp.id
            LEFT JOIN users u ON ti.assigned_by = u.id
            WHERE ti.technician_id = ? AND ti.quantity > 0
            ORDER BY ti.last_updated DESC, pp.name ASC
        `, [technicianId]);
        
        console.log(`Found ${rows.length} inventory items for technician ${technicianId}`);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching technician inventory:', error);
        res.status(500).json({ 
            error: 'Failed to fetch inventory',
            message: error.message 
        });
    }
});

// Get available parts for requesting (from main inventory)
router.get('/available-parts', authenticateTechnician, async (req, res) => {
    try {
        const { search, category, part_type, stock_level } = req.query;
        
        let query = `
            SELECT 
                id,
                name,
                brand,
                category,
                part_type,
                quantity,
                unit,
                minimum_stock
            FROM printer_parts
            WHERE quantity > 0
        `;
        
        const params = [];
        
        // Add search filter
        if (search) {
            query += ` AND (
                name LIKE ? OR 
                brand LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Add category filter
        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }
        
        // Add part type filter (consumable vs printer_part)
        if (part_type) {
            if (part_type === 'consumable') {
                query += ` AND category IN (
                    'paper', 'cleaning-supplies', 'tools', 'cables', 
                    'batteries', 'lubricants', 'labels', 'other-consumable'
                )`;
            } else if (part_type === 'printer_part') {
                query += ` AND category NOT IN (
                    'paper', 'cleaning-supplies', 'tools', 'cables', 
                    'batteries', 'lubricants', 'labels', 'other-consumable'
                )`;
            }
        }
        
        // Add stock level filter
        if (stock_level) {
            switch (stock_level) {
                case 'high':
                    query += ` AND quantity > 20`;
                    break;
                case 'medium':
                    query += ` AND quantity BETWEEN 11 AND 20`;
                    break;
                case 'low':
                    query += ` AND quantity BETWEEN 1 AND 10`;
                    break;
            }
        }
        
        query += ` ORDER BY name ASC`;
        
        const [rows] = await db.query(query, params);
        
        console.log(`Found ${rows.length} available parts for technician requests`);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching available parts:', error);
        res.status(500).json({ 
            error: 'Failed to fetch available parts',
            message: error.message 
        });
    }
});

// Submit a parts request
router.post('/request', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { part_id, quantity_requested, reason, priority } = req.body;
        
        // Validation
        if (!part_id || !quantity_requested || !reason) {
            return res.status(400).json({ 
                error: 'Missing required fields: part_id, quantity_requested, and reason are required' 
            });
        }
        
        if (quantity_requested < 1) {
            return res.status(400).json({ 
                error: 'Quantity must be at least 1' 
            });
        }
        
        if (reason.trim().length < 10) {
            return res.status(400).json({ 
                error: 'Reason must be at least 10 characters long' 
            });
        }
        
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ 
                error: 'Invalid priority level' 
            });
        }
        
        // Check if part exists and has enough stock
        const [partRows] = await db.query(
            'SELECT id, name, quantity FROM printer_parts WHERE id = ?',
            [part_id]
        );
        
        if (partRows.length === 0) {
            return res.status(404).json({ error: 'Part not found' });
        }
        
        const part = partRows[0];
        if (part.quantity < quantity_requested) {
            return res.status(400).json({ 
                error: `Insufficient stock. Available: ${part.quantity}, Requested: ${quantity_requested}` 
            });
        }
        
        // Create the parts request
        const [result] = await db.query(
            `INSERT INTO parts_requests (
                part_id, 
                technician_id, 
                quantity_requested, 
                reason, 
                priority, 
                status
            ) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [part_id, technicianId, quantity_requested, reason.trim(), priority || 'medium']
        );
        
        console.log(`Parts request created with ID ${result.insertId} for technician ${technicianId}`);
        
        res.status(201).json({ 
            message: 'Parts request submitted successfully',
            request_id: result.insertId,
            status: 'pending'
        });
        
    } catch (error) {
        console.error('Error creating parts request:', error);
        res.status(500).json({ 
            error: 'Failed to submit parts request',
            message: error.message 
        });
    }
});

// Get technician's parts requests
router.get('/requests', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { status, priority, limit = 50 } = req.query;
        
        let query = `
            SELECT 
                pr.id,
                pr.quantity_requested,
                pr.reason,
                pr.priority,
                pr.status,
                pr.admin_response,
                pr.created_at,
                pr.approved_at,
                pp.name as part_name,
                pp.brand as part_brand,
                pp.category as part_category,
                pp.unit as part_unit,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
            FROM parts_requests pr
            JOIN printer_parts pp ON pr.part_id = pp.id
            LEFT JOIN users approver ON pr.approved_by = approver.id
            WHERE pr.technician_id = ?
        `;
        
        const params = [technicianId];
        
        // Add status filter
        if (status) {
            query += ` AND pr.status = ?`;
            params.push(status);
        }
        
        // Add priority filter
        if (priority) {
            query += ` AND pr.priority = ?`;
            params.push(priority);
        }
        
        query += ` ORDER BY pr.created_at DESC LIMIT ?`;
        params.push(parseInt(limit));
        
        const [rows] = await db.query(query, params);
        
        console.log(`Found ${rows.length} parts requests for technician ${technicianId}`);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching parts requests:', error);
        res.status(500).json({ 
            error: 'Failed to fetch parts requests',
            message: error.message 
        });
    }
});

// Get a specific parts request
router.get('/requests/:id', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const requestId = req.params.id;
        
        const [rows] = await db.query(`
            SELECT 
                pr.id,
                pr.quantity_requested,
                pr.reason,
                pr.priority,
                pr.status,
                pr.admin_response,
                pr.created_at,
                pr.approved_at,
                pp.name as part_name,
                pp.brand as part_brand,
                pp.category as part_category,
                pp.unit as part_unit,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
            FROM parts_requests pr
            JOIN printer_parts pp ON pr.part_id = pp.id
            LEFT JOIN users approver ON pr.approved_by = approver.id
            WHERE pr.id = ? AND pr.technician_id = ?
        `, [requestId, technicianId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Parts request not found' });
        }
        
        res.json(rows[0]);
        
    } catch (error) {
        console.error('Error fetching parts request:', error);
        res.status(500).json({ 
            error: 'Failed to fetch parts request',
            message: error.message 
        });
    }
});

// Use a part from technician's inventory (when completing a service)
router.post('/use-part', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        const { part_id, quantity_used, service_request_id, notes } = req.body;
        
        // Validation
        if (!part_id || !quantity_used || quantity_used < 1) {
            return res.status(400).json({ 
                error: 'Valid part_id and quantity_used are required' 
            });
        }
        
        await db.query('START TRANSACTION');
        
        try {
            // Check if technician has this part in inventory
            const [inventoryRows] = await db.query(
                'SELECT quantity FROM technician_inventory WHERE technician_id = ? AND part_id = ?',
                [technicianId, part_id]
            );
            
            if (inventoryRows.length === 0) {
                throw new Error('Part not found in your inventory');
            }
            
            const currentQuantity = inventoryRows[0].quantity;
            if (currentQuantity < quantity_used) {
                throw new Error(`Insufficient quantity. Available: ${currentQuantity}, Requested: ${quantity_used}`);
            }
            
            // Update technician inventory
            const newQuantity = currentQuantity - quantity_used;
            if (newQuantity === 0) {
                // Remove the entry if quantity becomes 0
                await db.query(
                    'DELETE FROM technician_inventory WHERE technician_id = ? AND part_id = ?',
                    [technicianId, part_id]
                );
            } else {
                // Update the quantity
                await db.query(
                    'UPDATE technician_inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE technician_id = ? AND part_id = ?',
                    [newQuantity, technicianId, part_id]
                );
            }
            
            // Log the usage (you can create a parts_usage table for this)
            // For now, we'll just log it to console
            console.log(`Technician ${technicianId} used ${quantity_used} units of part ${part_id}${service_request_id ? ` for service request ${service_request_id}` : ''}`);
            
            await db.query('COMMIT');
            
            res.json({ 
                message: 'Part usage recorded successfully',
                remaining_quantity: newQuantity
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Error recording part usage:', error);
        res.status(500).json({ 
            error: 'Failed to record part usage',
            message: error.message 
        });
    }
});

module.exports = router;