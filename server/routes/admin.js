const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { authenticateAdmin } = require('../middleware/auth');
const db = require('../config/database');
const mailjet = require('node-mailjet');
const { randomUUID } = require('crypto');

// Image grid captcha store: { id -> { correctIndices, expiresAt, timeout } }
const captchaStore = new Map();

// Emoji categories for captcha challenges
const captchaCategories = [
    { name: 'cars', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑'], label: 'cars' },
    { name: 'animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'], label: 'animals' },
    { name: 'food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🍳'], label: 'food' },
    { name: 'fruits', emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒'], label: 'fruits' },
    { name: 'trees', emojis: ['🌲', '🌳', '🌴', '🌱', '🌿', '🍀', '🎋', '🎍'], label: 'trees' },
];

function createCaptcha() {
    const id = randomUUID();
    
    // Select random category
    const category = captchaCategories[Math.floor(Math.random() * captchaCategories.length)];
    
    // Create 9 grid cells: 3-5 will contain target emojis, rest will be random others
    const numCorrect = 3 + Math.floor(Math.random() * 3); // 3-5 correct items
    const correctIndices = [];
    const images = [];
    
    // Get all other emojis (not from selected category)
    const otherEmojis = captchaCategories
        .filter(cat => cat.name !== category.name)
        .flatMap(cat => cat.emojis);
    
    // Fill grid
    for (let i = 0; i < 9; i++) {
        if (correctIndices.length < numCorrect && (Math.random() > 0.4 || i >= 9 - (numCorrect - correctIndices.length))) {
            // Add correct emoji
            const emoji = category.emojis[Math.floor(Math.random() * category.emojis.length)];
            images.push(emoji);
            correctIndices.push(i);
        } else {
            // Add random other emoji
            const emoji = otherEmojis[Math.floor(Math.random() * otherEmojis.length)];
            images.push(emoji);
        }
    }
    
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const timeout = setTimeout(() => captchaStore.delete(id), 5 * 60 * 1000);
    captchaStore.set(id, { correctIndices, expiresAt, timeout });
    
    return { id, images, challenge: category.label };
}

function verifyCaptcha(id, selectedIndices) {
    if (!id || !selectedIndices) return false;
    const entry = captchaStore.get(id);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
        clearTimeout(entry.timeout);
        captchaStore.delete(id);
        return false;
    }
    
    // Convert to arrays and sort for comparison
    const selected = Array.isArray(selectedIndices) ? selectedIndices.sort() : [];
    const correct = entry.correctIndices.sort();
    
    // Must match exactly
    const ok = selected.length === correct.length && 
               selected.every((val, idx) => val === correct[idx]);
    
    if (ok) {
        clearTimeout(entry.timeout);
        captchaStore.delete(id);
    }

    return ok;
}

// Initialize Mailjet
const mailjetClient = mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

