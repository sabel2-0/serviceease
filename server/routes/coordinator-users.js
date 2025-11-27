const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authenticateCoordinator } = require('../middleware/auth');

// Get all approved users for coordinator's institution(s)
router.get('/:id/users', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        // Only allow access if the logged-in user matches the requested coordinator ID
        if (req.user.id.toString() !== coordinatorId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Get coordinator's institutions
        const [institutions] = await db.query(
            'SELECT institution_id FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        if (institutions.length === 0) {
            return res.json([]);
        }
        const institutionIds = institutions.map(i => i.institution_id);
        // Get all approved users for these institutions
        const [users] = await db.query(
            `SELECT u.*,
                GROUP_CONCAT(DISTINCT i.name) as institution_names,
                GROUP_CONCAT(DISTINCT upa.institution_id) as institution_ids,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'serial_number', ii.serial_number,
                        'brand', ii.brand,
                        'model', ii.model,
                        'name', ii.name,
                        'location', ii.location,
                        'department', upa2.department
                    ))
                    FROM user_printer_assignments upa2
                    INNER JOIN inventory_items ii ON upa2.inventory_item_id = ii.id
                    WHERE upa2.user_id = u.id
                ) AS printers
            FROM users u
            LEFT JOIN user_printer_assignments upa ON u.id = upa.user_id
            LEFT JOIN institutions i ON upa.institution_id = i.institution_id
            WHERE u.approval_status = 'approved'
            AND upa.institution_id IN (?)
            GROUP BY u.id
            ORDER BY u.created_at DESC`,
            [institutionIds]
        );
        res.json(users);
    } catch (error) {
        console.error('❌ Error fetching approved users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
