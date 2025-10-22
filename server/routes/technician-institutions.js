const express = require('express');
const router = express.Router();
const TechnicianAssignments = require('../models/TechnicianAssignments');

// GET /api/technician/:id/institutions
router.get('/:id/institutions', async (req, res) => {
    const technicianId = req.params.id;
    try {
        const institutions = await TechnicianAssignments.getInstitutionsByTechnician(technicianId);
        res.json({ institutions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
