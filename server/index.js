const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User');
const db = require('./config/database');
require('dotenv').config();

const app = express();

// Create temp directory for uploaded photos if it doesn't exist
const tempPhotosDir = path.join(__dirname, 'temp_photos');
if (!fs.existsSync(tempPhotosDir)) {
    fs.mkdirSync(tempPhotosDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempPhotosDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'client', 'src')));
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));
app.use('/pages', express.static(path.join(__dirname, '..', 'client', 'src', 'pages')));

// Serve static files from the root and src directories
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../client/src')));
app.use('/images', express.static(path.join(__dirname, '../client/public/images')));
app.use('/temp-photos', express.static(tempPhotosDir));

// Ensure printers table exists
async function ensurePrintersTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS printers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                institution_id VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                model VARCHAR(255) DEFAULT NULL,
                serial_number VARCHAR(255) DEFAULT NULL,
                location VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_printers_institution
                    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Ensured printers table exists');
    } catch (err) {
        console.error('Failed to ensure printers table exists:', err);
    }
}

// Ensure inventory tables exist
async function ensureInventoryTables() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category ENUM('printer') NOT NULL DEFAULT 'printer',
                name VARCHAR(255) NOT NULL,
                brand VARCHAR(255) DEFAULT NULL,
                model VARCHAR(255) DEFAULT NULL,
                serial_number VARCHAR(255) UNIQUE,
                location VARCHAR(255) DEFAULT NULL,
                status ENUM('available','assigned','retired') NOT NULL DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        // Ensure brand column exists if table was created previously without it
        const [brandColRows] = await db.query(`
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'inventory_items'
              AND COLUMN_NAME = 'brand'
        `);
        if (brandColRows && brandColRows[0] && Number(brandColRows[0].cnt) === 0) {
            await db.query(`ALTER TABLE inventory_items ADD COLUMN brand VARCHAR(255) NULL AFTER name`);
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS client_printer_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                institution_id VARCHAR(50) NOT NULL,
                inventory_item_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                location_note VARCHAR(255) DEFAULT NULL,
                CONSTRAINT fk_cpa_institution FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE,
                CONSTRAINT fk_cpa_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
                UNIQUE KEY unique_inst_item (institution_id, inventory_item_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('Ensured inventory tables exist');
    } catch (err) {
        console.error('Failed to ensure inventory tables exist:', err);
    }
}
// Initialize printer parts table
async function ensurePrinterPartsTable() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'config', 'printer_parts_schema.sql'), 'utf8');
        await db.executeMultiStatementSql(sql);
        console.log('Ensured printer parts table exists');
    } catch (err) {
        console.error('Failed to ensure printer parts table exists:', err);
    }
}

// Ensure service requests table exists
async function ensureServiceRequestsTables() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'config', 'service_requests_schema.sql'), 'utf8');
        await db.executeMultiStatementSql(sql);
        console.log('Ensured service requests tables exist');
    } catch (err) {
        console.error('Failed to ensure service requests tables exist:', err);
    }
}

// Initialize database tables that must exist
ensurePrintersTable();
ensureInventoryTables();
ensurePrinterPartsTable();
ensureServiceRequestsTables();

// Route for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/login.html'));
});

// Route for login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/login.html'));
});

// Route for register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/register.html'));
});

// Route for register page (alternative path)
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/register.html'));
});

// Route for admin pages
app.get('/pages/admin/:page.html', (req, res) => {
    const filePath = path.join(__dirname, '../client/src/pages/admin', req.params.page + '.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving admin/${req.params.page}.html:`, err);
            res.status(500).send('Error loading page');
        }
    });
});

// Route for operations officer pages (redirected to admin pages)
app.get('/pages/operations-officer/:page.html', (req, res) => {
    // Redirect to the equivalent admin page
    const redirectPath = `/pages/admin/${req.params.page}.html`;
    res.redirect(redirectPath);
});

// Route for technician pages
app.get('/pages/technician/:page.html', (req, res) => {
    const filePath = path.join(__dirname, '../client/src/pages/technician', req.params.page + '.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving technician/${req.params.page}.html:`, err);
            res.status(500).send('Error loading page');
        }
    });
});

