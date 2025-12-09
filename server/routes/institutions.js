    console.log('hello');
const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * @route GET /api/institutions/search
 * @desc Search for an institution by name and type
 * @access Public
 */
router.get('/search', async (req, res) => {
    try {
        const { name, type } = req.query;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const [rows] = await db.query(`
            SELECT institution_id, name, type, address 
            FROM institutions 
            WHERE name = ? AND type = ?
            LIMIT 1
        `, [name, type]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error searching for institution:', error);
        res.status(500).json({ error: 'Failed to search for institution' });
    }
});

/**
 * @route POST /api/institutions/search
 * @desc Search for an institution by name and type
 * @access Private
 */
router.post('/search', async (req, res) => {
    try {
        const { name, type } = req.body;
        console.log('Searching for institution:', { name, type });

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const [rows] = await db.query(`
            SELECT institution_id, name, type, address 
            FROM institutions 
            WHERE name = ? AND type = ?
            LIMIT 1
        `, [name, type]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }

        console.log('Found institution:', rows[0]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error searching for institution:', error);
        res.status(500).json({ error: 'Failed to search for institution' });
    }
});

/**
 * @route GET /api/institutions/:id/printers
 * @desc Get printers assigned to a specific institution
 * @access Private (institution_admin only)
 */
router.get('/:id/printers', async (req, res) => {
    try {
        const institutionId = req.params.id;
        
        const [rows] = await db.query(`
            SELECT 
                ii.id as printer_id,
                ii.name,
                ii.model,
                ii.serial_number,
                ii.status,
                cpa.assigned_at,
                cpa.status as assignment_status
            FROM printers ii
            JOIN institution_printer_assignments cpa ON ii.id = cpa.printer_id
            WHERE cpa.institution_id = ? AND cpa.status = 'assigned'
            ORDER BY ii.name ASC
        `, [institutionId]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching institution printers:', error);
        res.status(500).json({ error: 'Failed to fetch printers' });
    }
});

module.exports = router;



