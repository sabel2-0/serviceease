const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateCoordinator } = require('../middleware/auth');

/**
 * @route GET /api/institutions/:institution_id/printers
 * @desc Get printers assigned to a specific institution
 * @access Private (Coordinator only)
 */
router.get('/:institution_id/printers', authenticateCoordinator, async (req, res) => {
    try {
        const institutionId = req.params.institution_id;
        console.log('[DEBUG] Fetching printers for institution:', institutionId);
        const [rows] = await db.query(`
            SELECT cpa.inventory_item_id, ii.name, ii.model, ii.serial_number, ii.location_note
            FROM client_printer_assignments cpa
            JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
            WHERE cpa.institution_id = ?
        `, [institutionId]);
        console.log('[DEBUG] Query result:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching institution printers:', error);
        res.status(500).json({ error: 'Failed to fetch printers for institution' });
    }
});

module.exports = router;
