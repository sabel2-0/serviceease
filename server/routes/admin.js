const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { authenticateAdmin } = require('../middleware/auth');
const db = require('../config/database');
const mailjet = require('node-mailjet');

// Initialize Mailjet
const mailjetClient = mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

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
        const { currentPassword, newPassword, confirmPassword, recaptchaToken } = req.body;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All password fields are required' });
        }
        
        if (!recaptchaToken) {
            return res.status(400).json({ error: 'Please complete the CAPTCHA verification' });
        }
        
        // Verify reCAPTCHA (using test key - will always pass in development)
        // In production, replace with your actual secret key
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
        try {
            const recaptchaVerify = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify`,
                null,
                {
                    params: {
                        secret: recaptchaSecret,
                        response: recaptchaToken
                    }
                }
            );
            
            if (!recaptchaVerify.data.success) {
                return res.status(400).json({ error: 'CAPTCHA verification failed' });
            }
        } catch (captchaError) {
            console.error('CAPTCHA verification error:', captchaError);
            return res.status(500).json({ error: 'CAPTCHA verification failed' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Get current password hash and user info
        const [rows] = await db.query(
            'SELECT password, email, first_name, last_name FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = rows[0];
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
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
        
        // Send confirmation email via Mailjet
        try {
            await mailjetClient
                .post('send', { version: 'v3.1' })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: process.env.EMAIL_USER || 'serviceeaseph@gmail.com',
                                Name: 'ServiceEase'
                            },
                            To: [
                                {
                                    Email: user.email,
                                    Name: `${user.first_name} ${user.last_name}`
                                }
                            ],
                            Subject: 'Password Changed Successfully',
                            TextPart: `Hello ${user.first_name},\n\nYour password has been changed successfully.\n\nIf you did not make this change, please contact support immediately.\n\nBest regards,\nServiceEase Team`,
                            HTMLPart: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #1f2937;">Password Changed Successfully</h2>
                                    <p>Hello ${user.first_name},</p>
                                    <p>Your password has been changed successfully on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.</p>
                                    <p style="color: #dc2626; font-weight: bold;">If you did not make this change, please contact support immediately.</p>
                                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                                    <p style="color: #6b7280; font-size: 12px;">Best regards,<br>ServiceEase Team</p>
                                </div>
                            `
                        }
                    ]
                });
            console.log(`Password change confirmation email sent to ${user.email}`);
        } catch (emailError) {
            console.error('Error sending password change email:', emailError);
            // Don't fail the request if email fails, password is already changed
        }
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating admin password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