// Route for coordinator pages
app.get('/pages/coordinator/:page.html', (req, res) => {
    const filePath = path.join(__dirname, '../client/src/pages/coordinator', req.params.page + '.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving coordinator/${req.params.page}.html:`, err);
            res.status(500).send('Error loading page');
        }
    });
});

// Route for login page (alternative path)
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/login.html'));
});

// Route for staff accounts page
app.get('/pages/admin/staff-accounts.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/admin/staff-accounts.html'));
});

// Route for account management page
app.get('/pages/admin/account-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/src/pages/admin/account-management.html'));
});

// Route for client management page
app.get('/client-management.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'client-management.html');
    console.log('Attempting to serve file:', filePath); // Debug log
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving client-management.html:', err);
            res.status(500).send('Error loading page');
        }
    });
});

// Route for client-printers page
app.get('/client-printers.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'client-printers.html');
    console.log('Attempting to serve file:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving client-printers.html:', err);
            res.status(500).send('Error loading page');
        }
    });
});

// Route for inventory items page
app.get('/inventory-items.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'inventory-items.html');
    console.log('Attempting to serve file:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving inventory-items.html:', err);
            res.status(500).send('Error loading page');
        }
    });
});

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'serviceeaseph@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

// Routes
app.post('/api/register', upload.fields([
    { name: 'frontId', maxCount: 1 },
    { name: 'backId', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
    try {
        const userData = req.body;
        
        // Debug: Log received data (remove password for security)
        console.log('Registration data received:', {
            ...userData,
            password: userData.password ? '[PROVIDED]' : '[MISSING]'
        });
        
        const { userId } = await User.createUser(userData);

        // Save temporary photos if uploaded
        if (req.files) {
            const photoPaths = {
                frontIdPhoto: req.files.frontId ? req.files.frontId[0].filename : null,
                backIdPhoto: req.files.backId ? req.files.backId[0].filename : null,
                selfiePhoto: req.files.selfie ? req.files.selfie[0].filename : null
            };

            await User.saveTemporaryPhotos(userId, photoPaths);
        }

        res.status(201).json({ 
            message: 'Registration successful. Your account is pending admin approval.',
            userId 
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Clean up uploaded files if registration fails
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        const verified = await User.verifyEmail(token);
        
        if (verified) {
            res.json({ message: 'Email verified successfully' });
        } else {
            res.status(400).json({ error: 'Invalid or expired verification token' });
        }
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.validatePassword(email, password);
        console.log('User validation result:', user);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get institution ID if user has institution information
        let institutionId = null;
        if (user.institution_name && user.institution_type) {
            // First try exact match
            const [institutions] = await db.query(
                'SELECT institution_id FROM institutions WHERE name = ? AND type = ? LIMIT 1',
                [user.institution_name, user.institution_type]
            );
            
            if (institutions && institutions.length > 0) {
                institutionId = institutions[0].institution_id;
            } else {
                // Try fuzzy match by name
                const [fuzzyMatch] = await db.query(
                    'SELECT institution_id FROM institutions WHERE name LIKE ? AND type = ? LIMIT 1',
                    [`%${user.institution_name}%`, user.institution_type]
                );
                
                if (fuzzyMatch && fuzzyMatch.length > 0) {
                    institutionId = fuzzyMatch[0].institution_id;
                } else {
                    // Try getting most recently created institution of this type as fallback
                    const [recent] = await db.query(
                        'SELECT institution_id FROM institutions WHERE type = ? ORDER BY created_at DESC LIMIT 1',
                        [user.institution_type]
                    );
                    
                    if (recent && recent.length > 0) {
                        institutionId = recent[0].institution_id;
                    }
                }
            }
        }

        // Log the institution lookup process
        console.log('Institution lookup results:', {
            user_institution: {
                name: user.institution_name,
                type: user.institution_type
            },
            found_id: institutionId,
            lookup_success: !!institutionId
        });

        // Include all user status and institution information in response
        res.json({ 
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                approvalStatus: user.approval_status,
                isEmailVerified: user.is_email_verified,
                institution_id: institutionId, // Added institution_id from query
                institutionName: user.institution_name,
                institutionType: user.institution_type,
                institutionAddress: user.institution_address
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Server error', 
            details: error.message 
        });
    }
});

// API endpoint to get pending user registrations
app.get('/api/pending-users', async (req, res) => {
    try {
        const pendingUsers = await User.getPendingUsers();
        res.json(pendingUsers);
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint to approve a user
app.post('/api/approve-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await User.approveUser(userId);
        res.json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint to reject a user
app.post('/api/reject-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Validate userId
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check if user exists and is pending
        const [users] = await db.query('SELECT * FROM users WHERE id = ? AND approval_status = ?', [userId, 'pending']);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User not found or already processed' });
        }

        await User.rejectUser(userId);
        res.json({ message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        // Send the actual error message to help with debugging
        res.status(500).json({ 
            error: 'Failed to reject user',
            details: error.message 
        });
    }
});

// API endpoint to check user status
app.get('/api/user-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.query(
            'SELECT approval_status FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ approvalStatus: rows[0].approval_status });
    } catch (error) {
        console.error('Error checking user status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint to send verification email
app.post('/api/send-verification-email', async (req, res) => {
    try {
        const { userId, email } = req.body;
        
        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store the code in the database (you might want to add a new table/column for this)
        await db.query(
            'UPDATE users SET verification_token = ? WHERE id = ?',
            [verificationCode, userId]
        );

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'serviceeaseph@gmail.com',
            to: email,
            subject: 'Verify Your Email - ServiceEase',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Your verification code is: <strong>${verificationCode}</strong></p>
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
        console.error('Error sending verification email:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

// API endpoints for coordinator management
app.get('/api/coordinators', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                COALESCE(u.institution_name, '') as institution,
                'active' as status
            FROM users u 
            WHERE u.role = 'coordinator'
            AND u.approval_status = 'approved'
            AND u.is_email_verified = true
            AND EXISTS (
                SELECT 1 
                FROM users 
                WHERE id = u.id 
                AND approval_status = 'approved'
                AND role = 'coordinator'
            )
            ORDER BY u.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching coordinators:', error);
        res.status(500).json({ error: 'Failed to fetch coordinators' });
    }
});

app.get('/api/coordinators/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE id = ? AND role = "coordinator"',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching coordinator:', error);
        res.status(500).json({ error: 'Failed to fetch coordinator details' });
    }
});

app.post('/api/coordinators/:id/toggle-status', async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await db.query(
            'SELECT approval_status, is_email_verified FROM users WHERE id = ? AND role = "coordinator" AND approval_status = "approved"',
            [id]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'Approved coordinator not found' });
        }

        if (!user[0].is_email_verified) {
            return res.status(400).json({ error: 'Coordinator email is not verified' });
        }

        res.json({ message: 'Operation not permitted on approved coordinators' });
    } catch (error) {
        console.error('Error updating coordinator status:', error);
        res.status(500).json({ error: 'Failed to update coordinator status' });
    }
});

// Printers API
// List printers for an institution
app.get('/api/institutions/:institutionId/printers', async (req, res) => {
    try {
        const { institutionId } = req.params;
        const [rows] = await db.query(
            `SELECT 
                cpa.id as assignment_id,
                ii.id as inventory_item_id,
                ii.name,
                ii.model,
                ii.serial_number,
                cpa.location_note as location,
                cpa.assigned_at
            FROM client_printer_assignments cpa
            JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
            WHERE cpa.institution_id = ?
            ORDER BY cpa.assigned_at DESC`,
            [institutionId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching printers:', error);
        res.status(500).json({ error: 'Failed to fetch printers' });
    }
});

// Assign a printer (from inventory) to an institution
app.post('/api/institutions/:institutionId/printers', async (req, res) => {
    try {
        const { institutionId } = req.params;
        const { inventory_item_id, location_note } = req.body;

        if (!inventory_item_id) {
            return res.status(400).json({ error: 'inventory_item_id is required' });
        }

        // Validate institution exists
        const [inst] = await db.query('SELECT institution_id FROM institutions WHERE institution_id = ?', [institutionId]);
        if (inst.length === 0) {
            return res.status(400).json({ error: 'Invalid institution ID' });
        }

        // Validate inventory item exists and is available
        const [item] = await db.query('SELECT id, status FROM inventory_items WHERE id = ?', [inventory_item_id]);
        if (item.length === 0) {
            return res.status(400).json({ error: 'Invalid inventory item' });
        }
        if (item[0].status !== 'available') {
            return res.status(400).json({ error: 'Item is not available' });
        }

        // Create assignment
        const [result] = await db.query(
            `INSERT INTO client_printer_assignments (institution_id, inventory_item_id, location_note)
             VALUES (?, ?, ?)`,
            [institutionId, inventory_item_id, location_note || null]
        );

        // Mark item as assigned
        await db.query('UPDATE inventory_items SET status = "assigned" WHERE id = ?', [inventory_item_id]);

        res.status(201).json({ message: 'Printer assigned', assignment_id: result.insertId });
    } catch (error) {
        console.error('Error assigning printer:', error);
        res.status(500).json({ error: 'Failed to assign printer' });
    }
});

// Update an assignment's location note
app.put('/api/printers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { location_note } = req.body;

        // Check exists
        const [existing] = await db.query('SELECT id FROM client_printer_assignments WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        await db.query(
            `UPDATE client_printer_assignments SET 
                location_note = COALESCE(?, location_note)
             WHERE id = ?`,
            [location_note, id]
        );

        res.json({ message: 'Assignment updated' });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ error: 'Failed to update assignment' });
    }
});

// Unassign a printer
app.delete('/api/printers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.query('SELECT inventory_item_id FROM client_printer_assignments WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        const itemId = existing[0].inventory_item_id;
        await db.query('DELETE FROM client_printer_assignments WHERE id = ?', [id]);
        await db.query('UPDATE inventory_items SET status = "available" WHERE id = ?', [itemId]);
        res.json({ message: 'Printer unassigned' });
    } catch (error) {
        console.error('Error unassigning printer:', error);
        res.status(500).json({ error: 'Failed to unassign printer' });
    }
});

// Staff Management API endpoints

// Get all staff members (operations officers and technicians)
app.get('/api/staff', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                u.approval_status,
                u.is_email_verified,
                u.created_at,
                u.updated_at,
                CASE 
                    WHEN u.approval_status = 'approved' AND u.is_email_verified = true THEN 'active'
                    ELSE 'inactive'
                END as status,
                COALESCE(u.institution_name, 'N/A') as department
            FROM users u 
            WHERE u.role IN ('operations_officer', 'technician')
            ORDER BY u.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching staff members:', error);
        res.status(500).json({ error: 'Failed to fetch staff members' });
    }
});

