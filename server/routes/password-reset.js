const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { sendPasswordResetEmail } = require('../utils/emailService');

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        console.log('🔐 Password reset requested for:', email);
        
        // Find user by email
        const [users] = await db.query(
            'SELECT id, first_name, last_name, email, role FROM users WHERE email = ? AND status = "active"',
            [email]
        );
        
        if (users.length === 0) {
            // Don't reveal if email exists or not (security best practice)
            return res.json({ 
                message: 'If an account with that email exists, a password reset link has been sent.' 
            });
        }
        
        const user = users[0];
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        // Store token in database
        await db.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
             VALUES (?, ?, ?)`,
            [user.id, resetToken, expiresAt]
        );
        
        // Send email
        await sendPasswordResetEmail(user.email, resetToken, user.first_name);
        
        console.log('✅ Password reset email sent to:', email);
        
        res.json({ 
            message: 'If an account with that email exists, a password reset link has been sent.' 
        });
        
    } catch (error) {
        console.error('❌ Password reset request error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

/**
 * Verify reset token
 * GET /api/auth/verify-reset-token/:token
 */
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const [tokens] = await db.query(
            `SELECT prt.*, u.email, u.first_name 
             FROM password_reset_tokens prt
             INNER JOIN users u ON prt.user_id = u.id
             WHERE prt.token = ? 
             AND prt.used = FALSE 
             AND prt.expires_at > NOW()`,
            [token]
        );
        
        if (tokens.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid or expired reset token',
                expired: true
            });
        }
        
        res.json({ 
            valid: true,
            email: tokens[0].email,
            firstName: tokens[0].first_name
        });
        
    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        
        // Verify token
        const [tokens] = await db.query(
            `SELECT prt.*, u.id as user_id 
             FROM password_reset_tokens prt
             INNER JOIN users u ON prt.user_id = u.id
             WHERE prt.token = ? 
             AND prt.used = FALSE 
             AND prt.expires_at > NOW()`,
            [token]
        );
        
        if (tokens.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid or expired reset token' 
            });
        }
        
        const tokenRecord = tokens[0];
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, tokenRecord.user_id]
        );
        
        // Mark token as used
        await db.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
            [tokenRecord.id]
        );
        
        console.log('✅ Password reset successfully for user:', tokenRecord.user_id);
        
        res.json({ message: 'Password has been reset successfully' });
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
