const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateTechnician } = require('../middleware/auth');

// Get unique brands from technician's inventory
router.get('/inventory/brands', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT DISTINCT pp.brand
            FROM technician_inventory ti
            JOIN printer_items pp ON ti.item_id = pp.id
            WHERE ti.technician_id = ? AND ti.quantity > 0 AND pp.brand IS NOT NULL
            ORDER BY pp.brand ASC
        `, [technicianId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
});

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
                pp.id as item_id,
                pp.name,
                pp.brand,
                pp.category,
                pp.color,
                pp.page_yield,
                pp.ink_volume,
                pp.toner_weight,
                ti.remaining_volume,
                ti.remaining_weight,
                ti.is_opened,
                pp.is_universal,
                pp.unit,
                CONCAT(u.first_name, ' ', u.last_name) as assigned_by_name
            FROM technician_inventory ti
            JOIN printer_items pp ON ti.item_id = pp.id
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

// Get technician's parts for service completion (from personal inventory only)
router.get('/parts', authenticateTechnician, async (req, res) => {
    try {
        const technicianId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT 
                pp.id,
                pp.name,
                pp.brand,
                pp.category,
                pp.unit,
                pp.ink_volume,
                pp.toner_weight,
                ti.remaining_volume,
                ti.remaining_weight,
                ti.is_opened,
                pp.is_universal,
                ti.quantity as stock,
                ti.quantity as technician_stock,
                ti.id as tech_inventory_id
            FROM technician_inventory ti
            JOIN printer_items pp ON ti.item_id = pp.id
            WHERE ti.technician_id = ? AND ti.quantity > 0
            ORDER BY pp.name ASC
        `, [technicianId]);
        
        console.log(`[GET /api/technician/parts] Loaded ${rows.length} parts for technician ${technicianId}`);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching technician parts:', error);
        res.status(500).json({ 
            error: 'Failed to fetch parts',
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
                quantity,
                unit,
                minimum_stock,
                is_universal
            FROM printer_items
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
        
        // Add part type filter (consumable vs printer_part based on category)
        if (part_type) {
            const consumableCategories = ['toner', 'ink', 'ink-bottle', 'drum', 'drum-cartridge', 'other-consumable', 'paper', 'cleaning-supplies'];
            const printerPartCategories = ['fuser', 'roller', 'printhead', 'transfer-belt', 'maintenance-unit', 'power-board', 'mainboard', 'maintenance-box', 'tools', 'cables', 'batteries', 'lubricants', 'replacement-parts', 'software', 'labels', 'other'];
            
            if (part_type === 'consumable') {
                const placeholders = consumableCategories.map(() => '?').join(',');
                query += ` AND category IN (${placeholders})`;
                params.push(...consumableCategories);
            } else if (part_type === 'printer_part') {
                const placeholders = printerPartCategories.map(() => '?').join(',');
                query += ` AND category IN (${placeholders})`;
                params.push(...printerPartCategories);
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
        const { item_id, quantity_requested, reason, priority } = req.body;
        
        // Validation
        if (!item_id || !quantity_requested || !reason) {
            return res.status(400).json({ 
                error: 'Missing required fields: item_id, quantity_requested, and reason are required' 
            });
        }
        
        if (quantity_requested < 1) {
            return res.status(400).json({ 
                error: 'Quantity must be at least 1' 
            });
        }
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Reason is required' 
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
            'SELECT id, name, quantity FROM printer_items WHERE id = ?',
            [item_id]
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
            `INSERT INTO items_request (
                item_id, 
                technician_id, 
                quantity_requested, 
                reason, 
                priority, 
                status
            ) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [item_id, technicianId, quantity_requested, reason.trim(), priority || 'medium']
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
            FROM items_request pr
            JOIN printer_items pp ON pr.item_id = pp.id
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
            FROM items_request pr
            JOIN printer_items pp ON pr.item_id = pp.id
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
        const { item_id, quantity_used, service_id, notes } = req.body;
        
        // Validation
        if (!item_id || !quantity_used || quantity_used < 1) {
            return res.status(400).json({ 
                error: 'Valid item_id and quantity_used are required' 
            });
        }
        
        await db.query('START TRANSACTION');
        
        try {
            // Check if technician has this part in inventory
            const [inventoryRows] = await db.query(
                'SELECT quantity FROM technician_inventory WHERE technician_id = ? AND item_id = ?',
                [technicianId, item_id]
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
                    'DELETE FROM technician_inventory WHERE technician_id = ? AND item_id = ?',
                    [technicianId, item_id]
                );
            } else {
                // Update the quantity
                await db.query(
                    'UPDATE technician_inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE technician_id = ? AND item_id = ?',
                    [newQuantity, technicianId, item_id]
                );
            }
            
            // Log the usage (you can create a parts_usage table for this)
            // For now, we'll just log it to console
            console.log(`Technician ${technicianId} used ${quantity_used} units of part ${item_id}${service_id ? ` for service request ${service_id}` : ''}`);
            
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



