const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { sendRequesterVerificationEmail } = require('../utils/emailService');
const { auth } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Send verification code to email
 * POST /api/requester-registration/send-code
 */
router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Check if email already exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Delete any existing verification codes for this email
        await db.query(
            'DELETE FROM verification_tokens WHERE token = ? AND type = "email"',
            [email]
        );
        
        // Store code (using token field for email, code field for the code, user_id is NULL before registration)
        await db.query(
            'INSERT INTO verification_tokens (user_id, token, code, type, expires_at) VALUES (NULL, ?, ?, "email", ?)',
            [email, code, expires_at]
        );
        
        // Send email (do not let email failures cause a 500)
        let emailSent = false;
        try {
            await sendRequesterVerificationEmail(email, code, 'User');
            emailSent = true;
            console.log('✅ Verification code sent to:', email);
        } catch (emailErr) {
            console.error('⚠️ Failed to send verification email (continuing):', emailErr);
        }

        res.json({ message: 'Verification code stored', email_sent: emailSent });
        
    } catch (error) {
        console.error('❌ Send code error:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
});

/**
 * Verify code
 * POST /api/requester-registration/verify-code
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }
        
        const [tokens] = await db.query(
            'SELECT * FROM verification_tokens WHERE token = ? AND code = ? AND type = "email" AND expires_at > NOW()',
            [email, code]
        );
        
        if (tokens.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        
        // Mark as used
        await db.query('DELETE FROM verification_tokens WHERE id = ?', [tokens[0].id]);
        
        console.log('✅ Email verified:', email);
        res.json({ message: 'Email verified successfully', verified: true });
        
    } catch (error) {
        console.error('❌ Verify code error:', error);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

/**
 * Validate printer serial numbers and brands against institution inventory
 * POST /api/requester-registration/validate-printers
 */
