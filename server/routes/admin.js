const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update admin profile (name only)
router.put('/profile', authenticateAdmin, async (req, res) => {
    try {
        const { first_name, last_name } = req.body;
        
        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'First name and last name are required' });
        }
        
        await db.query(
            'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
            [first_name, last_name, req.user.id]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update admin password
router.put('/password', authenticateAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All password fields are required' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Get current password hash
        const [rows] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.id]
        );
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating admin password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