// Get admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        console.log('=== GET /profile called ===');
        console.log('User ID from token:', req.user.id);
        console.log('User role from token:', req.user.role);
        
        const [rows] = await db.query(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
            [req.user.id]
        );
        
        console.log('Database query result:', rows);
        
        if (rows.length === 0) {
            console.log('❌ No user found with ID:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✓ Sending profile data:', rows[0]);
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

// Request verification code for password change
router.post('/request-password-change', authenticateAdmin, async (req, res) => {
    try {
        console.log('=== Password change request received ===');
        console.log('User ID:', req.user?.id);
        
        // Note: Captcha should already be verified via /verify-captcha endpoint
        // This endpoint now just sends the verification code

        // Get user info
        const [rows] = await db.query(
            'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = rows[0];
        
        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Delete any existing password reset tokens for this user
        await db.query(
            'DELETE FROM verification_tokens WHERE user_id = ? AND type = ?',
            [user.id, 'password_reset']
        );
        
        // Store verification code (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await db.query(
            'INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
            [user.id, verificationCode, 'password_reset', expiresAt]
        );
        
        // Send verification code via email
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
                            Subject: 'Password Change Verification Code',
                            TextPart: `Hello ${user.first_name},\n\nYour verification code for password change is: ${verificationCode}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nServiceEase Team`,
                            HTMLPart: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #1f2937;">Password Change Verification</h2>
                                    <p>Hello ${user.first_name},</p>
                                    <p>Your verification code for password change is:</p>
                                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
                                        <h1 style="color: #1f2937; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
                                    </div>
                                    <p style="color: #dc2626;">This code will expire in 10 minutes.</p>
                                    <p style="color: #6b7280;">If you did not request this, please ignore this email.</p>
                                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                                    <p style="color: #6b7280; font-size: 12px;">Best regards,<br>ServiceEase Team</p>
                                </div>
                            `
                        }
                    ]
                });
            console.log(`Verification code sent to ${user.email}`);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            return res.status(500).json({ error: 'Failed to send verification code' });
        }
        
        res.json({ 
            message: 'Verification code sent to your email',
            email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email for privacy
        });
        console.log('=== Password change request completed successfully ===');
    } catch (error) {
        console.error('=== Error requesting password change ===', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Verify captcha selection (separate endpoint for cleaner UX)
router.post('/verify-captcha', authenticateAdmin, (req, res) => {
    try {
        const { captchaId, selectedIndices } = req.body || {};
        console.log('Captcha verification request:', { captchaId, selectedIndices });
        
        if (!captchaId || !selectedIndices) {
            return res.status(400).json({ error: 'Captcha ID and selections required', verified: false });
        }
        
        const verified = verifyCaptcha(captchaId, selectedIndices);
        console.log('Captcha verification result:', verified);
        
        if (verified) {
            res.json({ verified: true, message: 'Captcha verified successfully' });
        } else {
            res.status(400).json({ verified: false, error: 'Incorrect selection' });
        }
    } catch (err) {
        console.error('Error verifying captcha:', err);
        res.status(500).json({ error: 'Verification failed', verified: false });
    }
});

// Verify a provided verification code (without changing password)
router.post('/verify-password-code', authenticateAdmin, async (req, res) => {
    try {
        const { verificationCode } = req.body || {};
        if (!verificationCode) return res.status(400).json({ error: 'Verification code required' });

        const [tokenRows] = await db.query(
            'SELECT id, expires_at FROM verification_tokens WHERE user_id = ? AND token = ? AND type = ?',
            [req.user.id, verificationCode, 'password_reset']
        );

        if (tokenRows.length === 0) return res.status(400).json({ error: 'Invalid verification code' });
        const tokenData = tokenRows[0];
        if (new Date() > new Date(tokenData.expires_at)) {
            await db.query('DELETE FROM verification_tokens WHERE id = ?', [tokenData.id]);
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        res.json({ message: 'Verification code is valid' });
    } catch (err) {
        console.error('Error verifying code', err);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

// Endpoint to get a fresh image grid captcha (authenticated)
router.get('/captcha/new', authenticateAdmin, (req, res) => {
    try {
        console.log('Captcha requested by user:', req.user?.id);
        const { id, images, challenge } = createCaptcha();
        console.log('Captcha generated:', { id, challenge, imageCount: images.length });
        res.json({ id, images, challenge });
    } catch (err) {
        console.error('Error generating captcha', err);
        res.status(500).json({ error: 'Failed to generate captcha' });
    }
});

// Update admin password
router.put('/password', authenticateAdmin, async (req, res) => {
    try {
        console.log('=== PASSWORD UPDATE REQUEST ===');
        console.log('Request body:', req.body);
        console.log('User ID:', req.user.id);
        
        const { currentPassword, newPassword, confirmPassword, verificationCode } = req.body;

        console.log('Verification code received:', verificationCode);

        if (!currentPassword || !newPassword || !confirmPassword || !verificationCode) {
            console.log('❌ Missing fields:', {
                currentPassword: !!currentPassword,
                newPassword: !!newPassword,
                confirmPassword: !!confirmPassword,
                verificationCode: !!verificationCode
            });
            return res.status(400).json({ error: 'All fields including verification code are required' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Verify the verification code (but don't delete it yet)
        const [tokenRows] = await db.query(
            'SELECT id, expires_at FROM verification_tokens WHERE user_id = ? AND token = ? AND type = ?',
            [req.user.id, verificationCode, 'password_reset']
        );
        
        if (tokenRows.length === 0) {
            console.log('❌ No verification code found in database for user:', req.user.id);
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        
        const tokenData = tokenRows[0];
        console.log('✓ Verification code found:', tokenData);
        
        // Check if code has expired
        if (new Date() > new Date(tokenData.expires_at)) {
            console.log('❌ Verification code expired');
            await db.query('DELETE FROM verification_tokens WHERE id = ?', [tokenData.id]);
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }
        
        console.log('✓ Verification code is valid');
        
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
        
        // Update password and increment token_version to invalidate all existing sessions
        // Increment token_version to invalidate all existing JWT tokens for this user
        await db.query(
            'UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?',
            [hashedPassword, req.user.id]
        );
        
        console.log('✓ Password updated successfully');
        console.log('✓ Token version incremented - all existing sessions invalidated');
        
        // NOW delete the used verification code (after successful password update)
        await db.query('DELETE FROM verification_tokens WHERE id = ?', [tokenData.id]);
        console.log('✓ Verification code deleted from database');
        
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