router.post('/validate-printers', async (req, res) => {
    try {
        const { institution_id, printers } = req.body;
        
        if (!institution_id || !printers || !Array.isArray(printers)) {
            return res.status(400).json({ error: 'Institution ID and printers array required' });
        }
        
        console.log('🔍 Validating printers for institution:', institution_id);
        
        const validated = [];
        const notFound = [];
        
        for (const printer of printers) {
            const { serial_number, brand } = printer;
            
            if (!serial_number || !brand) {
                notFound.push({ serial_number: serial_number || 'N/A', brand: brand || 'N/A', reason: 'Missing data' });
                continue;
            }
            
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
        res.json({ validated, notFound, allValid: notFound.length === 0 });
        
    } catch (error) {
        console.error('❌ Printer validation error:', error);
        res.status(500).json({ error: 'Failed to validate printers' });
    }
});

/**
 * Submit requester registration (direct to users table)
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
            department,
            institution_id,
            institution_type,
            printer_serial_numbers,
            email_verified // Must be true from frontend
        } = req.body;
        
        console.log('📝 Requester registration submission:', { first_name, last_name, email, institution_id });
        
        // Validate required fields
        if (!first_name || !last_name || !email || !password || !institution_id || !printer_serial_numbers) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Ensure email was verified
        if (email_verified !== 'true') {
            return res.status(400).json({ error: 'Please verify your email first' });
        }
        
        // Check if email already exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
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
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        // Insert user directly into users table (pending coordinator approval)
        // Note: Institution info will be retrieved via user_printer_assignments JOIN
        const [result] = await db.query(
            `INSERT INTO users (
                first_name, last_name, email, password, role,
                email_verified_at, approval_status, is_email_verified
            ) VALUES (?, ?, ?, ?, 'requester', NOW(), 'pending', TRUE)`,
            [first_name, last_name, email, password_hash]
        );
        
        const newUserId = result.insertId;
        
        // Upload ID photos to Cloudinary and save to temp_user_photos
        let front_id_photo = null;
        let back_id_photo = null;
        let selfie_photo = null;
        
        if (req.files) {
            if (req.files.id_front) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_ids/id_front' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.id_front[0].buffer);
                });
                front_id_photo = uploadResult.secure_url;
            }
            
            if (req.files.id_back) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_ids/id_back' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.id_back[0].buffer);
                });
                back_id_photo = uploadResult.secure_url;
            }
            
            if (req.files.selfie) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'requester_ids/selfie' },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    uploadStream.end(req.files.selfie[0].buffer);
                });
                selfie_photo = uploadResult.secure_url;
            }
            
            // Save photos to temp_user_photos table
            await db.query(
                `INSERT INTO temp_user_photos (user_id, front_id_photo, back_id_photo, selfie_photo)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 front_id_photo = VALUES(front_id_photo),
                 back_id_photo = VALUES(back_id_photo),
                 selfie_photo = VALUES(selfie_photo)`,
                [newUserId, front_id_photo, back_id_photo, selfie_photo]
            );
            
            console.log('✅ Photos uploaded to Cloudinary and saved to temp_user_photos for user:', newUserId);
        }
        
        // Assign printers to user
        for (const printer_id of validated) {
            await db.query(
                `INSERT INTO user_printer_assignments (user_id, inventory_item_id, institution_id, department, assigned_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [newUserId, printer_id, institution_id, department]
            );
        }
        
        // Create notification for coordinator
        const [coordinators] = await db.query(
            'SELECT user_id FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        if (coordinators.length > 0 && coordinators[0].user_id) {
            await db.query(
                `INSERT INTO notifications (user_id, type, title, message, reference_id)
                 VALUES (?, 'requester_registration', 'New Requester Registration', ?, ?)`,
                [
                    coordinators[0].user_id,
                    `${first_name} ${last_name} has registered and is awaiting your approval.`,
                    newUserId
                ]
            );
        }
        
        console.log('✅ Requester created, user ID:', newUserId);
        
        res.json({
            message: 'Registration submitted successfully. Your account is pending coordinator approval.',
            user_id: newUserId
        });
        
    } catch (error) {
        console.error('❌ Requester registration error:', error);
        res.status(500).json({ error: 'Failed to submit registration' });
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
        
        console.log('🔍 Coordinator institutions:', institutionIds);
        
        // Get pending requesters from users table with photos from temp_user_photos
        // Institution info is retrieved via user_printer_assignments JOIN
        const [requesters] = await db.query(
            `SELECT 
                u.*,
                tp.front_id_photo,
                tp.back_id_photo,
                tp.selfie_photo,
                GROUP_CONCAT(DISTINCT i.name) as institution_names,
                GROUP_CONCAT(DISTINCT upa.institution_id) as institution_ids,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'serial_number', ii.serial_number,
                        'brand', ii.brand,
                        'model', ii.model,
                        'name', ii.name,
                        'department', cpa.department
                    ))
                    FROM user_printer_assignments cpa
                    INNER JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
                    WHERE cpa.user_id = u.id
                ) AS printer_serial_numbers
            FROM users u
            LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
            LEFT JOIN user_printer_assignments upa ON u.id = upa.user_id
            LEFT JOIN institutions i ON upa.institution_id = i.institution_id
            WHERE u.role = 'requester'
            AND u.approval_status = 'pending'
            AND upa.institution_id IN (?)
            GROUP BY u.id
            ORDER BY u.created_at DESC`,
            [institutionIds]
        );
        
        console.log('✅ Found pending requesters:', requesters.length);
        
        res.json(requesters);
        
    } catch (error) {
        console.error('❌ Error fetching pending registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

/**
 * Approve requester
 * POST /api/requester-registration/:id/approve
 */
router.post('/:id/approve', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const coordinatorId = req.user.id;
        // Get user info before update
        const [[user]] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [id]);
        // Get assigned printers count
        const [printerRows] = await db.query('SELECT COUNT(*) as count FROM user_printer_assignments WHERE user_id = ?', [id]);
        const printerCount = printerRows[0]?.count || 0;
        // Get photos before deleting
        const [photos] = await db.query(
            'SELECT front_id_photo, back_id_photo, selfie_photo FROM temp_user_photos WHERE user_id = ?',
            [id]
        );
        // Update user approval status
        await db.query(
            `UPDATE users 
             SET approval_status = 'approved',
                 approved_by = ?,
                 approved_at = NOW()
             WHERE id = ? AND role = 'requester' AND approval_status = 'pending'`,
            [coordinatorId, id]
        );
        // Delete photos from Cloudinary
        if (photos && photos[0]) {
            const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo'];
            for (const field of photoFields) {
                if (photos[0][field]) {
                    try {
                        // Extract public_id from Cloudinary URL
                        const urlParts = photos[0][field].split('/');
                        const uploadIndex = urlParts.indexOf('upload');
                        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
                            const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
                            const publicId = pathAfterUpload.split('.')[0];
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`🗑️ Deleted Cloudinary image: ${publicId}`);
                        }
                    } catch (err) {
                        console.error(`Error deleting Cloudinary image:`, err);
                    }
                }
            }
        }
        // Delete from temp_user_photos table
        await db.query('DELETE FROM temp_user_photos WHERE user_id = ?', [id]);
        // Send approval email
        if (user && user.email) {
            const { sendRequesterApprovedEmail } = require('../utils/emailService');
            try {
                await sendRequesterApprovedEmail(user.email, user.first_name || 'User', printerCount);
            } catch (e) {
                console.error('❌ Failed to send approval email:', e);
            }
        }
        console.log('✅ Requester approved and photos deleted, user ID:', id);
        res.json({ message: 'Registration approved successfully' });
    } catch (error) {
        console.error('❌ Approval error:', error);
        res.status(500).json({ error: 'Failed to approve registration' });
    }
});

