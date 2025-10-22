const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Detect available notification table columns and set helpers
let notifHasUserId = false;
let notifHasRelatedUserId = false;
let notifHasSenderId = false;
let notifHasRelatedData = false;
let notifHasPriority = false;

async function detectNotificationSchema() {
    try {
        const [cols] = await db.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
        `);
        const colNames = (cols || []).map(c => c.COLUMN_NAME.toLowerCase());
        notifHasUserId = colNames.includes('user_id');
        notifHasRelatedUserId = colNames.includes('related_user_id');
    notifHasSenderId = colNames.includes('sender_id');
    notifHasRelatedData = colNames.includes('related_data');
    notifHasPriority = colNames.includes('priority');
        console.log('Notification schema detection:', { notifHasUserId, notifHasRelatedUserId, notifHasSenderId, notifHasRelatedData });
    } catch (err) {
        console.warn('Failed to detect notifications schema, defaulting to new schema assumptions', err.message);
        notifHasUserId = true;
        notifHasRelatedUserId = false;
        notifHasSenderId = true;
        notifHasRelatedData = false;
    }
}

// Run detection once at startup
const schemaReady = detectNotificationSchema();

// Create a new notification
async function createNotification(data) {
    // Use detected schema flags to select insertion path deterministically
    await schemaReady;
    const { title, message, type, user_id, sender_id, reference_type, reference_id, priority } = data;
    console.log('[DEBUG] createNotification called', { time: new Date().toISOString(), title, type, user_id, sender_id, reference_type, reference_id, priority, schema: { notifHasUserId, notifHasRelatedUserId, notifHasSenderId } });

    try {
        if (notifHasUserId) {
            // New schema
            const [result] = await db.query(`
                INSERT INTO notifications (
                    title, message, type, user_id, sender_id, 
                    reference_type, reference_id, priority
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [title, message, type || 'info', user_id || null, sender_id || null, reference_type || null, reference_id || null, priority || 'medium']);
            console.log('Notification created (new schema):', { id: result.insertId, title, type, user_id });
            // If the legacy columns also exist, populate them for backward compatibility
            if (notifHasRelatedUserId) {
                try {
                    const relatedData = JSON.stringify({ reference_type: reference_type || null, reference_id: reference_id || null, sender_id: sender_id || null, priority: priority || null });
                    await db.query(`UPDATE notifications SET related_user_id = ?, related_data = ? WHERE id = ?`, [user_id || null, relatedData, result.insertId]);
                    console.log('Also populated legacy related_user_id/related_data for notification id', result.insertId);
                } catch (updErr) {
                    console.warn('Failed to populate legacy related_user_id for notification:', updErr && updErr.message ? updErr.message : updErr);
                }
            }
            return result.insertId;
        }

        if (notifHasRelatedUserId) {
            // Legacy schema: related_user_id + related_data
            const relatedData = JSON.stringify({ reference_type: reference_type || null, reference_id: reference_id || null, sender_id: sender_id || null, priority: priority || null });
            const [fallbackResult] = await db.query(`
                INSERT INTO notifications (
                    type, title, message, related_user_id, related_data, created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            `, [type || 'info', title, message, user_id || null, relatedData]);
            console.log('Notification created (fallback schema):', { id: fallbackResult.insertId, title, type, user_id });
            return fallbackResult.insertId;
        }

        // As a last resort, attempt the new schema insert and let errors bubble up
        const [result] = await db.query(`
            INSERT INTO notifications (
                title, message, type, user_id, sender_id, 
                reference_type, reference_id, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, message, type || 'info', user_id || null, sender_id || null, reference_type || null, reference_id || null, priority || 'medium']);
        console.log('Notification created (fallback-attempt new schema):', { id: result.insertId, title, type, user_id });
        return result.insertId;
    } catch (error) {
        console.error('Error creating notification:', error && error.message ? error.message : error);
        throw error;
    }
}

// Get notifications for current user (handles both 'user_id' and 'related_user_id' schemas)
router.get('/', async (req, res) => {
    await schemaReady;
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { is_read, type, limit = 50, offset = 0 } = req.query;

        // Decide which column to use for user scoping
        const userCol = notifHasUserId ? 'n.user_id' : (notifHasRelatedUserId ? 'n.related_user_id' : null);

        // Select all notification columns; do not reference possibly-missing columns directly
        let selectCols = 'n.*';

        // Include sender name when sender_id exists
        let joinSender = '';
        if (notifHasSenderId) {
            selectCols += `, CONCAT(sender.first_name, ' ', sender.last_name) as sender_name, sender.role as sender_role`;
            joinSender = 'LEFT JOIN users sender ON n.sender_id = sender.id';
        }

        if (!userCol) {
            // No user-scoped column exists; treat as admin-only
            return res.status(500).json({ error: 'Notifications table missing expected user columns' });
        }

        let query = `SELECT ${selectCols} FROM notifications n ${joinSender} WHERE (${userCol} = ? OR (${userCol} IS NULL AND ? = 'admin'))`;
        const params = [userId, userRole];

        if (is_read !== undefined) {
            query += ' AND n.is_read = ?';
            params.push(is_read === 'true');
        }

        if (type) {
            query += ' AND n.type = ?';
            params.push(type);
        }

        query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

    console.log('[DEBUG] notifications query:', query, params);
    const [rows] = await db.query(query, params);

    try {
        console.log('[DEBUG] notifications result count:', Array.isArray(rows) ? rows.length : 0);
        if (Array.isArray(rows) && rows.length > 0) {
            // Log first few notification rows for inspection (avoid dumping everything)
            console.log('[DEBUG] notifications sample rows:', rows.slice(0,5).map(r => ({ id: r.id, type: r.type, user_id: r.user_id || r.related_user_id, title: r.title, created_at: r.created_at })));
        }
    } catch (lgErr) {
        console.warn('Failed to log notifications result sample', lgErr && lgErr.message ? lgErr.message : lgErr);
    }

        res.json({ notifications: rows, total: rows.length });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
    }
});

// Get unread notification count (handles both schemas)
router.get('/count/unread', async (req, res) => {
    await schemaReady;
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userCol = notifHasUserId ? 'user_id' : (notifHasRelatedUserId ? 'related_user_id' : null);
        if (!userCol) return res.status(500).json({ error: 'Notifications table missing expected user columns' });

        const [rows] = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE (${userCol} = ? OR (${userCol} IS NULL AND ? = 'admin'))
            AND is_read = FALSE
        `, [userId, userRole]);

        res.json({ unread_count: rows[0].unread_count });

    } catch (error) {
        console.error('Error fetching notification count:', error);
        res.status(500).json({ error: 'Failed to fetch notification count', message: error.message });
    }
});