// Create a new staff member
app.post('/api/staff', async (req, res) => {
    try {
        console.log('Creating new staff member with data:', req.body);
        
        const { firstName, lastName, email, password, role } = req.body;
        
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ 
                error: 'First name, last name, email, password, and role are required' 
            });
        }
        
        // Validate role
        if (!['operations_officer', 'technician'].includes(role)) {
            return res.status(400).json({ 
                error: 'Role must be either operations_officer or technician' 
            });
        }
        
        // Check if email already exists
        const [existingUser] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Hash password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new staff member with approved status and verified email
        const [result] = await db.query(
            `INSERT INTO users (
                first_name, last_name, email, password, role, 
                is_email_verified, approval_status, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                firstName, 
                lastName, 
                email, 
                hashedPassword, 
                role, 
                true, // Staff are automatically verified
                'approved' // Staff are automatically approved
            ]
        );
        
        console.log('Staff member created successfully with ID:', result.insertId);
        
        res.status(201).json({ 
            message: 'Staff member created successfully',
            staffId: result.insertId 
        });
        
    } catch (error) {
        console.error('Error creating staff member:', error);
        res.status(500).json({ error: 'Failed to create staff member' });
    }
});

// Update staff member status
app.put('/api/staff/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Status must be either active or inactive' });
        }
        
        // Check if staff member exists
        const [staff] = await db.query(
            'SELECT id, role FROM users WHERE id = ? AND role IN ("operations_officer", "technician")',
            [id]
        );
        
        if (staff.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        // Update status (active = approved + verified, inactive = pending + not verified)
        const approvalStatus = status === 'active' ? 'approved' : 'pending';
        const isEmailVerified = status === 'active' ? true : false;
        
        await db.query(
            'UPDATE users SET approval_status = ?, is_email_verified = ?, updated_at = NOW() WHERE id = ?',
            [approvalStatus, isEmailVerified, id]
        );
        
        res.json({ 
            message: `Staff member ${status === 'active' ? 'activated' : 'deactivated'} successfully` 
        });
        
    } catch (error) {
        console.error('Error updating staff status:', error);
        res.status(500).json({ error: 'Failed to update staff status' });
    }
});

// Get a single staff member by ID
app.get('/api/staff/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                u.approval_status,
                u.is_email_verified,
                u.created_at,
                u.updated_at,
                CASE 
                    WHEN u.approval_status = 'approved' AND u.is_email_verified = true THEN 'active'
                    ELSE 'inactive'
                END as status,
                COALESCE(u.institution_name, '') as department
            FROM users u 
            WHERE u.id = ? AND u.role IN ('operations_officer', 'technician')`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching staff member:', error);
        res.status(500).json({ error: 'Failed to fetch staff member details' });
    }
});

