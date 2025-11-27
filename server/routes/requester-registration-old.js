const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { sendRequesterVerificationEmail, sendRequesterApprovedEmail, sendRequesterRejectedEmail } = require('../utils/emailService');
const { auth } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Validate printer serial numbers and brands against institution inventory
 * POST /api/requester-registration/validate-printers
 */
router.post('/validate-printers', async (req, res) => {
    try {
        const { institution_id, printers } = req.body;
        // printers = [{ serial_number, brand }, ...]
        
        if (!institution_id || !printers || !Array.isArray(printers)) {
            return res.status(400).json({ error: 'Institution ID and printers array required' });
        }
        
        console.log('🔍 Validating printers for institution:', institution_id);
        console.log('Printers to validate:', printers);
        
        const validated = [];
        const notFound = [];
        
        for (const printer of printers) {
            const { serial_number, brand } = printer;
            
            if (!serial_number || !brand) {
                notFound.push({ serial_number: serial_number || 'N/A', brand: brand || 'N/A', reason: 'Missing data' });
                continue;
            }
            
            // Check if printer exists in institution's inventory via client_printer_assignments
            const [matches] = await db.query(
                `SELECT 
                    ii.id,
                    ii.name,
                    ii.brand,
                    ii.model,
                    ii.serial_number,
                    cpa.location_note
                FROM client_printer_assignments cpa
                INNER JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
                WHERE cpa.institution_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
                AND LOWER(TRIM(ii.serial_number)) = LOWER(TRIM(?))
                AND LOWER(TRIM(ii.brand)) LIKE LOWER(TRIM(?))
                AND ii.category = 'printer'`,
                [institution_id, serial_number, `%${brand}%`]
            );
            
            if (matches.length > 0) {
                validated.push({
                    ...printer,
                    inventory_item_id: matches[0].id,
                    name: matches[0].name,
                    model: matches[0].model,
                    location: matches[0].location_note,
                    matched: true
                });
            } else {
                notFound.push({ serial_number, brand, reason: 'Not found in institution inventory' });
            }
        }
        
        console.log(`✅ Validated ${validated.length}/${printers.length} printers`);
        
        res.json({
            validated,
            notFound,
            allValid: notFound.length === 0
        });
        
    } catch (error) {
        console.error('❌ Printer validation error:', error);
        res.status(500).json({ error: 'Failed to validate printers' });
    }
});

/**
 * Submit requester registration
 * POST /api/requester-registration/submit
 */
router.post('/submit', upload.fields([
    { name: 'id_front', maxCount: 1 },
    { name: 'id_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            institution_id,
            institution_type,
            printer_serial_numbers // JSON string
        } = req.body;
        
        console.log('📝 Requester registration submission:', { first_name, last_name, email, institution_id });
        
        // Validate required fields
        if (!first_name || !last_name || !email || !password || !institution_id || !printer_serial_numbers) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if email already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Check if email already in pending registrations
        const [existingRegs] = await db.query(
            'SELECT id FROM requester_registrations WHERE email = ? AND status != "rejected"',
            [email]
        );
        
        if (existingRegs.length > 0) {
            return res.status(400).json({ error: 'Registration already pending for this email' });
        }
        
        // Parse printer serial numbers
        let printers;
        try {
            printers = JSON.parse(printer_serial_numbers);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid printer data format' });
        }
        
        // Validate printers exist in institution
        const validated = [];
        for (const printer of printers) {
            const [matches] = await db.query(
                `SELECT ii.id
                FROM client_printer_assignments cpa
                INNER JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
                WHERE cpa.institution_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
                AND LOWER(TRIM(ii.serial_number)) = LOWER(TRIM(?))
                AND LOWER(TRIM(ii.brand)) LIKE LOWER(TRIM(?))`,
                [institution_id, printer.serial_number, `%${printer.brand}%`]
            );
            
            if (matches.length > 0) {
                validated.push(matches[0].id);
            }
        }
        
        if (validated.length === 0) {
            return res.status(400).json({ error: 'No matching printers found in institution inventory' });
        }
        
        // Upload ID photos to Cloudinary
        let id_front_url = null;
        let id_back_url = null;
        let selfie_url = null;
        
        if (req.files) {
            if (req.files.id_front) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_registrations/id_front' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.id_front[0].buffer);
                });
                id_front_url = result.secure_url;
            }
            
            if (req.files.id_back) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_registrations/id_back' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.id_back[0].buffer);
                });
                id_back_url = result.secure_url;
            }
            
            if (req.files.selfie) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_registrations/selfie' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.selfie[0].buffer);
                });
                selfie_url = result.secure_url;
            }
        }
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        // Generate 6-digit verification code
        const email_verification_code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Insert registration
        const [result] = await db.query(
            `INSERT INTO requester_registrations (
                first_name, last_name, email, password_hash,
                institution_id, institution_type,
                printer_serial_numbers, matched_printer_ids,
                id_front_url, id_back_url, selfie_url,
                email_verification_code, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification')`,
            [
                first_name, last_name, email, password_hash,
                institution_id, institution_type,
                JSON.stringify(printers), JSON.stringify(validated),
                id_front_url, id_back_url, selfie_url,
                email_verification_code
            ]
        );
        
        // Send verification code email
        await sendRequesterVerificationEmail(email, email_verification_code, first_name);
        
        console.log('✅ Requester registration created, ID:', result.insertId);
        
        res.json({
            message: 'Registration submitted successfully. Please check your email for the verification code.',
            registration_id: result.insertId
        });
        
    } catch (error) {
        console.error('❌ Requester registration error:', error);
        res.status(500).json({ error: 'Failed to submit registration' });
    }
});