// Mark notification as read (handles both schemas)
router.patch('/:id/read', async (req, res) => {
    await schemaReady;
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const userCol = notifHasUserId ? 'user_id' : (notifHasRelatedUserId ? 'related_user_id' : null);
        if (!userCol) return res.status(500).json({ error: 'Notifications table missing expected user columns' });

        const [result] = await db.query(`
            UPDATE notifications
            SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND (${userCol} = ? OR (${userCol} IS NULL AND ? = 'admin'))
        `, [notificationId, userId, userRole]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found or access denied' });
        }

        res.json({ message: 'Notification marked as read' });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
    }
});

// Mark all notifications as read (handles both schemas)
router.patch('/read-all', async (req, res) => {
    await schemaReady;
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userCol = notifHasUserId ? 'user_id' : (notifHasRelatedUserId ? 'related_user_id' : null);
        if (!userCol) return res.status(500).json({ error: 'Notifications table missing expected user columns' });

        const [result] = await db.query(`
            UPDATE notifications
            SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE (${userCol} = ? OR (${userCol} IS NULL AND ? = 'admin'))
            AND is_read = FALSE
        `, [userId, userRole]);

        res.json({ message: 'All notifications marked as read', updated_count: result.affectedRows });

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
    }
});

// Delete a notification (handles both schemas)
router.delete('/:id', async (req, res) => {
    await schemaReady;
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const userCol = notifHasUserId ? 'user_id' : (notifHasRelatedUserId ? 'related_user_id' : null);
        if (!userCol) return res.status(500).json({ error: 'Notifications table missing expected user columns' });

        const [result] = await db.query(`
            DELETE FROM notifications
            WHERE id = ? AND (${userCol} = ? OR (${userCol} IS NULL AND ? = 'admin'))
        `, [notificationId, userId, userRole]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found or access denied' });
        }

        res.json({ message: 'Notification deleted' });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification', message: error.message });
    }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT * FROM notification_preferences WHERE user_id = ?
        `, [userId]);
        
        if (rows.length === 0) {
            // Create default preferences
            await db.query(`
                INSERT INTO notification_preferences (user_id) VALUES (?)
            `, [userId]);
            
            return res.json({
                email_notifications: true,
                in_app_notifications: true,
                notification_types: null
            });
        }
        
        const prefs = rows[0];
        res.json({
            email_notifications: prefs.email_notifications,
            in_app_notifications: prefs.in_app_notifications,
            notification_types: prefs.notification_types ? JSON.parse(prefs.notification_types) : null
        });
        
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ 
            error: 'Failed to fetch notification preferences',
            message: error.message 
        });
    }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;
        const { email_notifications, in_app_notifications, notification_types } = req.body;
        
        const [result] = await db.query(`
            INSERT INTO notification_preferences (
                user_id, email_notifications, in_app_notifications, notification_types
            ) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            email_notifications = VALUES(email_notifications),
            in_app_notifications = VALUES(in_app_notifications),
            notification_types = VALUES(notification_types),
            updated_at = CURRENT_TIMESTAMP
        `, [userId, email_notifications, in_app_notifications, 
            notification_types ? JSON.stringify(notification_types) : null]);
        
        res.json({ message: 'Notification preferences updated' });
        
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ 
            error: 'Failed to update notification preferences',
            message: error.message 
        });
    }
});

// Export the createNotification function for use in other modules
module.exports = router;
module.exports.createNotification = createNotification;