// Institution Management API endpoints

// Get institutions for registration (public endpoint) - MUST come before /:id route
app.get('/api/institutions/public', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT institution_id, name, type, address FROM institutions ORDER BY name ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching institutions for registration:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

// Get all institutions
app.get('/api/institutions', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT institution_id, name, type, address, created_at FROM institutions ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

// Get a single institution by ID
app.get('/api/institutions/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT institution_id, name, type, address, created_at FROM institutions WHERE institution_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching institution:', error);
        res.status(500).json({ error: 'Failed to fetch institution' });
    }
});

// Create a new institution
app.post('/api/institutions', async (req, res) => {
    try {
        console.log('Received POST request to /api/institutions');
        console.log('Request body:', req.body);
        
        const { name, type, address } = req.body;
        
        console.log('Extracted fields:', { name, type, address });
        console.log('Field validation:', {
            name: !name ? 'MISSING' : 'OK',
            type: !type ? 'MISSING' : 'OK', 
            address: !address ? 'MISSING' : 'OK'
        });
        
        // Validate required fields (institution_id is auto-generated)
        if (!name || !type || !address) {
            console.log('Validation failed - sending 400 error');
            return res.status(400).json({ error: 'Name, type, and address are required' });
        }
        
        console.log('Validation passed - proceeding with insert');
        
        // Validate institution type
        const validTypes = ['public_school', 'private_school', 'private_company', 'lgu'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid institution type' });
        }
        
        // Insert the new institution (institution_id will be auto-generated by trigger)
        const [result] = await db.query(
            'INSERT INTO institutions (name, type, address) VALUES (?, ?, ?)',
            [name, type, address]
        );
        
        // Get the generated institution_id
        const [newInstitution] = await db.query(
            'SELECT institution_id FROM institutions WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({ 
            message: 'Institution created successfully',
            institution_id: newInstitution[0].institution_id
        });
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ error: 'Failed to create institution' });
    }
});

