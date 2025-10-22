const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Apply authentication to all routes
router.use(auth);

// Create parts requests table if it doesn't exist
async function ensurePartsRequestsTable() {
    try {
        const schema = require('fs').readFileSync(require('path').join(__dirname, '../config/parts_requests_schema.sql'), 'utf8');
        await db.executeMultiStatementSql(schema);
        console.log('Parts requests table ensured');
    } catch (error) {
        console.error('Error creating parts requests table:', error);
        throw error;
    }
}

// Get all parts requests (for admins) or technician's own requests
router.get('/', async (req, res) => {
    try {
        await ensurePartsRequestsTable();
        
        const user = req.user; // Set by auth middleware
        const { status, priority, technician_id } = req.query;
        
        let query = `
            SELECT 
                pr.*,
                pp.name as part_name,
                pp.category as part_category,
                pp.quantity as available_stock,
                u.first_name as technician_first_name,
                u.last_name as technician_last_name,
                u.email as technician_email,
                approver.first_name as approved_by_first_name,
                approver.last_name as approved_by_last_name
            FROM parts_requests pr
            LEFT JOIN printer_parts pp ON pr.part_id = pp.id
            LEFT JOIN users u ON pr.technician_id = u.id
            LEFT JOIN users approver ON pr.approved_by = approver.id
        `;
        
        const conditions = [];
        const params = [];
        
        // If user is technician, only show their requests
        if (user.role === 'technician') {
            conditions.push('pr.technician_id = ?');
            params.push(user.id);
        }
        
        // If admin specifies technician_id filter
        if (technician_id && user.role === 'admin') {
            conditions.push('pr.technician_id = ?');
            params.push(technician_id);
        }
        
        // Status filter
        if (status) {
            conditions.push('pr.status = ?');
            params.push(status);
        }
        
        // Priority filter
        if (priority) {
            conditions.push('pr.priority = ?');
            params.push(priority);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY pr.created_at DESC';
        
        const [rows] = await db.query(query, params);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching parts requests:', error);
        res.status(500).json({ 
            error: 'Failed to fetch parts requests',
            message: error.message 
        });
    }
});

// Get single parts request by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        let query = `
            SELECT 
                pr.*,
                pp.name as part_name,
                pp.category as part_category,
                pp.quantity as available_stock,
                u.first_name as technician_first_name,
                u.last_name as technician_last_name,
                u.email as technician_email,
                approver.first_name as approved_by_first_name,
                approver.last_name as approved_by_last_name
            FROM parts_requests pr
            LEFT JOIN printer_parts pp ON pr.part_id = pp.id
            LEFT JOIN users u ON pr.technician_id = u.id
            LEFT JOIN users approver ON pr.approved_by = approver.id
            WHERE pr.id = ?
        `;
        
        const params = [id];
        
        // If user is technician, ensure they can only see their own requests
        if (user.role === 'technician') {
            query += ' AND pr.technician_id = ?';
            params.push(user.id);
        }
        
        const [rows] = await db.query(query, params);
        
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

// Create new parts request (technicians only)
router.post('/', async (req, res) => {
    try {
        await ensurePartsRequestsTable();
        
        const user = req.user;
        
        // Only technicians can create parts requests
        if (user.role !== 'technician') {
            return res.status(403).json({ error: 'Only technicians can create parts requests' });
        }
        
        const { 
            part_id, 
            quantity_requested, 
            reason, 
            priority = 'medium' 
        } = req.body;
        
        // Validation
        if (!part_id || !quantity_requested || !reason) {
            return res.status(400).json({ 
                error: 'Missing required fields: part_id, quantity_requested, reason' 
            });
        }
        
        if (quantity_requested < 1 || quantity_requested > 1000) {
            return res.status(400).json({ 
                error: 'Quantity must be between 1 and 1000' 
            });
        }
        
        if (reason.trim().length < 10) {
            return res.status(400).json({ 
                error: 'Reason must be at least 10 characters long' 
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
            [part_id, user.id, quantity_requested, reason.trim(), priority]
        );
        
        console.log('Parts request created:', {
            id: result.insertId,
            part_id,
            technician_id: user.id,
            quantity_requested,
            priority
        });
        
        // Fetch full user details for notification
        const [userRows] = await db.query(
            'SELECT first_name, last_name FROM users WHERE id = ?',
            [user.id]
        );
        const userDetails = userRows[0] || { first_name: 'Unknown', last_name: 'User' };
        
        // Create notification for admins about new parts request
        try {
            await createNotification({
                title: 'New Parts Request',
                message: `${userDetails.first_name} ${userDetails.last_name} has requested ${quantity_requested} units of ${part.name}`,
                type: 'parts_request',
                user_id: null, // null means all admins
                sender_id: user.id,
                reference_type: 'parts_request',
                reference_id: result.insertId,
                priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'medium'
            });
        } catch (notificationError) {
            console.error('Failed to create notification:', notificationError);
            // Don't fail the request if notification fails
        }
        
        res.status(201).json({
            message: 'Parts request created successfully',
            id: result.insertId,
            part_name: part.name
        });
        
    } catch (error) {
        console.error('Error creating parts request:', error);
        res.status(500).json({ 
            error: 'Failed to create parts request',
            message: error.message 
        });
    }
});

// Update parts request status (admins only)
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { status, admin_response } = req.body;
        
        // Only admins can update parts requests
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update parts requests' });
        }
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'denied', 'fulfilled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
            });
        }
        
        // Get current request
        const [requestRows] = await db.query(
            'SELECT * FROM parts_requests WHERE id = ?',
            [id]
        );
        
        if (requestRows.length === 0) {
            return res.status(404).json({ error: 'Parts request not found' });
        }
        
        const currentRequest = requestRows[0];
        
        // Start transaction for inventory updates
        await db.query('START TRANSACTION');
        
        try {
            // Update the request
            const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
            const updateParams = [status];
            
            if (admin_response) {
                updateFields.push('admin_response = ?');
                updateParams.push(admin_response.trim());
            }
            
            if (status === 'approved' || status === 'denied') {
                updateFields.push('approved_by = ?', 'approved_at = CURRENT_TIMESTAMP');
                updateParams.push(user.id);
            }
            
            updateParams.push(id);
            
            await db.query(
                `UPDATE parts_requests SET ${updateFields.join(', ')} WHERE id = ?`,
                updateParams
            );
            
            // If approved, add to technician inventory and deduct from main inventory
            if (status === 'approved') {
                // First, check and deduct from main inventory
                const [inventoryCheck] = await db.query(
                    'SELECT quantity FROM printer_parts WHERE id = ?',
                    [currentRequest.part_id]
                );
                
                if (inventoryCheck.length === 0 || inventoryCheck[0].quantity < currentRequest.quantity_requested) {
                    throw new Error('Insufficient inventory to approve request');
                }
                
                // Deduct from main inventory
                await db.query(
                    'UPDATE printer_parts SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
                    [currentRequest.quantity_requested, currentRequest.part_id, currentRequest.quantity_requested]
                );
                
                // Add to technician inventory
                const [existingTechInventory] = await db.query(
                    'SELECT * FROM technician_inventory WHERE technician_id = ? AND part_id = ?',
                    [currentRequest.technician_id, currentRequest.part_id]
                );
                
                if (existingTechInventory.length > 0) {
                    // Update existing entry
                    await db.query(
                        'UPDATE technician_inventory SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP WHERE technician_id = ? AND part_id = ?',
                        [currentRequest.quantity_requested, currentRequest.technician_id, currentRequest.part_id]
                    );
                } else {
                    // Create new entry
                    await db.query(
                        'INSERT INTO technician_inventory (technician_id, part_id, quantity, assigned_by, assigned_at, last_updated) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                        [currentRequest.technician_id, currentRequest.part_id, currentRequest.quantity_requested, user.id]
                    );
                }
                
                console.log(`Added ${currentRequest.quantity_requested} units of part ${currentRequest.part_id} to technician ${currentRequest.technician_id} inventory`);
            }
            
            // If fulfilled (for backward compatibility), only update if not already processed
            if (status === 'fulfilled' && currentRequest.status !== 'approved') {
                await db.query(
                    'UPDATE printer_parts SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
                    [currentRequest.quantity_requested, currentRequest.part_id, currentRequest.quantity_requested]
                );
                
                // Check if update was successful
                const [updateResult] = await db.query(
                    'SELECT ROW_COUNT() as affected_rows'
                );
                
                if (updateResult[0].affected_rows === 0) {
                    throw new Error('Insufficient inventory to fulfill request');
                }
            }
            
            await db.query('COMMIT');
            
            console.log('Parts request updated:', {
                id,
                status,
                admin_id: user.id,
                admin_name: `${user.first_name} ${user.last_name}`
            });
            
            // Create notification for technician about request status change
            try {
                let notificationTitle = '';
                let notificationMessage = '';
                let notificationType = 'info';
                
                if (status === 'approved') {
                    notificationTitle = 'Parts Request Approved';
                    notificationMessage = `Your request for ${currentRequest.quantity_requested} units has been approved and added to your inventory.`;
                    notificationType = 'parts_approved';
                } else if (status === 'denied') {
                    notificationTitle = 'Parts Request Denied';
                    notificationMessage = `Your request for ${currentRequest.quantity_requested} units has been denied.`;
                    notificationType = 'parts_denied';
                } else if (status === 'fulfilled') {
                    notificationTitle = 'Parts Request Fulfilled';
                    notificationMessage = `Your request for ${currentRequest.quantity_requested} units has been fulfilled.`;
                    notificationType = 'success';
                }
                
                if (notificationTitle) {
                    await createNotification({
                        title: notificationTitle,
                        message: notificationMessage + (admin_response ? ` Admin note: ${admin_response}` : ''),
                        type: notificationType,
                        user_id: currentRequest.technician_id,
                        sender_id: user.id,
                        reference_type: 'parts_request',
                        reference_id: id,
                        priority: 'medium'
                    });
                }
            } catch (notificationError) {
                console.error('Failed to create notification:', notificationError);
                // Don't fail the request if notification fails
            }
            
            res.json({
                message: 'Parts request updated successfully',
                status
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Error updating parts request:', error);
        res.status(500).json({ 
            error: 'Failed to update parts request',
            message: error.message 
        });
    }
});

// Delete parts request (admins only, or technicians can delete their pending requests)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        // Get the request first
        const [requestRows] = await db.query(
            'SELECT * FROM parts_requests WHERE id = ?',
            [id]
        );
        
        if (requestRows.length === 0) {
            return res.status(404).json({ error: 'Parts request not found' });
        }
        
        const request = requestRows[0];
        
        // Check permissions
        if (user.role === 'technician') {
            // Technicians can only delete their own pending requests
            if (request.technician_id !== user.id) {
                return res.status(403).json({ error: 'You can only delete your own requests' });
            }
            if (request.status !== 'pending') {
                return res.status(403).json({ error: 'You can only delete pending requests' });
            }
        }
        // Admins can delete any request
        
        await db.query('DELETE FROM parts_requests WHERE id = ?', [id]);
        
        res.json({ message: 'Parts request deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting parts request:', error);
        res.status(500).json({ 
            error: 'Failed to delete parts request',
            message: error.message 
        });
    }
});

// Get parts request statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const user = req.user;
        
        let whereClause = '';
        const params = [];
        
        // If technician, only show their stats
        if (user.role === 'technician') {
            whereClause = 'WHERE technician_id = ?';
            params.push(user.id);
        }
        
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_requests,
                SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled_requests,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_requests,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_requests
            FROM parts_requests 
            ${whereClause}
        `, params);
        
        res.json(stats[0]);
        
    } catch (error) {
        console.error('Error fetching parts request stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch statistics',
            message: error.message 
        });
    }
});

module.exports = router;