/**
 * Reject requester
 * POST /api/requester-registration/:id/reject
 */
router.post('/:id/reject', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const coordinatorId = req.user.id;
        const { notes } = req.body;
        // Get user info before deletion
        const [[user]] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        // Get photos before deleting
        const [photos] = await db.query(
            'SELECT front_id_photo, back_id_photo, selfie_photo FROM temp_user_photos WHERE user_id = ?',
            [id]
        );
        // Store rejected registration in history table before deleting
        await db.query(`CREATE TABLE IF NOT EXISTS requester_registration_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            email VARCHAR(255),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            department VARCHAR(255),
            institution_id VARCHAR(50),
            status ENUM('approved','rejected') NOT NULL,
            rejection_reason TEXT,
            reviewed_by INT,
            reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
        // Get department from user_printer_assignments
        const [upa] = await db.query('SELECT department, institution_id FROM user_printer_assignments WHERE user_id = ? LIMIT 1', [user.id]);
        const department = upa[0]?.department || null;
        const institution_id = upa[0]?.institution_id || null;
        await db.query(
            `INSERT INTO requester_registration_history (user_id, email, first_name, last_name, department, institution_id, status, rejection_reason, reviewed_by, reviewed_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'rejected', ?, ?, NOW(), ?)`,
            [user.id, user.email, user.first_name, user.last_name, department, institution_id, notes || '', coordinatorId, user.created_at]
        );
        // Delete photos from Cloudinary
        if (photos && photos[0]) {
            const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo'];
            for (const field of photoFields) {
                if (photos[0][field]) {
                    try {
                        // Extract public_id from Cloudinary URL
                        const urlParts = photos[0][field].split('/');
                        const uploadIndex = urlParts.indexOf('upload');
                        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
                            const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
                            const publicId = pathAfterUpload.split('.')[0];
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`🗑️ Deleted Cloudinary image: ${publicId}`);
                        }
                    } catch (err) {
                        console.error(`Error deleting Cloudinary image:`, err);
                    }
                }
            }
        }
        // Delete from temp_user_photos table
        await db.query('DELETE FROM temp_user_photos WHERE user_id = ?', [id]);
        // Delete user and related records
        await db.query('DELETE FROM user_printer_assignments WHERE user_id = ?', [id]);
        await db.query('DELETE FROM users WHERE id = ? AND role = "requester"', [id]);
        // Send rejection email
        if (user && user.email) {
            const { sendRequesterRejectedEmail } = require('../utils/emailService');
            try {
                await sendRequesterRejectedEmail(user.email, user.first_name || 'User', notes || '');
            } catch (e) {
                console.error('❌ Failed to send rejection email:', e);
            }
        }
        console.log('✅ Requester rejected and deleted, user ID:', id);
        res.json({ message: 'Registration rejected and removed' });
    } catch (error) {
        console.error('❌ Rejection error:', error);
        res.status(500).json({ error: 'Failed to reject registration' });
    }
});

/**
 * Get requester registration history for coordinator
 * GET /api/requester-registration/history
 */
router.get('/history', auth, async (req, res) => {
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
        // Get approved/rejected requesters for these institutions
        const [history] = await db.query(
            `SELECT 
                u.*, 
                tp.front_id_photo, tp.back_id_photo, tp.selfie_photo,
                GROUP_CONCAT(DISTINCT i.name) as institution_names,
                GROUP_CONCAT(DISTINCT upa.institution_id) as institution_ids
            FROM users u
            LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
            LEFT JOIN user_printer_assignments upa ON u.id = upa.user_id
            LEFT JOIN institutions i ON upa.institution_id = i.institution_id
            WHERE u.role = 'requester'
            AND u.approval_status IN ('approved', 'rejected')
            AND upa.institution_id IN (?)
            GROUP BY u.id
            ORDER BY u.updated_at DESC`,
            [institutionIds]
        );
        res.json(history);
    } catch (error) {
        console.error('❌ Error fetching requester registration history:', error);
        res.status(500).json({ error: 'Failed to fetch registration history' });
    }
});

module.exports = router;