// Update an institution
app.put('/api/institutions/:id', async (req, res) => {
    try {
        const { name, type, address } = req.body;
        const institution_id = req.params.id;
        
        // Validate required fields
        if (!name || !type || !address) {
            return res.status(400).json({ error: 'Name, type, and address are required' });
        }
        
        // Validate institution type
        const validTypes = ['public_school', 'private_school', 'private_company', 'lgu'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid institution type' });
        }
        
        // Check if institution exists
        const [existing] = await db.query(
            'SELECT institution_id FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Update the institution
        await db.query(
            'UPDATE institutions SET name = ?, type = ?, address = ? WHERE institution_id = ?',
            [name, type, address, institution_id]
        );
        
        res.json({ message: 'Institution updated successfully' });
    } catch (error) {
        console.error('Error updating institution:', error);
        res.status(500).json({ error: 'Failed to update institution' });
    }
});

// Delete an institution
app.delete('/api/institutions/:id', async (req, res) => {
    try {
        const institution_id = req.params.id;
        
        // Check if institution exists
        const [existing] = await db.query(
            'SELECT institution_id FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Delete the institution
        await db.query(
            'DELETE FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        res.json({ message: 'Institution deleted successfully' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ error: 'Failed to delete institution' });
    }
});

// Technician Assignment API endpoints

// Get all technician assignments
app.get('/api/technician-assignments', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                ta.id,
                ta.institution_id,
                ta.assigned_at,
                ta.is_active,
                u.id as technician_id,
                u.first_name as technician_first_name,
                u.last_name as technician_last_name,
                u.email as technician_email,
                i.name as institution_name,
                i.type as institution_type,
                i.address as institution_address,
                admin.first_name as assigned_by_first_name,
                admin.last_name as assigned_by_last_name
            FROM technician_assignments ta
            JOIN users u ON ta.technician_id = u.id
            JOIN institutions i ON ta.institution_id = i.institution_id
            JOIN users admin ON ta.assigned_by = admin.id
            WHERE ta.is_active = TRUE
            ORDER BY ta.assigned_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching technician assignments:', error);
        res.status(500).json({ error: 'Failed to fetch technician assignments' });
    }
});

// Get assignments for a specific institution
app.get('/api/institutions/:institutionId/technician', async (req, res) => {
    try {
        const { institutionId } = req.params;
        
        const [rows] = await db.query(`
            SELECT 
                ta.id,
                ta.assigned_at,
                u.id as technician_id,
                u.first_name as technician_first_name,
                u.last_name as technician_last_name,
                u.email as technician_email
            FROM technician_assignments ta
            JOIN users u ON ta.technician_id = u.id
            WHERE ta.institution_id = ? AND ta.is_active = TRUE
            LIMIT 1
        `, [institutionId]);
        
        if (rows.length === 0) {
            return res.json({ assigned: false, technician: null });
        }
        
        res.json({ 
            assigned: true, 
            technician: rows[0] 
        });
    } catch (error) {
        console.error('Error fetching technician assignment:', error);
        res.status(500).json({ error: 'Failed to fetch technician assignment' });
    }
});

// Assign technician to institution
app.post('/api/technician-assignments', async (req, res) => {
    try {
        const { technician_id, institution_id, assigned_by } = req.body;
        
        // Validate required fields
        if (!technician_id || !institution_id || !assigned_by) {
            return res.status(400).json({ 
                error: 'Technician ID, Institution ID, and Assigned By are required' 
            });
        }
        
        // Verify technician exists and is actually a technician
        const [techCheck] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role = "technician" AND approval_status = "approved"',
            [technician_id]
        );
        
        if (techCheck.length === 0) {
            return res.status(400).json({ error: 'Invalid technician ID' });
        }
        
        // Verify institution exists
        const [instCheck] = await db.query(
            'SELECT institution_id FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        if (instCheck.length === 0) {
            return res.status(400).json({ error: 'Invalid institution ID' });
        }
        
        // Verify assigner is admin
        const [adminCheck] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role = "admin"',
            [assigned_by]
        );
        
        if (adminCheck.length === 0) {
            return res.status(403).json({ error: 'Only admins can assign technicians' });
        }
        
        // Check if institution already has an active assignment
        const [existingAssignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE institution_id = ? AND is_active = TRUE',
            [institution_id]
        );
        
        if (existingAssignment.length > 0) {
            // Deactivate existing assignment
            await db.query(
                'UPDATE technician_assignments SET is_active = FALSE WHERE institution_id = ? AND is_active = TRUE',
                [institution_id]
            );
        }
        
        // Create new assignment
        const [result] = await db.query(
            `INSERT INTO technician_assignments (
                technician_id, institution_id, assigned_by, is_active
            ) VALUES (?, ?, ?, TRUE)`,
            [technician_id, institution_id, assigned_by]
        );
        
        res.status(201).json({ 
            message: 'Technician assigned successfully',
            assignment_id: result.insertId 
        });
        
    } catch (error) {
        console.error('Error creating technician assignment:', error);
        res.status(500).json({ error: 'Failed to assign technician' });
    }
});

