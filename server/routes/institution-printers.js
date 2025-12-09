const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateinstitution_admin } = require('../middleware/auth');

/**
 * @route GET /api/institutions/:institution_id/printers
 * @desc Get printers assigned to a specific institution
 * @access Private (institution_admin only)
 */
router.get('/:institution_id/printers', authenticateinstitution_admin, async (req, res) => {
    try {
        const institutionId = req.params.institution_id;
        console.log('[DEBUG] Fetching printers for institution:', institutionId);
        const [rows] = await db.query(`
            SELECT cpa.printer_id, ii.name, ii.model, ii.serial_number, cpa.assigned_at, cpa.status
            FROM institution_printer_assignments cpa
            JOIN printers ii ON cpa.printer_id = ii.id
            WHERE cpa.institution_id = ? AND cpa.status = 'assigned'
        `, [institutionId]);
        console.log('[DEBUG] Query result:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching institution printers:', error);
        res.status(500).json({ error: 'Failed to fetch printers for institution' });
    }
});

module.exports = router;




