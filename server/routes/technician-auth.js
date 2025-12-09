const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Verify technician ID
router.post('/verify-technician', async (req, res) => {
    try {
        const { technicianId } = req.body;
        
        const query = `
            SELECT id FROM users 
            WHERE id = ? AND role = 'technician'
        `;
        
        const [technician] = await db.query(query, [technicianId]);
        
        if (!technician || technician.length === 0) {
            return res.status(401).json({ message: 'Invalid technician ID' });
        }
        
        res.status(200).json({ message: 'Verification successful' });
    } catch (error) {
        console.error('Error verifying technician:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get service requests for a specific technician
router.get('/technician-service-requests/:technicianId', async (req, res) => {
    try {
        const { technicianId } = req.params;
        
        const query = `
            SELECT request_id, description, status, date_created as date
            FROM service_requests 
            WHERE technician_id = ?
            ORDER BY date_created DESC
        `;
        
        const [requests] = await db.query(query, [technicianId]);
        
        res.json(requests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