// Remove technician assignment
app.delete('/api/technician-assignments/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        
        // Check if assignment exists
        const [existing] = await db.query(
            'SELECT id FROM technician_assignments WHERE id = ? AND is_active = TRUE',
            [assignmentId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        // Deactivate assignment instead of deleting for audit trail
        await db.query(
            'UPDATE technician_assignments SET is_active = FALSE WHERE id = ?',
            [assignmentId]
        );
        
        res.json({ message: 'Technician assignment removed successfully' });
        
    } catch (error) {
        console.error('Error removing technician assignment:', error);
        res.status(500).json({ error: 'Failed to remove assignment' });
    }
});

// Service Requests API endpoints

// Get all service requests
app.get('/api/service-requests', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.priority,
                sr.status,
                sr.description,
                sr.created_at,
                sr.updated_at,
                i.name as client_name,
                i.type as institution_type,
                coord.first_name as coordinator_first_name,
                coord.last_name as coordinator_last_name,
                coord.email as coordinator_email,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email,
                    '' as client_contact,
                '' as department,
                sr.updated_at as last_updated
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users coord ON sr.coordinator_id = coord.id
            LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
            ORDER BY sr.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// Get service requests for a specific institution
app.get('/api/institutions/:institutionId/service-requests', async (req, res) => {
    try {
        const { institutionId } = req.params;
        console.log('[DEBUG] Fetching service requests for institutionId:', institutionId);
        const [rows] = await db.query(`
            SELECT 
                sr.id,
                sr.request_number,
                sr.inventory_item_id,
                sr.priority,
                sr.status,
                sr.location,
                sr.description,
                sr.created_at,
                sr.updated_at,
                ii.model as equipment_model,
                ii.serial_number as equipment_serial,
                ii.name as equipment_name
            FROM service_requests sr
            LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            WHERE sr.institution_id = ?
            ORDER BY sr.created_at DESC
        `, [institutionId]);
        console.log(`[DEBUG] Found ${rows.length} service requests for institutionId:`, institutionId);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching service requests for institution:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// Get specific service request with history
app.get('/api/service-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get main request data
        const [requestRows] = await db.query(`
            SELECT 
                sr.*,
                i.name as client_name,
                i.type as institution_type,
                i.address as institution_address,
                coord.first_name as coordinator_first_name,
                coord.last_name as coordinator_last_name,
                coord.email as coordinator_email,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users coord ON sr.coordinator_id = coord.id
            LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
            WHERE sr.id = ?
        `, [id]);
        
        if (requestRows.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        // Get request history
        const [historyRows] = await db.query(`
            SELECT 
                srh.previous_status,
                srh.new_status as status,
                srh.notes,
                srh.created_at as timestamp,
                u.first_name,
                u.last_name
            FROM service_request_history srh
            LEFT JOIN users u ON srh.changed_by = u.id
            WHERE srh.request_id = ?
            ORDER BY srh.created_at DESC
        `, [id]);
        
        const request = requestRows[0];
        request.history = historyRows;
        request.client_contact = request.contact_phone || request.contact_email || 'N/A';
        request.department = 'N/A'; // This field might be removed from frontend
        
        res.json(request);
    } catch (error) {
        console.error('Error fetching service request:', error);
        res.status(500).json({ error: 'Failed to fetch service request' });
    }
});

// Update service request status
app.post('/api/service-requests/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        // Validate status
        const validStatuses = ['new', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Update request status
        await db.query(
            `UPDATE service_requests 
             SET status = ?, updated_at = NOW() 
             WHERE id = ?`,
            [status, id]
        );
        
        // The trigger will automatically log the status change
        res.json({ message: 'Status updated successfully' });
        
    } catch (error) {
        console.error('Error updating service request status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Create new service request (for coordinators)
app.post('/api/service-requests', async (req, res) => {
    try {
        const {
            inventory_item_id, // This is the actual inventory item (printer)
            institution_id,
            priority,
            description,
            location,
            coordinator_id,
            equipment_model,
            equipment_serial
        } = req.body;

        // Validate required fields
        if (!inventory_item_id || !institution_id || !description) {
            return res.status(400).json({ 
                error: 'Inventory Item ID, institution ID, and description are required' 
            });
        }

        // Verify the printer (inventory item) exists and is assigned to the institution
        const [printerCheck] = await db.query(`
            SELECT ii.id, ii.model, ii.serial_number, cpa.location_note
            FROM inventory_items ii
            JOIN client_printer_assignments cpa ON ii.id = cpa.inventory_item_id
            WHERE ii.id = ? AND cpa.institution_id = ?
        `, [inventory_item_id, institution_id]);
        if (printerCheck.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid inventory item ID or printer not assigned to this institution' 
            });
        }

        // Create the service request
            const [result] = await db.query(`
                INSERT INTO service_requests (
                    institution_id, coordinator_id, inventory_item_id, priority,
                    location, description
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                institution_id, 
                coordinator_id || null, 
                inventory_item_id,
                priority || 'medium',
                location || null,
                description
            ]);

            // Generate request_number (e.g., SR-YYYYMMDD-<insertId>)
            const requestNumber = `SR-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${result.insertId}`;
            await db.query(
                'UPDATE service_requests SET request_number = ? WHERE id = ?',
                [requestNumber, result.insertId]
            );

            res.status(201).json({ 
                message: 'Service request created successfully',
                request_id: result.insertId,
                request_number: requestNumber
            });
    } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({ error: 'Failed to create service request' });
    }
});

// Inventory Items API
// List inventory items (optionally only available)
app.get('/api/inventory-items', async (req, res) => {
    try {
        const onlyAvailable = String(req.query.available || '').toLowerCase() === 'true';
        const [rows] = await db.query(
            onlyAvailable ?
            'SELECT * FROM inventory_items WHERE status = "available" ORDER BY created_at DESC' :
            'SELECT * FROM inventory_items ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Create inventory item (printer)
app.post('/api/inventory-items', async (req, res) => {
    try {
        const { name, brand, model, serial_number, location } = req.body;
        const composedName = (name && String(name).trim()) || [brand, model].filter(Boolean).join(' ').trim();
        if (!composedName) {
            return res.status(400).json({ error: 'Brand or Model is required' });
        }
        const [result] = await db.query(
            `INSERT INTO inventory_items (category, name, brand, model, serial_number, location, status)
             VALUES ('printer', ?, ?, ?, ?, ?, 'available')`,
            [composedName, brand || null, model || null, serial_number || null, location || null]
        );
        res.status(201).json({ message: 'Inventory item created', id: result.insertId });
    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
});

// Update inventory item
app.put('/api/inventory-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand, model, serial_number, location, status } = req.body;
        const [existing] = await db.query('SELECT id, name, brand, model FROM inventory_items WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const current = existing[0];
        const nextBrand = brand !== undefined ? brand : current.brand;
        const nextModel = model !== undefined ? model : current.model;
        const nextName = name !== undefined && name !== null && String(name).trim() !== ''
            ? String(name).trim()
            : [nextBrand, nextModel].filter(Boolean).join(' ').trim() || current.name;
        await db.query(
            `UPDATE inventory_items SET 
                name = ?,
                brand = COALESCE(?, brand),
                model = COALESCE(?, model),
                serial_number = COALESCE(?, serial_number),
                location = COALESCE(?, location),
                status = COALESCE(?, status)
             WHERE id = ?`,
            [nextName, brand, model, serial_number, location, status, id]
        );
        res.json({ message: 'Item updated' });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// Delete inventory item (only if not assigned)
app.delete('/api/inventory-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [assigned] = await db.query('SELECT id FROM client_printer_assignments WHERE inventory_item_id = ?', [id]);
        if (assigned.length > 0) {
            return res.status(400).json({ error: 'Item is assigned to a client' });
        }
        await db.query('DELETE FROM inventory_items WHERE id = ?', [id]);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
});

// Parts API Routes
const partsRouter = require('./routes/parts');
app.use('/api/parts', partsRouter);

// Institutions API Routes
const institutionsRouter = require('./routes/institutions');
app.use('/api/institutions', institutionsRouter);

// Coordinator Printers API Routes
const coordinatorPrintersRouter = require('./routes/coordinator-printers');
app.use('/api/coordinators', coordinatorPrintersRouter);

// Technician Service Requests API Routes
const technicianServiceRequestsRouter = require('./routes/technician-service-requests');
app.use('/api/technician', technicianServiceRequestsRouter);

// Service Requests API Routes
const serviceRequestsRouter = require('./routes/service-requests');
app.use('/api/service-requests', serviceRequestsRouter);

// Generic HTML fallback: serve any page from client/src/pages if it exists
app.get('/:page.html', (req, res, next) => {
    const pageFile = `${req.params.page}.html`;
    const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', pageFile);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) return next();
        res.sendFile(filePath, (sendErr) => {
            if (sendErr) {
                console.error(`Error serving ${pageFile}:`, sendErr);
                return res.status(500).send('Error loading page');
            }
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});