/**
 * Verify email with 6-digit code
 * POST /api/requester-registration/verify-code
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { registration_id, code } = req.body;
        
        if (!registration_id || !code) {
            return res.status(400).json({ error: 'Registration ID and code required' });
        }
        
        const [registrations] = await db.query(
            'SELECT * FROM requester_registrations WHERE id = ? AND status = "pending_verification"',
            [registration_id]
        );
        
        if (registrations.length === 0) {
            return res.status(400).json({ error: 'Registration not found or already verified' });
        }
        
        const registration = registrations[0];
        
        // Check if code matches
        if (registration.email_verification_code !== code.toString()) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        
        // Update status to pending coordinator approval
        await db.query(
            `UPDATE requester_registrations 
             SET email_verified = TRUE, 
                 email_verified_at = NOW(), 
                 status = 'pending_coordinator'
             WHERE id = ?`,
            [registration_id]
        );
        
        // Create notification for coordinator
        const [institution] = await db.query(
            'SELECT user_id, name FROM institutions WHERE institution_id = ?',
            [registration.institution_id]
        );
        
        if (institution.length > 0 && institution[0].user_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, reference_id)
                 VALUES (?, 'requester_registration', 'New Requester Registration', ?, ?)`,
                [
                    institution[0].user_id,
                    `${registration.first_name} ${registration.last_name} has registered and is awaiting your approval.`,
                    registration_id
                ]
            );
        }
        
        console.log('✅ Email verified with code for registration ID:', registration_id);
        
        res.json({ message: 'Email verified successfully. Your registration is now pending coordinator approval.' });
        
    } catch (error) {
        console.error('❌ Code verification error:', error);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

/**
 * Verify email for requester registration (legacy token-based)
 * GET /api/requester-registration/verify-email/:token
 */
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const [registrations] = await db.query(
            'SELECT * FROM requester_registrations WHERE email_verification_token = ? AND status = "pending_verification"',
            [token]
        );
        
        if (registrations.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        
        // Update status to pending coordinator approval
        await db.query(
            `UPDATE requester_registrations 
             SET email_verified = TRUE, 
                 email_verified_at = NOW(), 
                 status = 'pending_coordinator'
             WHERE id = ?`,
            [registrations[0].id]
        );
        
        // Create notification for coordinator
        const [institution] = await db.query(
            'SELECT user_id, name FROM institutions WHERE institution_id = ?',
            [registrations[0].institution_id]
        );
        
        if (institution.length > 0 && institution[0].user_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, reference_id)
                 VALUES (?, 'requester_registration', 'New Requester Registration', ?, ?)`,
                [
                    institution[0].user_id,
                    `${registrations[0].first_name} ${registrations[0].last_name} has registered and is awaiting your approval.`,
                    registrations[0].id
                ]
            );
        }
        
        console.log('✅ Email verified for registration ID:', registrations[0].id);
        
        res.json({ message: 'Email verified successfully. Your registration is now pending coordinator approval.' });
        
    } catch (error) {
        console.error('❌ Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

/**
 * Get pending requester registrations for coordinator
 * GET /api/requester-registration/pending
 */
router.get('/pending', auth, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        // Get coordinator's institutions
        const [institutions] = await db.query(
            'SELECT institution_id FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        
        if (institutions.length === 0) {
            return res.json([]);
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        const [registrations] = await db.query(
            `SELECT 
                rr.*,
                i.name as institution_name
            FROM requester_registrations rr
            INNER JOIN institutions i ON rr.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            WHERE rr.institution_id IN (?)
            AND rr.status = 'pending_coordinator'
            ORDER BY rr.created_at DESC`,
            [institutionIds]
        );
        
        // Parse JSON fields
        registrations.forEach(reg => {
            reg.printer_serial_numbers = JSON.parse(reg.printer_serial_numbers || '[]');
            reg.matched_printer_ids = JSON.parse(reg.matched_printer_ids || '[]');
        });
        
        res.json(registrations);
        
    } catch (error) {
        console.error('❌ Error fetching pending registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

/**
 * Get requester registration history for coordinator
 * GET /api/requester-registration/history
 */
router.get('/history', auth, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        const [institutions] = await db.query(
            'SELECT institution_id FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        
        if (institutions.length === 0) {
            return res.json([]);
        }
        
        const institutionIds = institutions.map(i => i.institution_id);
        
        const [registrations] = await db.query(
            `SELECT 
                rr.*,
                i.name as institution_name
            FROM requester_registrations rr
            INNER JOIN institutions i ON rr.institution_id COLLATE utf8mb4_unicode_ci = i.institution_id
            WHERE rr.institution_id IN (?)
            AND rr.status IN ('approved', 'rejected')
            ORDER BY rr.updated_at DESC`,
            [institutionIds]
        );
        
        registrations.forEach(reg => {
            reg.printer_serial_numbers = JSON.parse(reg.printer_serial_numbers || '[]');
            reg.matched_printer_ids = JSON.parse(reg.matched_printer_ids || '[]');
        });
        
        res.json(registrations);
        
    } catch (error) {
        console.error('❌ Error fetching registration history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Approve requester registration
 * POST /api/requester-registration/:id/approve
 */
router.post('/:id/approve', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const coordinatorId = req.user.id;
        
        const [registrations] = await db.query(
            'SELECT * FROM requester_registrations WHERE id = ? AND status = "pending_coordinator"',
            [id]
        );
        
        if (registrations.length === 0) {
            return res.status(404).json({ error: 'Registration not found or already processed' });
        }
        
        const registration = registrations[0];
        const matched_printer_ids = JSON.parse(registration.matched_printer_ids || '[]');
        
        // Create user account
        const [userResult] = await db.query(
            `INSERT INTO users (
                first_name, last_name, email, password, role,
                status, approval_status, approved_at, approved_by
            ) VALUES (?, ?, ?, ?, 'requester', 'active', 'approved', NOW(), ?)`,
            [
                registration.first_name,
                registration.last_name,
                registration.email,
                registration.password_hash,
                coordinatorId
            ]
        );
        
        const newUserId = userResult.insertId;
        
        // Assign printers to user
        for (const printer_id of matched_printer_ids) {
            await db.query(
                `INSERT INTO user_printer_assignments (user_id, inventory_item_id, institution_id, assigned_at)
                 VALUES (?, ?, ?, NOW())`,
                [newUserId, printer_id, registration.institution_id]
            );
        }
        
        // Update registration status
        await db.query(
            `UPDATE requester_registrations 
             SET status = 'approved',
                 coordinator_reviewed_at = NOW(),
                 coordinator_reviewed_by = ?
             WHERE id = ?`,
            [coordinatorId, id]
        );
        
        // Send approval email
        await sendRequesterApprovedEmail(
            registration.email,
            registration.first_name,
            matched_printer_ids.length
        );
        
        console.log('✅ Requester registration approved, user ID:', newUserId);
        
        res.json({ 
            message: 'Registration approved successfully',
            user_id: newUserId
        });
        
    } catch (error) {
        console.error('❌ Approval error:', error);
        res.status(500).json({ error: 'Failed to approve registration' });
    }
});

/**
 * Reject requester registration
 * POST /api/requester-registration/:id/reject
 */
router.post('/:id/reject', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const coordinatorId = req.user.id;
        
        const [registrations] = await db.query(
            'SELECT * FROM requester_registrations WHERE id = ? AND status = "pending_coordinator"',
            [id]
        );
        
        if (registrations.length === 0) {
            return res.status(404).json({ error: 'Registration not found or already processed' });
        }
        
        const registration = registrations[0];
        
        await db.query(
            `UPDATE requester_registrations 
             SET status = 'rejected',
                 coordinator_reviewed_at = NOW(),
                 coordinator_reviewed_by = ?,
                 coordinator_notes = ?
             WHERE id = ?`,
            [coordinatorId, notes, id]
        );
        
        // Send rejection email
        await sendRequesterRejectedEmail(
            registration.email,
            registration.first_name,
            notes
        );
        
        console.log('✅ Requester registration rejected, ID:', id);
        
        res.json({ message: 'Registration rejected' });
        
    } catch (error) {
        console.error('❌ Rejection error:', error);
        res.status(500).json({ error: 'Failed to reject registration' });
    }
});

module.exports = router;

/**
 * Dev-only: find a requester registration by email (for debugging)
 * GET /api/requester-registration/dev/find-by-email?email=
 * NOTE: This endpoint is only enabled when NODE_ENV !== 'production'
 */
if (process.env.NODE_ENV !== 'production') {
    router.get('/dev/find-by-email', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) return res.status(400).json({ error: 'email query param required' });

            const [rows] = await db.query(
                `SELECT id, first_name, last_name, email, status, institution_id, printer_serial_numbers, matched_printer_ids, email_verification_token, created_at, updated_at
                 FROM requester_registrations
                 WHERE email = ?
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [email]
            );

            if (rows.length === 0) return res.status(404).json({ error: 'Registration not found' });

            const reg = rows[0];
            // parse JSON fields safely
            try { reg.printer_serial_numbers = JSON.parse(reg.printer_serial_numbers || '[]'); } catch (e) { reg.printer_serial_numbers = []; }
            try { reg.matched_printer_ids = JSON.parse(reg.matched_printer_ids || '[]'); } catch (e) { reg.matched_printer_ids = []; }

            res.json(reg);
        } catch (err) {
            console.error('Dev lookup error:', err);
            res.status(500).json({ error: 'Failed to lookup registration' });
        }
    });
}
