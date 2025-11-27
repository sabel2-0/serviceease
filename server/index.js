 const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mailjet = require('node-mailjet');
const cloudinary = require('cloudinary').v2;
const User = require('./models/User');
const technicianInstitutionsRoute = require('./routes/technician-institutions');
const db = require('./config/database');
const { authenticateAdmin, authenticateCoordinator } = require('./middleware/auth');
const { auth } = require('./middleware/auth');
const { createNotification } = require('./routes/notifications');
require('dotenv').config();

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verify Cloudinary configuration on startup
console.log('Cloudinary Configuration:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
    api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
});

// Initialize Mailjet
const mailjetClient = mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);


const app = express();

// Technician institutions API
app.use('/api/technician', technicianInstitutionsRoute);

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

// Ensure audit logs table exists
async function ensureAuditLogsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                user_role ENUM('admin', 'technician', 'operations_officer') NOT NULL,
                action VARCHAR(255) NOT NULL,
                action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'assign', 'complete', 'other') NOT NULL,
                target_type VARCHAR(100) NULL,
                target_id VARCHAR(100) NULL,
                details TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_user_role (user_role),
                INDEX idx_action_type (action_type),
                INDEX idx_created_at (created_at),
                INDEX idx_target (target_type, target_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Ensured audit logs table exists');
    } catch (err) {
        console.error('Failed to ensure audit logs table exists:', err);
    }
}

// Ensure technician_assignments table exists
async function ensureTechnicianAssignmentsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS technician_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                technician_id INT NOT NULL,
                institution_id VARCHAR(50) NOT NULL,
                assigned_by INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (institution_id) REFERENCES institutions(institution_id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_technician_id (technician_id),
                INDEX idx_institution_id (institution_id),
                INDEX idx_is_active (is_active),
                INDEX idx_technician_institution (technician_id, institution_id),
                INDEX idx_institution_active (institution_id, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Ensured technician_assignments table exists');
    } catch (err) {
        console.error('Failed to ensure technician_assignments table exists:', err);
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
                quantity INT NOT NULL DEFAULT 1,
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

        // Ensure quantity column exists if table was created previously without it
        const [quantityColRows] = await db.query(`
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'inventory_items'
              AND COLUMN_NAME = 'quantity'
        `);
        if (quantityColRows && quantityColRows[0] && Number(quantityColRows[0].cnt) === 0) {
            await db.query(`ALTER TABLE inventory_items ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER serial_number`);
        }

        // Ensure token_version column exists in users table for session invalidation
        const [tokenVersionColRows] = await db.query(`
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'token_version'
        `);
        if (tokenVersionColRows && tokenVersionColRows[0] && Number(tokenVersionColRows[0].cnt) === 0) {
            await db.query(`ALTER TABLE users ADD COLUMN token_version INT DEFAULT 0`);
            console.log('✓ Added token_version column to users table');
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

// Ensure notifications table exists
async function ensureNotificationsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('coordinator_registration', 'service_request', 'system') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_user_id INT NULL,
                related_data JSON NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_type (type),
                INDEX idx_created_at (created_at),
                INDEX idx_is_read (is_read),
                FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Ensured notifications table exists');
    } catch (err) {
        console.error('Failed to ensure notifications table exists:', err);
    }
}

// Ensure user_printer_assignments table exists
async function ensureUserAssignmentsTable() {
    try {
        // Create user_printer_assignments table to map printers to individual users
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_printer_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                user_first_name VARCHAR(100) NULL,
                user_last_name VARCHAR(100) NULL,
                user_email VARCHAR(150) NULL,
                inventory_item_id INT NOT NULL,
                institution_id VARCHAR(50) DEFAULT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_upa_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('Ensured user_printer_assignments table exists');
        // Ensure 'requester' role exists in users.role enum (add if missing)
        try {
            await db.query(`ALTER TABLE users MODIFY role ENUM('admin','coordinator','operations_officer','technician','requester') NOT NULL`);
            console.log("Ensured 'requester' role exists in users.role enum");
        } catch (e) {
            console.warn("Could not modify users.role enum to include 'requester' (it may already include it or DB doesn't allow modification):", e.message);
        }
        
        // REMOVED: institution_id column - system now uses institutions.user_id instead
        // The original system: institutions.user_id points to the coordinator who owns that institution
        
        // Ensure the assignment table only has the columns we want.
        // Remove denormalized user fields if they exist.
        try {
            // drop denormalized columns if present
            const toDrop = ['user_first_name','user_last_name','user_email'];
            for (const col of toDrop) {
                try {
                    await db.query(`ALTER TABLE user_printer_assignments DROP COLUMN ${col}`);
                    console.log(`Dropped column ${col} from user_printer_assignments`);
                } catch (e) {
                    // ignore if column doesn't exist
                }
            }

            // enforce user_id not null
            try {
                await db.query('ALTER TABLE user_printer_assignments MODIFY user_id INT NOT NULL');
                console.log('Ensured user_printer_assignments.user_id is NOT NULL');
            } catch (e) {
                // ignore modification failures
            }
        } catch (e) {
            console.warn('Error normalizing user_printer_assignments schema:', e.message);
        }
    } catch (err) {
        console.error('Failed to ensure user_printer_assignments table:', err);
    }
}

// Ensure walk-in service request fields exist
async function ensureWalkInServiceRequestFields() {
    try {
        // Add walk_in_customer_name column if it doesn't exist
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS walk_in_customer_name VARCHAR(255) NULL AFTER requested_by_user_id
        `).catch(() => {});
        
        // Add printer_brand column for walk-in requests if it doesn't exist
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS printer_brand VARCHAR(100) NULL AFTER walk_in_customer_name
        `).catch(() => {});
        
        // Add is_walk_in flag
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE AFTER printer_brand
        `).catch(() => {});
        
        // Add parts_used field for technician completion
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS parts_used TEXT NULL AFTER resolution_notes
        `).catch(() => {});
        
        // Add approval fields
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE AFTER parts_used
        `).catch(() => {});
        
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER requires_approval
        `).catch(() => {});
        
        await db.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by
        `).catch(() => {});
        
        console.log('Ensured walk-in service request fields exist');
    } catch (err) {
        console.error('Failed to ensure walk-in service request fields:', err);
    }
}

// Drop part_type column - redundant when we have is_universal and brand
async function dropPartTypeColumn() {
    try {
        // Check if column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'printer_parts' 
            AND COLUMN_NAME = 'part_type'
        `);
        
        if (columns.length > 0) {
            // Drop the index first
            await db.query(`ALTER TABLE printer_parts DROP INDEX IF EXISTS idx_parts_type`).catch(() => {});
            
            // Drop the column
            await db.query(`ALTER TABLE printer_parts DROP COLUMN part_type`);
            console.log('Dropped part_type column from printer_parts table');
        } else {
            console.log('part_type column does not exist (already removed)');
        }
    } catch (err) {
        console.error('Failed to drop part_type column:', err);
    }
}

// Initialize database tables that must exist
ensurePrintersTable();
ensureInventoryTables();
ensurePrinterPartsTable();
ensureServiceRequestsTables();
ensureNotificationsTable();
ensureUserAssignmentsTable();
ensureWalkInServiceRequestFields();
ensureAuditLogsTable();
ensureTechnicianAssignmentsTable();
dropPartTypeColumn();


// Audit logging helper function
async function logAuditAction(userId, userRole, action, actionType, targetType = null, targetId = null, details = null, req = null) {
    try {
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress) : null;
        const userAgent = req ? req.headers['user-agent'] : null;
        
        await db.query(`
            INSERT INTO audit_logs (user_id, user_role, action, action_type, target_type, target_id, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, userRole, action, actionType, targetType, targetId, details, ipAddress, userAgent]);
    } catch (error) {
        console.error('Failed to log audit action:', error);
    }
}

// Audit logging middleware for tracked roles
function auditMiddleware(req, res, next) {
    // Only track admin, technician, and operations_officer
    if (req.user && ['admin', 'technician', 'operations_officer'].includes(req.user.role)) {
        // Store original json and send methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        
        // Track if response was successful
        res.json = function(data) {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                // Log successful action
                const action = `${req.method} ${req.path}`;
                const actionType = getActionType(req.method, req.path);
                const { targetType, targetId } = extractTarget(req);
                const details = JSON.stringify({
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    body: sanitizeBody(req.body)
                });
                
                logAuditAction(req.user.id, req.user.role, action, actionType, targetType, targetId, details, req);
            }
            return originalJson(data);
        };
    }
    next();
}

// Helper to determine action type from HTTP method and path
function getActionType(method, path) {
    if (path.includes('/login')) return 'login';
    if (path.includes('/logout')) return 'logout';
    if (path.includes('/approve')) return 'approve';
    if (path.includes('/reject')) return 'reject';
    if (path.includes('/assign')) return 'assign';
    if (path.includes('/complete')) return 'complete';
    
    switch(method) {
        case 'POST': return 'create';
        case 'GET': return 'read';
        case 'PUT':
        case 'PATCH': return 'update';
        case 'DELETE': return 'delete';
        default: return 'other';
    }
}

// Helper to extract target from request
function extractTarget(req) {
    const path = req.path;
    let targetType = null;
    let targetId = null;
    
    if (path.includes('/service-requests') || path.includes('/walk-in-service-requests')) {
        targetType = 'service_request';
        targetId = req.params.id || req.body.id || req.query.id;
    } else if (path.includes('/users')) {
        targetType = 'user';
        targetId = req.params.id || req.body.id;
    } else if (path.includes('/printers')) {
        targetType = 'printer';
        targetId = req.params.id || req.body.id;
    } else if (path.includes('/inventory')) {
        targetType = 'inventory';
        targetId = req.params.id || req.body.id;
    } else if (path.includes('/parts')) {
        targetType = 'parts';
        targetId = req.params.id || req.body.id;
    } else if (path.includes('/coordinator')) {
        targetType = 'coordinator';
        targetId = req.params.id || req.body.id;
    }
    
    return { targetType, targetId: targetId ? String(targetId) : null };
}

// Sanitize request body to remove sensitive data
function sanitizeBody(body) {
    if (!body) return null;
    const sanitized = { ...body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.oldPassword;
    delete sanitized.newPassword;
    return sanitized;
}

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
// Check if email is already registered
app.post('/api/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const [users] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        res.json({ exists: users.length > 0 });
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

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

        // Validate that institutionId is provided for coordinators/requesters
        if ((userData.role === 'coordinator' || userData.role === 'requester')) {
            if (!userData.institutionId || userData.institutionId.trim() === '') {
                return res.status(400).json({ 
                    error: 'Please select an institution from the dropdown' 
                });
            }
            
            // Verify the institution exists
            const [institutions] = await db.query(
                'SELECT institution_id FROM institutions WHERE institution_id = ?',
                [userData.institutionId]
            );
            
            if (institutions.length === 0) {
                return res.status(400).json({ 
                    error: 'Selected institution not found. Please contact administrator.' 
                });
            }
        }
        
        const { userId } = await User.createUser(userData);

        // Save temporary photos if uploaded - upload to Cloudinary
        if (req.files) {
            console.log('Files received:', Object.keys(req.files));
            
            const photoPaths = {
                frontIdPhoto: null,
                backIdPhoto: null,
                selfiePhoto: null
            };

            try {
                console.log('Starting Cloudinary upload...');
                console.log('Cloudinary config status:', {
                    configured: !!cloudinary.config().cloud_name,
                    cloud_name: cloudinary.config().cloud_name
                });

                // Upload frontId to Cloudinary
                if (req.files.frontId) {
                    console.log('Uploading frontId to Cloudinary...');
                    const frontIdResult = await cloudinary.uploader.upload(req.files.frontId[0].path, {
                        folder: 'serviceease',
                        resource_type: 'image'
                    });
                    photoPaths.frontIdPhoto = frontIdResult.secure_url;
                    console.log('frontId uploaded:', frontIdResult.secure_url);
                    // Delete local file after upload
                    fs.unlinkSync(req.files.frontId[0].path);
                }

                // Upload backId to Cloudinary
                if (req.files.backId) {
                    console.log('Uploading backId to Cloudinary...');
                    const backIdResult = await cloudinary.uploader.upload(req.files.backId[0].path, {
                        folder: 'serviceease',
                        resource_type: 'image'
                    });
                    photoPaths.backIdPhoto = backIdResult.secure_url;
                    console.log('backId uploaded:', backIdResult.secure_url);
                    // Delete local file after upload
                    fs.unlinkSync(req.files.backId[0].path);
                }

                // Upload selfie to Cloudinary
                if (req.files.selfie) {
                    console.log('Uploading selfie to Cloudinary...');
                    const selfieResult = await cloudinary.uploader.upload(req.files.selfie[0].path, {
                        folder: 'serviceease',
                        resource_type: 'image'
                    });
                    photoPaths.selfiePhoto = selfieResult.secure_url;
                    console.log('selfie uploaded:', selfieResult.secure_url);
                    // Delete local file after upload
                    fs.unlinkSync(req.files.selfie[0].path);
                }

                console.log('Saving Cloudinary URLs to database:', photoPaths);
                await User.saveTemporaryPhotos(userId, photoPaths);
                console.log('Photos saved successfully for user:', userId);
            } catch (uploadError) {
                console.error('Error uploading to Cloudinary:', uploadError);
                console.error('Upload error details:', {
                    message: uploadError.message,
                    stack: uploadError.stack,
                    cloudinaryConfig: {
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
                        api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
                        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
                    }
                });
                // Clean up any uploaded local files
                if (req.files) {
                    Object.values(req.files).flat().forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
                throw new Error('Failed to upload photos. Please try again.');
            }
        } else {
            console.log('No files were uploaded with the registration');
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

        // Fetch authoritative status/approval values directly from the database
        try {
            const [freshRows] = await db.query('SELECT status, approval_status FROM users WHERE id = ? LIMIT 1', [user.id]);
            const fresh = freshRows && freshRows.length > 0 ? freshRows[0] : {};
            const dbStatus = String((fresh.status || '')).trim().toLowerCase();
            const dbApproval = String((fresh.approval_status || '')).trim().toLowerCase();
            console.log(`DB login check for user ${user.id}: status='${dbStatus}', approval_status='${dbApproval}'`);

            // Block login if status explicitly set to 'inactive'
            if (dbStatus === 'inactive') {
                // For security/privacy, don't reveal account status to the client.
                // Log on server for auditing, but return generic invalid credentials message.
                console.log(`Login blocked for inactive user ${user.id} (${user.email}) — db status='${dbStatus}'`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (dbErr) {
            console.error('Error fetching user status for login check:', dbErr);
            // If DB check fails, proceed cautiously and allow login to fall through (we don't want to lock out users due to DB hiccup)
        }
        
        // Check institution status for coordinators and requesters
        if (user.role === 'coordinator' || user.role === 'requester') {
            try {
                let institutionStatus = null;
                
                if (user.role === 'coordinator') {
                    // Coordinator owns the institution (institutions.user_id)
                    const [instRows] = await db.query(
                        'SELECT status FROM institutions WHERE user_id = ? LIMIT 1',
                        [user.id]
                    );
                    institutionStatus = instRows && instRows.length > 0 ? instRows[0].status : null;
                } else if (user.role === 'requester') {
                    // Requester is linked via user_printer_assignments.institution_id
                    const [instRows] = await db.query(
                        `SELECT i.status FROM institutions i
                         JOIN user_printer_assignments upa ON upa.institution_id = i.institution_id
                         WHERE upa.user_id = ? LIMIT 1`,
                        [user.id]
                    );
                    institutionStatus = instRows && instRows.length > 0 ? instRows[0].status : null;
                }
                
                if (institutionStatus === 'deactivated') {
                    console.log(`Login blocked for user ${user.id} (${user.email}) — institution is deactivated`);
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
            } catch (instErr) {
                console.error('Error checking institution status for login:', instErr);
                // Continue with login if institution check fails
            }
        }

        // Get institution owned by this user (institutions.user_id = user.id)
        let institutionData = {
            institution_id: null,
            institution_name: null,
            institution_type: null,
            institution_address: null
        };

        const [institutions] = await db.query(
            'SELECT institution_id, name, type, address FROM institutions WHERE user_id = ? LIMIT 1',
            [user.id]
        );
        
        if (institutions && institutions.length > 0) {
            const inst = institutions[0];
            institutionData = {
                institution_id: inst.institution_id,
                institution_name: inst.name,
                institution_type: inst.type,
                institution_address: inst.address
            };
        }

        // Log the institution lookup process
        console.log('Institution lookup results:', {
            user_id: user.id,
            found_institution: institutionData,
            lookup_success: !!institutionData.institution_id
        });

        // Generate JWT token with token_version for session invalidation
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                institution_id: institutionData.institution_id,
                tokenVersion: user.token_version || 0  // Include token version for session invalidation
            },
            process.env.JWT_SECRET || 'serviceease_dev_secret',
            { expiresIn: '24h' }
        );

        // Include all user status and institution information in response
        res.json({ 
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                approvalStatus: user.approval_status,
                isEmailVerified: user.is_email_verified,
                institution_id: institutionData.institution_id,
                institutionName: institutionData.institution_name,
                institutionType: institutionData.institution_type,
                institutionAddress: institutionData.institution_address
            }
        });
        
        // Log audit action for tracked roles
        if (['admin', 'technician', 'operations_officer'].includes(user.role)) {
            await logAuditAction(
                user.id, 
                user.role, 
                'User login', 
                'login', 
                'user', 
                String(user.id),
                JSON.stringify({ email: user.email }),
                req
            );
        }
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

// Log document view (for audit trail)
app.post('/api/log-document-view', authenticateAdmin, async (req, res) => {
    try {
        const { userId, action, timestamp } = req.body;
        
        await logAuditAction(
            req.user.id,
            req.user.role,
            `Viewed verification documents for user ID: ${userId}`,
            'view',
            'user_documents',
            userId,
            JSON.stringify({ action, timestamp }),
            req
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error logging document view:', error);
        res.status(500).json({ error: 'Failed to log action' });
    }
});

// API endpoint to approve a user
app.post('/api/approve-user/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user details before approval for audit logging
        const [user] = await db.query(
            'SELECT first_name, last_name, email, role, approval_status FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await User.approveUser(userId);
        
        // Log audit action
        await logAuditAction(
            req.user.id,
            req.user.role,
            `Approved ${user[0].role} registration: ${user[0].first_name} ${user[0].last_name} (${user[0].email})`,
            'approve',
            'user',
            userId,
            JSON.stringify({
                action: `${user[0].role}_approval`,
                user_id: userId,
                user_name: `${user[0].first_name} ${user[0].last_name}`,
                user_email: user[0].email,
                user_role: user[0].role,
                previous_status: user[0].approval_status,
                new_status: 'approved'
            }),
            req
        );
        
        // Send email data for coordinator approvals
        const emailData = user[0].role === 'coordinator' ? {
            coordinator_name: `${user[0].first_name} ${user[0].last_name}`,
            coordinator_email: user[0].email,
            to_email: user[0].email
        } : null;
        
        res.json({ 
            message: 'User approved successfully',
            emailData
        });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint to reject a user
app.post('/api/reject-user/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        
        // Validate userId
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check if user exists and is pending
        const [users] = await db.query('SELECT * FROM users WHERE id = ? AND approval_status = ?', [userId, 'pending']);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User not found or already processed' });
        }

        const user = users[0];
        
        await User.rejectUser(userId);
        
        // Log audit action
        await logAuditAction(
            req.user.id,
            req.user.role,
            `Rejected ${user.role} registration: ${user.first_name} ${user.last_name} (${user.email})`,
            'reject',
            'user',
            userId,
            JSON.stringify({
                action: `${user.role}_rejection`,
                user_id: userId,
                user_name: `${user.first_name} ${user.last_name}`,
                user_email: user.email,
                user_role: user.role,
                previous_status: user.approval_status,
                new_status: 'rejected',
                reason: reason || 'No reason provided'
            }),
            req
        );
        
        // Send rejection email via Mailjet for coordinators
        if (user.role === 'coordinator') {
            try {
                const emailPayload = {
                    Messages: [
                        {
                            From: {
                                Email: 'serviceeaseph@gmail.com',
                                Name: 'ServiceEase'
                            },
                            To: [
                                {
                                    Email: user.email,
                                    Name: `${user.first_name} ${user.last_name}`
                                }
                            ],
                            TemplateID: 7515461,
                            TemplateLanguage: true,
                            Subject: 'ServiceEase Coordinator Registration Update',
                            Variables: {
                                coordinator_name: `${user.first_name} ${user.last_name}`,
                                rejection_reason: reason || 'No specific reason provided'
                            }
                        }
                    ]
                };
                
                console.log('📧 Sending rejection email via Mailjet...');
                console.log('Template ID:', emailPayload.Messages[0].TemplateID);
                console.log('To:', user.email);
                console.log('Variables:', emailPayload.Messages[0].Variables);
                
                const request = mailjetClient
                    .post('send', { version: 'v3.1' })
                    .request(emailPayload);
                
                const result = await request;
                console.log('✅ Rejection email sent successfully via Mailjet to:', user.email);
                console.log('Mailjet Response:', JSON.stringify(result.body, null, 2));
            } catch (emailError) {
                console.error('❌ Failed to send rejection email:', emailError);
                console.error('Error details:', emailError.response?.body || emailError.message);
                // Don't fail the rejection if email fails
            }
        }
        
        res.json({ 
            message: 'User rejected successfully'
        });
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

// Admin notification endpoints
// Get all notifications for admin dashboard
app.get('/api/admin/notifications', authenticateAdmin, async (req, res) => {
    try {
        const [notifications] = await db.query(`
            SELECT 
                n.*,
                u.first_name,
                u.last_name,
                u.email
            FROM notifications n
            LEFT JOIN users u ON n.related_user_id = u.id
            WHERE n.user_id = ? OR (n.user_id IS NULL AND n.type IN ('coordinator_registration', 'parts_request'))
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notification count
app.get('/api/admin/notifications/count', authenticateAdmin, async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE is_read = FALSE 
            AND (user_id = ? OR (user_id IS NULL AND type IN ('coordinator_registration', 'parts_request')))
        `, [req.user.id]);

        res.json({ count: result[0].unread_count });
    } catch (error) {
        console.error('Error fetching notification count:', error);
        res.status(500).json({ error: 'Failed to fetch notification count' });
    }
});

// Mark notification as read
app.put('/api/admin/notifications/:id/read', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query(`
            UPDATE notifications 
            SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `, [id, req.user.id]);

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
app.put('/api/admin/notifications/read-all', authenticateAdmin, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE is_read = FALSE 
            AND (user_id = ? OR (user_id IS NULL AND type IN ('coordinator_registration', 'parts_request')))
        `, [req.user.id]);

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// General notifications count endpoint for all authenticated users
app.get('/api/notifications/count', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Build query based on user role
        let query = `
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE is_read = FALSE 
            AND (user_id = ?`;
        
        // Admin and operations officer can see system-wide notifications
        if (userRole === 'admin' || userRole === 'operations_officer') {
            query += ` OR user_id IS NULL`;
        }
        
        query += `)`;
        
        const [result] = await db.query(query, [userId]);
        
        res.json({ count: result[0].unread_count });
    } catch (error) {
        console.error('Error fetching notification count:', error);
        res.status(500).json({ error: 'Failed to fetch notification count' });
    }
});

// Dashboard statistics endpoint
app.get('/api/admin/dashboard-stats', authenticateAdmin, async (req, res) => {
    try {
        // Get total users
        const [usersResult] = await db.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = usersResult[0].count;

        // Get pending coordinators (coordinator role with approval_status = 'pending')
        const [pendingResult] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "coordinator" AND approval_status = "pending"'
        );
        const pendingCoordinators = pendingResult[0].count;

        // Get total institutions
        const [institutionsResult] = await db.query('SELECT COUNT(*) as count FROM institutions');
        const totalInstitutions = institutionsResult[0].count;

        // Get active service requests (status: pending, in_progress, approved)
        const [serviceRequestsResult] = await db.query(
            `SELECT COUNT(*) as count FROM service_requests 
             WHERE status IN ('pending', 'in_progress', 'approved')`
        );
        const activeServiceRequests = serviceRequestsResult[0].count;

        // Get total printers
        const [printersResult] = await db.query('SELECT COUNT(*) as count FROM inventory_items');
        const totalPrinters = printersResult[0].count;

        // Get available printers (not assigned to any institution)
        const [availablePrintersResult] = await db.query(
            `SELECT COUNT(*) as count FROM inventory_items i
             WHERE NOT EXISTS (
                 SELECT 1 FROM client_printer_assignments cpa 
                 WHERE cpa.inventory_item_id = i.id
             )`
        );
        const availablePrinters = availablePrintersResult[0].count;

        // Get pending parts requests
        const [partsRequestsResult] = await db.query(
            'SELECT COUNT(*) as count FROM parts_requests WHERE status = "pending"'
        );
        const pendingPartsRequests = partsRequestsResult[0].count;

        // Get total parts in inventory
        const [partsResult] = await db.query(
            'SELECT SUM(quantity) as count FROM printer_parts'
        );
        const totalParts = partsResult[0].count || 0;

        // Get total technicians
        const [techniciansResult] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "technician"'
        );
        const totalTechnicians = techniciansResult[0].count;

        res.json({
            totalUsers,
            pendingCoordinators,
            totalInstitutions,
            activeServiceRequests,
            totalPrinters,
            availablePrinters,
            pendingPartsRequests,
            totalParts,
            totalTechnicians
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Coordinator Profile endpoint with institution information
app.get('/api/coordinator/profile', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        // Get coordinator details with institution
        const [coordinatorRows] = await db.query(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.role,
                i.institution_id, i.name as institution_name, i.type as institution_type, i.address as institution_address
            FROM users u
            LEFT JOIN institutions i ON i.user_id = u.id
            WHERE u.id = ?
        `, [coordinatorId]);
        
        if (coordinatorRows.length === 0) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }
        
        const profile = coordinatorRows[0];
        
        res.json({
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            role: profile.role,
            institution_id: profile.institution_id,
            institution_name: profile.institution_name || 'No Institution Assigned',
            institution_type: profile.institution_type,
            institution_address: profile.institution_address
        });
        
    } catch (error) {
        console.error('Error fetching coordinator profile:', error);
        res.status(500).json({ error: 'Failed to fetch coordinator profile' });
    }
});

// Requester Profile Endpoint
app.get('/api/requester/profile', auth, async (req, res) => {
    try {
        const requesterId = req.user.id;
        
        // Verify user is a requester
        if (req.user.role !== 'requester') {
            return res.status(403).json({ error: 'Access denied. Requester role required.' });
        }
        
        // Get requester details with institution from user_printer_assignments
        const [requesterRows] = await db.query(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.role,
                i.institution_id, i.name as institution_name, i.type as institution_type, i.address as institution_address
            FROM users u
            LEFT JOIN user_printer_assignments upa ON upa.user_id = u.id
            LEFT JOIN institutions i ON i.institution_id = upa.institution_id
            WHERE u.id = ?
            LIMIT 1
        `, [requesterId]);
        
        if (requesterRows.length === 0) {
            return res.status(404).json({ error: 'Requester not found' });
        }
        
        const profile = requesterRows[0];
        
        res.json({
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            role: profile.role,
            institution_id: profile.institution_id,
            institution_name: profile.institution_name || 'No Institution Assigned',
            institution_type: profile.institution_type,
            institution_address: profile.institution_address
        });
        
    } catch (error) {
        console.error('Error fetching requester profile:', error);
        res.status(500).json({ error: 'Failed to fetch requester profile' });
    }
});

// Coordinator Dashboard Statistics
app.get('/api/coordinator/dashboard-stats', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        
        // Get coordinator's institution
        const [institutionRows] = await db.query(
            'SELECT institution_id FROM institutions WHERE user_id = ?',
            [coordinatorId]
        );
        
        if (institutionRows.length === 0) {
            return res.json({
                totalPrinters: 0,
                totalUsers: 0,
                activeRequests: 0,
                pendingApprovals: 0
            });
        }
        
        const institutionId = institutionRows[0].institution_id;
        
        // Get total printers for this institution from client_printer_assignments
        const [printersResult] = await db.query(
            'SELECT COUNT(*) as count FROM client_printer_assignments WHERE institution_id = ?',
            [institutionId]
        );
        const totalPrinters = printersResult[0].count;
        
        // Get total users for this institution
        // Count users who are assigned to this institution via user_printer_assignments
        const [usersResult] = await db.query(
            `SELECT COUNT(DISTINCT user_id) as count 
             FROM user_printer_assignments
             WHERE institution_id = ?`,
            [institutionId]
        );
        const totalUsers = usersResult[0].count;
        
        // Get active service requests for this institution
        // service_requests table has institution_id directly, no need to join with printers
        const [activeRequestsResult] = await db.query(
            `SELECT COUNT(*) as count FROM service_requests
             WHERE institution_id = ? AND status IN ('pending', 'in_progress', 'approved')`,
            [institutionId]
        );
        const activeRequests = activeRequestsResult[0].count;
        
        // Get pending approvals (completed services awaiting approval)
        const [pendingApprovalsResult] = await db.query(
            `SELECT COUNT(*) as count FROM service_requests
             WHERE institution_id = ? AND status = 'completed'`,
            [institutionId]
        );
        const pendingApprovals = pendingApprovalsResult[0].count;
        
        res.json({
            totalPrinters,
            totalUsers,
            activeRequests,
            pendingApprovals
        });
    } catch (error) {
        console.error('Error fetching coordinator dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
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
app.get('/api/coordinators', authenticateAdmin, async (req, res) => {
    try {
        const { search, status } = req.query;
        
        let query = `
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.status,
                u.approval_status,
                u.is_email_verified,
                u.created_at,
                u.updated_at,
                i.name as institution_name,
                i.institution_id,
                i.type as institution_type
            FROM users u 
            LEFT JOIN institutions i ON i.user_id = u.id
            WHERE u.role = 'coordinator' AND u.approval_status = 'approved'
        `;
        
        const params = [];
        
        // Add search filter
        if (search && search.trim()) {
            query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR i.name LIKE ?)`;
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        // Add status filter for approved coordinators only
        if (status && status.trim()) {
            query += ` AND u.status = ?`;
            params.push(status.trim());
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const [rows] = await db.query(query, params);
        
        // Format response to include institution field for frontend compatibility
        const formattedRows = rows.map(row => ({
            ...row,
            institution: row.institution_name || 'No Organization'
        }));
        
        res.json(formattedRows);
    } catch (error) {
        console.error('Error fetching coordinators:', error);
        res.status(500).json({ error: 'Failed to fetch coordinators' });
    }
});

// Coordinator creates a user under their institution and may assign a printer
app.post('/api/coordinators/:id/users', authenticateCoordinator, async (req, res) => {
    let connection;
    try {
        const coordinatorId = req.params.id;
        const creator = req.user;

        // Only allow the logged-in coordinator to create users for their own account
        if (String(creator.id) !== String(coordinatorId) && creator.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

    const { firstName, lastName, email, password, inventory_item_ids, department } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'firstName, lastName, email and password are required' });
        }

        // Support both single inventory_item_id (legacy) and multiple inventory_item_ids (new)
        let printerIds = [];
        if (req.body.inventory_item_ids && Array.isArray(req.body.inventory_item_ids)) {
            printerIds = req.body.inventory_item_ids.filter(id => id); // Remove null/undefined
        } else if (req.body.inventory_item_id) {
            printerIds = [req.body.inventory_item_id];
        }

        // Check email uniqueness
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Get coordinator's institution using the correct architecture:
        // institutions.user_id points to the coordinator who owns that institution
        const [institutionRows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
            [coordinatorId]
        );
        
        let coordinatorInstitutionId = null;
        
        if (institutionRows && institutionRows.length > 0) {
            coordinatorInstitutionId = institutionRows[0].institution_id;
            console.log(`Found institution for coordinator ${coordinatorId}: ${institutionRows[0].name} (${coordinatorInstitutionId})`);
        } else {
            console.log(`No institution found for coordinator ${coordinatorId}`);
        }

        // If we still couldn't find an institution_id, reject creation - coordinator must be linked to an institution
        if (!coordinatorInstitutionId) {
            return res.status(400).json({ error: 'Coordinator has no associated institution. Please set your institution before creating users.' });
        }


       // Start transaction
       connection = await db.getConnection();
       await connection.beginTransaction();

       // Hash password
       const bcrypt = require('bcrypt');
       const hashedPassword = await bcrypt.hash(password, 10);

       // Create the user record in users table (use transactional connection)
       // Note: users table does NOT have institution_id column
       // Institution association is handled through user_printer_assignments.institution_id
       const assignedRole = 'requester';
       const userInsertSql = `INSERT INTO users (first_name, last_name, email, password, role, is_email_verified, approval_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
       const userInsertParams = [firstName, lastName, email, hashedPassword, assignedRole, true, 'approved'];

       console.log('Inserting new user with params (transaction):', userInsertParams);
       const [userResult] = await connection.query(userInsertSql, userInsertParams);
       console.log('User insert result:', userResult);
       const newUserId = userResult.insertId;

        // Fetch the newly created user row for response
        // Note: users table does NOT have institution_id or institution_name columns
        let newUserRow = null;
        try {
            const [newUserRows] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [newUserId]);
            newUserRow = newUserRows[0];
            console.log('New user row:', newUserRow);
        } catch (e) {
            console.warn('Could not fetch new user row:', e.message);
        }

        // Prepare department for assignment
        const departmentToSave = department || null;

        // Create assignments for all selected printers
        const assignmentIds = [];
        const assignedPrinters = [];
        
        for (const inventory_item_id of printerIds) {
            if (!inventory_item_id) continue;
            // Validate inventory item exists
            const [itemRows] = await connection.query('SELECT id, status FROM inventory_items WHERE id = ?', [inventory_item_id]);
            if (itemRows.length === 0) {
                // rollback and return
                await connection.rollback();
                return res.status(400).json({ error: 'Invalid inventory_item_id' });
            }

            // Multiple users can share the same printer (common in real institutions)
            // No need to check for existing assignments

            const currentStatus = itemRows[0].status;

            if (currentStatus === 'available') {
                // Straightforward: item is available, insert assignment and mark assigned
                const assignSql = `INSERT INTO user_printer_assignments (user_id, inventory_item_id, institution_id, department) VALUES (?, ?, ?, ?)`;
                const assignParams = [newUserId, inventory_item_id, coordinatorInstitutionId, departmentToSave];
                console.log('Inserting user_printer_assignments with params (transaction):', assignParams);
                const [insertAssign] = await connection.query(assignSql, assignParams);
                console.log('Assignment insert result:', insertAssign);
                assignmentId = insertAssign.insertId;

                // Fetch the inserted assignment row for response
                try {
                    const [assignmentRows] = await db.query('SELECT id, user_id, inventory_item_id, institution_id, department, assigned_at FROM user_printer_assignments WHERE id = ?', [assignmentId]);
                    console.log('Inserted assignment row:', assignmentRows[0]);
                    var createdAssignmentRow = assignmentRows[0];
                } catch (e) {
                    console.warn('Could not fetch inserted assignment row:', e.message);
                }

                // Mark inventory item as assigned
                console.log('Updating inventory_items.status to assigned for id', inventory_item_id);
                await connection.query('UPDATE inventory_items SET status = "assigned" WHERE id = ?', [inventory_item_id]);
                
                // Send notification to new user about printer assignment
                try {
                    const [printerInfo] = await connection.query(
                        'SELECT name, brand, model, serial_number FROM inventory_items WHERE id = ?',
                        [inventory_item_id]
                    );
                    const [coordInfo] = await connection.query(
                        'SELECT first_name, last_name FROM users WHERE id = ?',
                        [coordinatorId]
                    );
                    
                    if (printerInfo[0] && coordInfo[0]) {
                        const printerDetails = `${printerInfo[0].brand} ${printerInfo[0].model} (SN: ${printerInfo[0].serial_number})`;
                        await createNotification({
                            title: 'Printer Assigned',
                            message: `Coordinator ${coordInfo[0].first_name} ${coordInfo[0].last_name} has assigned you a printer: ${printerDetails}`,
                            type: 'info',
                            user_id: newUserId,
                            sender_id: coordinatorId,
                            reference_type: 'inventory_item',
                            reference_id: inventory_item_id,
                            priority: 'medium'
                        });
                        console.log('✅ Notification sent to new user about printer assignment');
                    }
                } catch (notifError) {
                    console.error('❌ Failed to send printer assignment notification:', notifError);
                }
                
                assignmentIds.push(assignmentId);
                assignedPrinters.push({
                    inventory_item_id,
                    assignment_id: assignmentId,
                    status: 'available_assigned'
                });
            } else if (currentStatus === 'assigned') {
                // If already assigned, ensure it's assigned to the same institution (or no institution mapping exists)
                const [cpaRows] = await connection.query(
                    'SELECT institution_id FROM client_printer_assignments WHERE inventory_item_id = ? LIMIT 1',
                    [inventory_item_id]
                );

                if (cpaRows.length > 0 && coordinatorInstitutionId && cpaRows[0].institution_id !== coordinatorInstitutionId) {
                    return res.status(400).json({ error: 'Inventory item is assigned to a different institution' });
                }

                // Insert user-printer assignment without changing inventory_items.status (already 'assigned')
                const assignSql = `INSERT INTO user_printer_assignments (user_id, inventory_item_id, institution_id, department) VALUES (?, ?, ?, ?)`;
                const assignParams = [newUserId, inventory_item_id, coordinatorInstitutionId, departmentToSave];
                console.log('Inserting user_printer_assignments with params (existing assigned item, transaction):', assignParams);
                const [insertAssign] = await connection.query(assignSql, assignParams);
                console.log('Assignment insert result (existing assigned item):', insertAssign);
                assignmentId = insertAssign.insertId;
                try {
                    const [assignmentRows] = await db.query('SELECT id, user_id, inventory_item_id, institution_id, department, assigned_at FROM user_printer_assignments WHERE id = ?', [assignmentId]);
                    console.log('Inserted assignment row (existing assigned item):', assignmentRows[0]);
                    var createdAssignmentRow = assignmentRows[0];
                } catch (e) {
                    console.warn('Could not fetch inserted assignment row:', e.message);
                }
                
                assignmentIds.push(assignmentId);
                assignedPrinters.push({
                    inventory_item_id,
                    assignment_id: assignmentId,
                    status: 'already_assigned'
                });
            } else {
                // Other statuses (retired, etc.) are not assignable - skip this printer
                console.warn(`Skipping inventory_item_id ${inventory_item_id} - status ${currentStatus} not assignable`);
                continue;
            }
        } // End of for loop for printer assignments
        
        // commit transaction and release
        await connection.commit();
        // fetch final assignment details if needed
        res.status(201).json({ 
            message: 'User created', 
            userId: newUserId, 
            user: newUserRow, 
            assignmentIds,
            assignedPrinters
        });
    } catch (error) {
        console.error('Error creating user by coordinator (transactional):', error);
        try {
            if (connection) await connection.rollback();
        } catch (rbErr) {
            console.error('Rollback failed:', rbErr);
        }
        res.status(500).json({ error: 'Failed to create user' });
    } finally {
        try {
            if (connection) connection.release();
        } catch (e) {
            // ignore
        }
    }
});

// Get users for a coordinator's institution (includes printer assignment info)
app.get('/api/coordinators/:id/users', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const requester = req.user;

        // Only allow the logged-in coordinator to view users for their own account (or admin)
        if (String(requester.id) !== String(coordinatorId) && requester.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get coordinator's institution using correct architecture:
        // institutions.user_id points to the coordinator who owns that institution
        const [institutionRows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
            [coordinatorId]
        );

        if (!institutionRows || institutionRows.length === 0) {
            console.warn('Coordinator', coordinatorId, 'has no associated institution.');
            return res.status(400).json({ error: 'Coordinator has no associated institution.' });
        }

        const coordinatorInstitutionId = institutionRows[0].institution_id;
        console.log(`GET /api/coordinators/:id/users - Coordinator ${coordinatorId} owns institution ${coordinatorInstitutionId} (${institutionRows[0].name})`);

        // Fetch users that have printers assigned to this institution
        // Note: Users don't have institution_id, but user_printer_assignments does
        const [rows] = await db.query(`
            SELECT 
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                CASE 
                    WHEN u.status IS NOT NULL AND u.status != '' THEN u.status
                    WHEN u.approval_status = 'approved' THEN 'active'
                    ELSE COALESCE(u.status, u.approval_status)
                END AS status,
                upa.inventory_item_id,
                COALESCE(ii.name, CONCAT_WS(' ', ii.brand, ii.model, ii.serial_number)) AS printer_name,
                upa.department,
                upa.assigned_at
            FROM user_printer_assignments upa
            JOIN users u ON upa.user_id = u.id
            LEFT JOIN inventory_items ii ON upa.inventory_item_id = ii.id
            WHERE upa.institution_id = ?
            ORDER BY u.created_at DESC, upa.assigned_at DESC
        `, [coordinatorInstitutionId]);

        // Group results by user to return array of printers for each user
        const userMap = new Map();
        rows.forEach(row => {
            if (!userMap.has(row.user_id)) {
                userMap.set(row.user_id, {
                    user_id: row.user_id,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email,
                    role: row.role,
                    status: row.status,
                    department: row.department,
                    printers: []
                });
            }
            userMap.get(row.user_id).printers.push({
                inventory_item_id: row.inventory_item_id,
                printer_name: row.printer_name,
                assigned_at: row.assigned_at
            });
        });

        const groupedUsers = Array.from(userMap.values());
        console.log(`Fetched ${groupedUsers.length} users with ${rows.length} total printer assignments for institution ${coordinatorInstitutionId}`);
        res.json(groupedUsers);
    } catch (error) {
        console.error('Error fetching coordinator users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user status (active/inactive) by coordinator for their institution users
app.patch('/api/coordinators/:id/users/:userId/status', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const userId = req.params.userId;
        const requester = req.user;

        if (String(requester.id) !== String(coordinatorId) && requester.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
        }

        // Get coordinator's institution using correct architecture
        const [institutionRows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
            [coordinatorId]
        );

        if (!institutionRows || institutionRows.length === 0) {
            return res.status(400).json({ error: 'Coordinator has no associated institution.' });
        }

        const coordinatorInstitutionId = institutionRows[0].institution_id;

        // Verify target user belongs to coordinator's institution
        // Since users don't have institution_id, check via user_printer_assignments
        const [targetAssignments] = await db.query(
            'SELECT user_id FROM user_printer_assignments WHERE user_id = ? AND institution_id = ? LIMIT 1', 
            [userId, coordinatorInstitutionId]
        );
        
        if (!targetAssignments || targetAssignments.length === 0) {
            return res.status(403).json({ error: 'User does not belong to your institution' });
        }

        // Check current user status and update accordingly
        const [targetUserRows] = await db.query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
        const previousUserStatus = targetUserRows && targetUserRows.length > 0 ? targetUserRows[0].status : 'active';

        // If coordinator (or admin) is deactivating the user, increment token_version to invalidate sessions
        if (previousUserStatus !== status && status === 'inactive') {
            await db.query('UPDATE users SET status = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?', [status, userId]);
            console.log(`Coordinator deactivated user ${userId} — token_version incremented to invalidate sessions`);
        } else {
            await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', [status, userId]);
        }

        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        console.error('Error updating user status by coordinator:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Edit a user created by a coordinator (details + assignment)
app.put('/api/coordinators/:id/users/:userId', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const userId = req.params.userId;
        const requester = req.user;

        if (String(requester.id) !== String(coordinatorId) && requester.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { firstName, lastName, email, department, inventory_item_ids } = req.body;

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'firstName, lastName and email are required' });
        }

        // Support both single inventory_item_id (legacy) and multiple inventory_item_ids (new)
        let printerIds = [];
        if (req.body.inventory_item_ids && Array.isArray(req.body.inventory_item_ids)) {
            printerIds = req.body.inventory_item_ids.filter(id => id);
        } else if (req.body.inventory_item_id) {
            printerIds = [req.body.inventory_item_id];
        }

        // Get coordinator's institution using correct architecture
        const [institutionRows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
            [coordinatorId]
        );

        if (!institutionRows || institutionRows.length === 0) {
            return res.status(400).json({ error: 'Coordinator has no associated institution.' });
        }

        const coordinatorInstitutionId = institutionRows[0].institution_id;

        // Verify target user belongs to coordinator's institution
        const [targetAssignments] = await db.query(
            'SELECT user_id FROM user_printer_assignments WHERE user_id = ? AND institution_id = ? LIMIT 1', 
            [userId, coordinatorInstitutionId]
        );
        
        if (!targetAssignments || targetAssignments.length === 0) {
            return res.status(403).json({ error: 'User does not belong to your institution' });
        }

        // Check email uniqueness (exclude this user)
        const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
        if (existingEmail && existingEmail.length > 0) return res.status(409).json({ error: 'Email already in use by another account' });

        // Update user basic info (users table does NOT have department column)
        await db.query(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = NOW() WHERE id = ?', 
            [firstName, lastName, email, userId]
        );

        // Handle printer assignment changes
        // Get all current assignments for this user
        const [currentAssignments] = await db.query(
            'SELECT id, inventory_item_id, department FROM user_printer_assignments WHERE user_id = ? AND institution_id = ?',
            [userId, coordinatorInstitutionId]
        );
        
        const currentPrinterIds = currentAssignments.map(a => Number(a.inventory_item_id));
        const newPrinterIds = printerIds.map(id => Number(id));
        
        // Determine which assignments to add and which to remove
        const toAdd = newPrinterIds.filter(id => !currentPrinterIds.includes(id));
        const toRemove = currentPrinterIds.filter(id => !newPrinterIds.includes(id));
        const toKeep = currentPrinterIds.filter(id => newPrinterIds.includes(id));
        
        console.log(`Updating printer assignments for user ${userId}: add=${toAdd.length}, remove=${toRemove.length}, keep=${toKeep.length}`);
        
        // Remove old assignments that are no longer selected
        for (const printerIdToRemove of toRemove) {
            const assignmentToRemove = currentAssignments.find(a => Number(a.inventory_item_id) === printerIdToRemove);
            if (assignmentToRemove) {
                await db.query('DELETE FROM user_printer_assignments WHERE id = ?', [assignmentToRemove.id]);
                // Check if any other user has this printer assigned
                const [otherAssignments] = await db.query(
                    'SELECT id FROM user_printer_assignments WHERE inventory_item_id = ? LIMIT 1',
                    [printerIdToRemove]
                );
                if (!otherAssignments || otherAssignments.length === 0) {
                    // No other user has this printer, mark as available
                    await db.query('UPDATE inventory_items SET status = "available" WHERE id = ?', [printerIdToRemove]);
                }
                console.log(`Removed printer ${printerIdToRemove} from user ${userId}`);
            }
        }
        
        // Add new assignments
        for (const inventory_item_id of toAdd) {
            // Validate inventory item
            const [itemRows] = await db.query('SELECT id, status FROM inventory_items WHERE id = ?', [inventory_item_id]);
            if (itemRows.length === 0) {
                console.warn(`Invalid inventory_item_id ${inventory_item_id} - skipping`);
                continue;
            }

            // Insert new assignment
            await db.query(
                'INSERT INTO user_printer_assignments (user_id, inventory_item_id, institution_id, department) VALUES (?, ?, ?, ?)',
                [userId, inventory_item_id, coordinatorInstitutionId, department || null]
            );
            
            // Mark inventory as assigned
            await db.query('UPDATE inventory_items SET status = "assigned" WHERE id = ?', [inventory_item_id]);
            
            console.log(`Added printer ${inventory_item_id} to user ${userId}`);
            
            // Send notification to requester about new printer assignment
            try {
                const [printerInfo] = await db.query(
                    'SELECT name, brand, model, serial_number FROM inventory_items WHERE id = ?',
                    [inventory_item_id]
                );
                const [coordInfo] = await db.query(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [coordinatorId]
                );
                
                if (printerInfo[0] && coordInfo[0]) {
                    const printerDetails = `${printerInfo[0].brand || ''} ${printerInfo[0].model || ''} (SN: ${printerInfo[0].serial_number || 'N/A'})`;
                    await createNotification({
                        title: 'New Printer Assigned',
                        message: `Coordinator ${coordInfo[0].first_name} ${coordInfo[0].last_name} has assigned you a new printer: ${printerDetails}`,
                        type: 'info',
                        user_id: userId,
                        sender_id: coordinatorId,
                        reference_type: 'inventory_item',
                        reference_id: inventory_item_id,
                        priority: 'medium'
                    });
                    console.log('✅ Notification sent to requester about new printer assignment');
                }
            } catch (notifError) {
                console.error('❌ Failed to send printer assignment notification:', notifError);
            }
        } // End of add new assignments loop
        
        // Update department for all kept assignments if department changed
        if (department !== undefined && toKeep.length > 0) {
            await db.query(
                'UPDATE user_printer_assignments SET department = ? WHERE user_id = ? AND institution_id = ?',
                [department || null, userId, coordinatorInstitutionId]
            );
        }

        // Return updated user row with all assignments
        const [updatedRows] = await db.query('SELECT id as user_id, first_name, last_name, email, role, status FROM users WHERE id = ?', [userId]);
        const updatedUser = updatedRows[0];
        
        // Fetch all assignments
        const [newAssignRows] = await db.query(
            `SELECT upa.id, upa.inventory_item_id, upa.department, upa.assigned_at,
                    COALESCE(ii.name, CONCAT_WS(' ', ii.brand, ii.model)) as printer_name
             FROM user_printer_assignments upa
             LEFT JOIN inventory_items ii ON upa.inventory_item_id = ii.id
             WHERE upa.user_id = ? AND upa.institution_id = ?`,
            [userId, coordinatorInstitutionId]
        );

        res.json({ 
            message: 'User updated', 
            user: updatedUser, 
            assignments: newAssignRows,
            changes: {
                added: toAdd.length,
                removed: toRemove.length,
                kept: toKeep.length
            }
        });
    } catch (error) {
        console.error('Error editing user by coordinator:', error);
        res.status(500).json({ error: 'Failed to edit user' });
    }
});

// Coordinator change user password
app.patch('/api/coordinators/:id/users/:userId/password', authenticateCoordinator, async (req, res) => {
    try {
        const coordinatorId = req.params.id;
        const userId = req.params.userId;
        const requester = req.user;
        const { newPassword } = req.body;

        // Verify coordinator is updating their own institution's users
        if (String(requester.id) !== String(coordinatorId) && requester.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Get coordinator's institution
        const [institutionRows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE user_id = ?', 
            [coordinatorId]
        );

        if (!institutionRows || institutionRows.length === 0) {
            return res.status(400).json({ error: 'Coordinator has no associated institution' });
        }

        const coordinatorInstitutionId = institutionRows[0].institution_id;

        // Verify target user belongs to coordinator's institution
        const [targetAssignments] = await db.query(
            'SELECT user_id FROM user_printer_assignments WHERE user_id = ? AND institution_id = ? LIMIT 1', 
            [userId, coordinatorInstitutionId]
        );
        
        if (!targetAssignments || targetAssignments.length === 0) {
            return res.status(403).json({ error: 'User does not belong to your institution' });
        }

        // Verify user exists and is a requester
        const [userRows] = await db.query(
            'SELECT id, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRows[0];

        // Prevent coordinators from changing passwords of non-requester users
        if (user.role !== 'requester') {
            return res.status(403).json({ error: 'You can only change passwords for requester users' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and increment token_version to invalidate all existing sessions
        await db.query(
            'UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?',
            [hashedPassword, userId]
        );

        console.log(`[COORDINATOR] Coordinator ${coordinatorId} changed password for user ${userId} (${user.first_name} ${user.last_name}) - All sessions invalidated`);

        res.json({ 
            message: 'Password updated successfully',
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
    } catch (error) {
        console.error('Error changing user password by coordinator:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Admin change staff password
app.patch('/api/admin/staff/:staffId/password', authenticateAdmin, async (req, res) => {
    try {
        const staffId = req.params.staffId;
        const { newPassword } = req.body;

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Verify staff user exists and is staff (technician or operations_officer)
        const [userRows] = await db.query(
            'SELECT id, role, first_name, last_name, email, status FROM users WHERE id = ?',
            [staffId]
        );

        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        const user = userRows[0];

        // Verify user is staff (not admin, coordinator, or requester)
        if (!['technician', 'operations_officer'].includes(user.role)) {
            return res.status(403).json({ error: 'Can only change passwords for staff members (technician or operations officer)' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and increment token_version to invalidate all existing sessions
        await db.query(
            'UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?',
            [hashedPassword, staffId]
        );

        console.log(`[ADMIN] Admin changed password for staff ${staffId} (${user.first_name} ${user.last_name}) - Role: ${user.role} - All sessions invalidated`);

        res.json({ 
            message: 'Password updated successfully',
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error changing staff password by admin:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Admin change coordinator password
app.patch('/api/admin/coordinators/:coordinatorId/password', authenticateAdmin, async (req, res) => {
    try {
        const coordinatorId = req.params.coordinatorId;
        const { newPassword } = req.body;

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Verify coordinator exists and is a coordinator
        const [userRows] = await db.query(
            'SELECT id, role, first_name, last_name, email, status FROM users WHERE id = ?',
            [coordinatorId]
        );

        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }

        const user = userRows[0];

        // Verify user is coordinator
        if (user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Can only change passwords for coordinator accounts' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and increment token_version to invalidate all existing sessions
        await db.query(
            'UPDATE users SET password = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?',
            [hashedPassword, coordinatorId]
        );

        console.log(`[ADMIN] Admin changed password for coordinator ${coordinatorId} (${user.first_name} ${user.last_name}) - All sessions invalidated`);

        res.json({ 
            message: 'Password updated successfully',
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error changing coordinator password by admin:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get pending coordinators for approval page
app.get('/api/coordinators/pending', authenticateAdmin, async (req, res) => {
    try {
        const { search } = req.query;
        
        // Query pending coordinators and get institution info from notifications.related_data
        // since institutions.user_id is only set after approval
        let query = `
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                u.approval_status,
                u.is_email_verified,
                u.created_at,
                tp.front_id_photo,
                tp.back_id_photo,
                tp.selfie_photo,
                n.related_data
            FROM users u 
            LEFT JOIN temp_user_photos tp ON tp.user_id = u.id
            LEFT JOIN notifications n ON n.related_user_id = u.id AND n.type = 'coordinator_registration'
            WHERE u.role = 'coordinator' AND u.approval_status = 'pending'
        `;
        
        const params = [];
        
        // Add search filter
        if (search && search.trim()) {
            query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const [rows] = await db.query(query, params);
        
        // Parse related_data JSON to extract institution information
        const formattedRows = rows.map(row => {
            let institutionInfo = {
                institution_name: '',
                institution_type: '',
                institution_address: ''
            };
            
            if (row.related_data) {
                try {
                    const data = typeof row.related_data === 'string' 
                        ? JSON.parse(row.related_data) 
                        : row.related_data;
                    
                    institutionInfo = {
                        institution_name: data.institution_name || '',
                        institution_type: data.institution_type || '',
                        institution_address: data.institution_address || ''
                    };
                } catch (e) {
                    console.error('Error parsing notification related_data:', e);
                }
            }
            
            // Remove related_data and spread institution info
            const { related_data, ...rest } = row;
            return {
                ...rest,
                ...institutionInfo
            };
        });
        
        res.json(formattedRows);
    } catch (error) {
        console.error('Error fetching pending coordinators:', error);
        res.status(500).json({ error: 'Failed to fetch pending coordinators' });
    }
});

// Approve coordinator
app.post('/api/coordinators/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get current coordinator status
        const [user] = await db.query(
            'SELECT approval_status, first_name, last_name, email FROM users WHERE id = ? AND role = "coordinator"',
            [id]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }

        if (user[0].approval_status === 'approved') {
            return res.status(400).json({ error: 'Coordinator is already approved' });
        }

        // Use the shared approveUser helper so institution linking happens at approval time
        await User.approveUser(id);

        // Log audit action
        await logAuditAction(
            req.user.id,
            req.user.role,
            `Approved coordinator registration: ${user[0].first_name} ${user[0].last_name} (${user[0].email})`,
            'approve',
            'user',
            id,
            JSON.stringify({
                action: 'coordinator_approval',
                coordinator_id: id,
                coordinator_name: `${user[0].first_name} ${user[0].last_name}`,
                coordinator_email: user[0].email,
                previous_status: user[0].approval_status,
                new_status: 'approved'
            }),
            req
        );

        // Send approval email notification (frontend will trigger actual email)
        const emailData = {
            coordinator_name: `${user[0].first_name} ${user[0].last_name}`,
            coordinator_email: user[0].email,
            to_email: user[0].email
        };

        res.json({ 
            message: 'Coordinator approved successfully',
            coordinator: user[0],
            emailData // Send email data to frontend to trigger EmailJS
        });
    } catch (error) {
        console.error('Error approving coordinator:', error);
        res.status(500).json({ error: 'Failed to approve coordinator' });
    }
});

// Reject coordinator
app.post('/api/coordinators/:id/reject', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        // Get current coordinator status
        const [user] = await db.query(
            'SELECT approval_status, first_name, last_name, email FROM users WHERE id = ? AND role = "coordinator"',
            [id]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }

        if (user[0].approval_status === 'rejected') {
            return res.status(400).json({ error: 'Coordinator is already rejected' });
        }

        // Reject the coordinator
        await db.query(
            'UPDATE users SET approval_status = ?, updated_at = NOW() WHERE id = ?',
            ['rejected', id]
        );

        // Log audit action
        await logAuditAction(
            req.user.id,
            req.user.role,
            `Rejected coordinator registration: ${user[0].first_name} ${user[0].last_name} (${user[0].email})`,
            'reject',
            'user',
            id,
            JSON.stringify({
                action: 'coordinator_rejection',
                coordinator_id: id,
                coordinator_name: `${user[0].first_name} ${user[0].last_name}`,
                coordinator_email: user[0].email,
                previous_status: user[0].approval_status,
                new_status: 'rejected',
                reason: reason || 'No reason provided'
            }),
            req
        );

        res.json({ 
            message: 'Coordinator rejected successfully',
            coordinator: user[0]
        });
    } catch (error) {
        console.error('Error rejecting coordinator:', error);
        res.status(500).json({ error: 'Failed to reject coordinator' });
    }
});

app.get('/api/coordinators/:id', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                u.*,
                i.name as institution_name,
                i.institution_id,
                i.type as institution_type
            FROM users u 
            LEFT JOIN institutions i ON i.user_id = u.id
            WHERE u.id = ? AND u.role = 'coordinator'`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }
        // Add institution field for frontend compatibility
        const coordinator = {
            ...rows[0],
            institution: rows[0].institution_name || 'No Organization'
        };
        res.json(coordinator);
    } catch (error) {
        console.error('Error fetching coordinator:', error);
        res.status(500).json({ error: 'Failed to fetch coordinator details' });
    }
});

// Activate or deactivate coordinator account
app.post('/api/coordinators/:id/toggle-status', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get current coordinator status
        const [user] = await db.query(
            'SELECT status, approval_status, first_name, last_name, email FROM users WHERE id = ? AND role = "coordinator"',
            [id]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'Coordinator not found' });
        }

        const currentUser = user[0];
        
        // Only allow status changes for approved coordinators
        if (currentUser.approval_status !== 'approved') {
            return res.status(400).json({ error: 'Can only activate/deactivate approved coordinators' });
        }

        // Toggle the status
        const newStatus = currentUser.status === 'active' ? 'inactive' : 'active';
        const actionMessage = newStatus === 'active' 
            ? 'Coordinator account activated successfully' 
            : 'Coordinator account deactivated successfully';

        // Update the coordinator status and invalidate sessions if deactivating
        if (currentUser.status !== newStatus && newStatus === 'inactive') {
            await db.query('UPDATE users SET status = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?', [newStatus, id]);
            console.log(`Admin deactivated coordinator ${id} — token_version incremented to invalidate sessions`);
        } else {
            await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
        }

        res.json({ 
            message: actionMessage,
            newStatus: newStatus
        });
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
        console.log(`📋 Fetching printers for institution: ${institutionId}`);
        
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
            WHERE cpa.institution_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
            ORDER BY cpa.assigned_at DESC`,
            [institutionId]
        );
        
        console.log(`✅ Found ${rows.length} printers for institution ${institutionId}`);
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching printers:', error);
        console.error('Institution ID:', institutionId);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Failed to fetch printers', details: error.message });
    }
});

// Assign a printer (from inventory) to an institution
app.post('/api/institutions/:institutionId/printers', authenticateAdmin, async (req, res) => {
    try {
        const { institutionId } = req.params;
        const { inventory_item_id, location_note } = req.body;

        if (!inventory_item_id) {
            return res.status(400).json({ error: 'inventory_item_id is required' });
        }

        // Validate institution exists and get coordinator
        const [inst] = await db.query(
            'SELECT institution_id, name, user_id FROM institutions WHERE institution_id = ?', 
            [institutionId]
        );
        if (inst.length === 0) {
            return res.status(400).json({ error: 'Invalid institution ID' });
        }

        // Validate inventory item exists and is available
        const [item] = await db.query(
            'SELECT id, name, brand, model, serial_number, status FROM inventory_items WHERE id = ?', 
            [inventory_item_id]
        );
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

        // Send notification to coordinator about new printer assignment
        if (inst[0].user_id) {
            try {
                const printerName = item[0].name || `${item[0].brand} ${item[0].model}`.trim();
                const printerDetails = item[0].serial_number ? 
                    `${printerName} (SN: ${item[0].serial_number})` : printerName;
                
                await createNotification({
                    title: 'New Printer Assigned to Your Institution',
                    message: `A printer has been assigned to ${inst[0].name}: ${printerDetails}. ${location_note ? `Location: ${location_note}` : ''}`,
                    type: 'info',
                    user_id: inst[0].user_id,
                    sender_id: null, // Admin assignment
                    reference_type: 'inventory_item',
                    reference_id: inventory_item_id,
                    priority: 'medium'
                });
                console.log('✅ Notification sent to coordinator about printer assignment');
            } catch (notifError) {
                console.error('❌ Failed to send printer assignment notification:', notifError);
            }
        }

        res.status(201).json({ message: 'Printer assigned', assignment_id: result.insertId });
    } catch (error) {
        console.error('Error assigning printer:', error);
        res.status(500).json({ error: 'Failed to assign printer' });
    }
});

// Update an assignment's location note
app.put('/api/printers/:id', authenticateAdmin, async (req, res) => {
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
app.delete('/api/printers/:id', authenticateAdmin, async (req, res) => {
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

// Get single printer details by institution and printer ID
app.get('/api/institutions/:institutionId/printer/:printerId', auth, async (req, res) => {
    try {
        const { institutionId, printerId } = req.params;
        
        // Query using client_printer_assignments and inventory_items
        const [rows] = await db.query(
            `SELECT 
                cpa.id as assignment_id,
                ii.id as printer_id,
                ii.name,
                ii.brand,
                ii.model,
                ii.serial_number,
                cpa.location_note as location,
                ii.status,
                cpa.assigned_at as installation_date,
                cpa.institution_id,
                inst.name as institution_name
            FROM client_printer_assignments cpa
            JOIN inventory_items ii ON cpa.inventory_item_id = ii.id
            JOIN institutions inst ON cpa.institution_id = inst.institution_id
            WHERE cpa.institution_id = ? AND ii.id = ?`,
            [institutionId, printerId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Printer not found for this institution' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching printer details:', error);
        res.status(500).json({ error: 'Failed to fetch printer details' });
    }
});

// Get service history for a specific printer
app.get('/api/institutions/:institutionId/printer/:printerId/service-history', auth, async (req, res) => {
    try {
        const { institutionId, printerId } = req.params;
        
        // Query service_requests table for this printer's history
        const [rows] = await db.query(
            `SELECT 
                sr.id,
                sr.request_number,
                sr.description,
                sr.status,
                sr.priority,
                sr.created_at as service_date,
                sr.completed_at,
                sr.resolution_notes as description,
                CONCAT(tech.first_name, ' ', tech.last_name) as technician_name,
                sr.status as service_type
            FROM service_requests sr
            LEFT JOIN users tech ON sr.technician_id = tech.id
            WHERE sr.institution_id = ? AND sr.inventory_item_id = ?
            ORDER BY sr.created_at DESC`,
            [institutionId, printerId]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching service history:', error);
        res.status(500).json({ error: 'Failed to fetch service history' });
    }
});

// Staff Management API endpoints

// Get all staff members (operations officers and technicians)
app.get('/api/staff', authenticateAdmin, async (req, res) => {
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
                u.status
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
app.post('/api/staff', authenticateAdmin, async (req, res) => {
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
                is_email_verified, approval_status, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                firstName, 
                lastName, 
                email, 
                hashedPassword, 
                role, 
                true, // Staff are automatically verified
                'approved', // Staff are automatically approved
                'active' // Staff are automatically active
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


// Update staff member details (first name, last name, department, role, status)
app.put('/api/staff/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, role, status } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !role || !status) {
            return res.status(400).json({ error: 'First name, last name, role, and status are required' });
        }
        if (!['operations_officer', 'technician'].includes(role)) {
            return res.status(400).json({ error: 'Role must be either operations_officer or technician' });
        }
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Status must be either active or inactive' });
        }

            // Check if staff member exists and get current status
            const [staff] = await db.query(
                'SELECT id, status FROM users WHERE id = ? AND role IN ("operations_officer", "technician")',
                [id]
            );
            if (staff.length === 0) {
                return res.status(404).json({ error: 'Staff member not found' });
            }

            const previousStatus = staff[0].status || 'active';

            // If admin is deactivating the staff, increment token_version to invalidate existing sessions
            if (previousStatus !== status && status === 'inactive') {
                await db.query(
                    'UPDATE users SET first_name = ?, last_name = ?, role = ?, status = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?',
                    [first_name, last_name, role, status, id]
                );
                console.log(`Admin deactivated staff ${id} — token_version incremented to invalidate sessions`);
            } else {
                // Normal update
                await db.query(
                    'UPDATE users SET first_name = ?, last_name = ?, role = ?, status = ?, updated_at = NOW() WHERE id = ?',
                    [first_name, last_name, role, status, id]
                );
            }

            res.json({ message: 'Staff member updated successfully' });
    } catch (error) {
        console.error('Error updating staff member:', error);
        res.status(500).json({ error: 'Failed to update staff member' });
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
                u.status
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

// Get printers assigned to the currently authenticated user
app.get('/api/users/me/printers', auth, async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const [rows] = await db.query(`
            SELECT upa.id as assignment_id, upa.inventory_item_id, upa.department, upa.assigned_at,
                   ii.name, ii.brand, ii.model, ii.serial_number
            FROM user_printer_assignments upa
            LEFT JOIN inventory_items ii ON upa.inventory_item_id = ii.id
            WHERE upa.user_id = ?
            ORDER BY upa.assigned_at DESC
        `, [userId]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching user printers:', error);
        res.status(500).json({ error: 'Failed to fetch user printers' });
    }
});

// Get service requests for the currently authenticated user (requester)
app.get('/api/users/me/service-requests', auth, async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        // For requesters, get institution from their printer assignment
        // For coordinators/admins, get institution they own
        const userRole = req.user.role;
        let institutionId = null;
        
        if (userRole === 'requester') {
            const [assignRows] = await db.query(
                'SELECT institution_id FROM user_printer_assignments WHERE user_id = ? LIMIT 1',
                [userId]
            );
            if (assignRows && assignRows.length > 0) {
                institutionId = assignRows[0].institution_id;
            }
        } else if (userRole === 'coordinator' || userRole === 'admin') {
            const [instRows] = await db.query(
                'SELECT institution_id FROM institutions WHERE user_id = ? LIMIT 1',
                [userId]
            );
            if (instRows && instRows.length > 0) {
                institutionId = instRows[0].institution_id;
            }
        }
        
        if (!institutionId) {
            return res.json([]); // User has no institution, return empty array
        }

        // For requesters: show ALL service requests for printers assigned to them
        // For coordinators: show ALL service requests for their institution
        let query = '';
        let queryParams = [];
        
        if (userRole === 'requester') {
            // Get all printers assigned to this requester
            const [assignedPrinters] = await db.query(
                'SELECT inventory_item_id FROM user_printer_assignments WHERE user_id = ?',
                [userId]
            );
            
            if (!assignedPrinters || assignedPrinters.length === 0) {
                return res.json([]); // No printers assigned
            }
            
            const printerIds = assignedPrinters.map(p => p.inventory_item_id);
            
            // Get all service requests for these printers
            query = `
                SELECT sr.id, sr.request_number, sr.inventory_item_id, sr.institution_id, sr.priority, sr.description,
                       sr.location, sr.status, sr.created_at, sr.updated_at, sr.completed_at, sr.requested_by_user_id,
                       ii.name as printer_name, ii.brand as printer_brand, ii.model as printer_model,
                       i.name as institution_name,
                       requester.first_name as requester_first_name, requester.last_name as requester_last_name,
                       tech.first_name as technician_first_name, tech.last_name as technician_last_name
                FROM service_requests sr
                LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
                LEFT JOIN institutions i ON sr.institution_id = i.institution_id
                LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
                LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
                WHERE sr.inventory_item_id IN (${printerIds.map(() => '?').join(',')})
                ORDER BY sr.created_at DESC
            `;
            queryParams = printerIds;
        } else {
            // For coordinators/admins: show all requests for their institution
            query = `
                SELECT sr.id, sr.request_number, sr.inventory_item_id, sr.institution_id, sr.priority, sr.description,
                       sr.location, sr.status, sr.created_at, sr.updated_at, sr.completed_at, sr.requested_by_user_id,
                       ii.name as printer_name, ii.brand as printer_brand, ii.model as printer_model,
                       i.name as institution_name,
                       requester.first_name as requester_first_name, requester.last_name as requester_last_name,
                       tech.first_name as technician_first_name, tech.last_name as technician_last_name
                FROM service_requests sr
                LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
                LEFT JOIN institutions i ON sr.institution_id = i.institution_id
                LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
                LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
                WHERE sr.institution_id = ?
                ORDER BY sr.created_at DESC
            `;
            queryParams = [institutionId];
        }

        const [rows] = await db.query(query, queryParams);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching user service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// Requester: Approve or reject completed service request
app.patch('/api/users/me/service-requests/:id/approve', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user && req.user.id;
        const { approved, feedback } = req.body; // approved: true/false, feedback: optional string
        
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });
        if (req.user.role !== 'requester') {
            return res.status(403).json({ error: 'Only requesters can approve service requests' });
        }
        
        // Verify this service request belongs to the requester
        const [requests] = await db.query(
            'SELECT id, status, requested_by_user_id, assigned_technician_id, request_number FROM service_requests WHERE id = ?',
            [requestId]
        );
        
        if (!requests || requests.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        const request = requests[0];
        
        // Check if this requester has access to the printer in this service request
        const [printerAccess] = await db.query(
            'SELECT id FROM user_printer_assignments WHERE user_id = ? AND inventory_item_id = (SELECT inventory_item_id FROM service_requests WHERE id = ?)',
            [userId, requestId]
        );
        
        if (!printerAccess || printerAccess.length === 0) {
            return res.status(403).json({ error: 'You can only approve service requests for printers assigned to you' });
        }
        
        if (request.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Service request is not pending approval' });
        }
        
        const newStatus = approved ? 'completed' : 'in_progress';
        const resolutionNotes = feedback || (approved ? 'Approved by requester' : 'Rejected by requester - needs revision');
        
        // Update the service request
        await db.query(
            `UPDATE service_requests 
             SET status = ?, 
                 resolved_by = ?, 
                 resolved_at = NOW(), 
                 completed_at = ${approved ? 'NOW()' : 'NULL'},
                 resolution_notes = ?,
                 updated_at = NOW() 
             WHERE id = ?`,
            [newStatus, userId, resolutionNotes, requestId]
        );
        
        // Create history entry for the status change
        await db.query(
            `INSERT INTO service_request_history (request_id, previous_status, new_status, changed_by, notes, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [requestId, request.status, newStatus, userId, resolutionNotes]
        );
        
        console.log(`📝 Service request ${requestId} status updated: ${request.status} → ${newStatus} by requester ${userId}`);
        
        // If approved, deduct parts from technician inventory
        if (approved) {
            try {
                // Get parts used in this service request with technician and part details
                const [partsUsed] = await db.query(
                    `SELECT spu.part_id, spu.quantity_used, spu.used_by as technician_id, 
                            pp.name, pp.brand, ti.quantity as current_quantity
                     FROM service_parts_used spu
                     JOIN printer_parts pp ON spu.part_id = pp.id
                     JOIN technician_inventory ti ON ti.technician_id = spu.used_by AND ti.part_id = spu.part_id
                     WHERE spu.service_request_id = ?`,
                    [requestId]
                );
                
                if (partsUsed && partsUsed.length > 0) {
                    console.log(`📦 Deducting ${partsUsed.length} parts from technician inventory for service request ${requestId}`);
                    
                    for (const part of partsUsed) {
                        const newQuantity = Math.max(0, part.current_quantity - part.quantity_used);
                        
                        await db.query(
                            'UPDATE technician_inventory SET quantity = ?, last_updated = NOW() WHERE technician_id = ? AND part_id = ?',
                            [newQuantity, part.technician_id, part.part_id]
                        );
                        
                        console.log(`✅ Deducted ${part.quantity_used} of "${part.name}" (${part.brand || 'Generic'}) from technician ${part.technician_id} inventory. Old: ${part.current_quantity}, New: ${newQuantity}`);
                    }
                } else {
                    console.log(`ℹ️ No parts were used in service request ${requestId}`);
                }
            } catch (inventoryError) {
                console.error('❌ Error deducting parts from inventory:', inventoryError);
                // Don't fail the approval if inventory deduction fails
            }
        }
        
        // Send notification to technician
        if (request.assigned_technician_id) {
            const [requesterInfo] = await db.query(
                'SELECT first_name, last_name FROM users WHERE id = ?',
                [userId]
            );
            
            if (requesterInfo && requesterInfo.length > 0) {
                const notifTitle = approved ? 'Service Request Approved' : 'Service Request Rejected';
                const notifMessage = approved 
                    ? `${requesterInfo[0].first_name} ${requesterInfo[0].last_name} approved your completed work on ${request.request_number}`
                    : `${requesterInfo[0].first_name} ${requesterInfo[0].last_name} rejected your work on ${request.request_number}. ${feedback || 'Please review and revise.'}`;
                
                await createNotification({
                    title: notifTitle,
                    message: notifMessage,
                    type: approved ? 'success' : 'warning',
                    user_id: request.assigned_technician_id,
                    sender_id: userId,
                    reference_type: 'service_request',
                    reference_id: requestId,
                    priority: 'high'
                });
            }
        }
        
        res.json({ 
            message: approved ? 'Service request approved' : 'Service request rejected',
            status: newStatus
        });
    } catch (error) {
        console.error('Error approving service request:', error);
        res.status(500).json({ error: 'Failed to process approval' });
    }
});

// Get current user profile (with approval status)
app.get('/api/user/profile', auth, async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [users] = await db.query(
            `SELECT id, first_name, last_name, email, role, approval_status, 
                    is_email_verified, status, created_at 
             FROM users 
             WHERE id = ? LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        
        // Get institution if user has one
        const [institutions] = await db.query(
            'SELECT institution_id, name, type, address FROM institutions WHERE user_id = ? LIMIT 1',
            [userId]
        );
        
        if (institutions.length > 0) {
            user.institution = institutions[0];
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Institution Management API endpoints

// Get institutions for registration (public endpoint) - MUST come before /:id route
app.get('/api/institutions/public', async (req, res) => {
    try {
        // Only return institutions that are not already assigned to a user (available for registration)
        const [rows] = await db.query(
            'SELECT institution_id, name, type, address FROM institutions WHERE user_id IS NULL AND status = "active" ORDER BY name ASC'
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
            'SELECT institution_id, name, type, address, status, deactivated_at, created_at FROM institutions ORDER BY created_at DESC'
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
            'SELECT institution_id, name, type, address, status, deactivated_at, created_at FROM institutions WHERE institution_id = ?',
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
app.post('/api/institutions', authenticateAdmin, async (req, res) => {
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
        
        // Generate institution_id
        console.log('Querying for max institution_id...');
        const [maxIdRows] = await db.query(
            'SELECT MAX(CAST(SUBSTRING(institution_id, 6) AS UNSIGNED)) as max_num FROM institutions WHERE institution_id LIKE "INST-%"'
        );
        
        console.log('Max ID query result:', maxIdRows);
        
        // Handle case where there are no existing institutions or max_num is null
        let nextNum = 1;
        if (maxIdRows && maxIdRows.length > 0 && maxIdRows[0].max_num !== null) {
            nextNum = maxIdRows[0].max_num + 1;
        }
        
        const institution_id = `INST-${String(nextNum).padStart(3, '0')}`;
        console.log('Generated institution_id:', institution_id);
        
        console.log('About to execute INSERT query...');
        
        // Insert the new institution with generated institution_id
        const [result] = await db.query(
            'INSERT INTO institutions (institution_id, name, type, address) VALUES (?, ?, ?, ?)',
            [institution_id, name, type, address]
        );
        
        console.log('Institution created successfully with ID:', institution_id);
        
        res.status(201).json({ 
            message: 'Institution created successfully',
            institution_id: institution_id
        });
    } catch (error) {
        console.error('========= ERROR CREATING INSTITUTION =========');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('==============================================');
        res.status(500).json({ error: 'Failed to create institution' });
    }
});

// Update an institution
app.put('/api/institutions/:id', authenticateAdmin, async (req, res) => {
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
app.delete('/api/institutions/:id', authenticateAdmin, async (req, res) => {
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

// Toggle institution status (activate/deactivate)
app.patch('/api/institutions/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const institution_id = req.params.id;
        const { status } = req.body;
        
        // Validate status
        if (!['active', 'deactivated'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be "active" or "deactivated"' });
        }
        
        // Check if institution exists
        const [rows] = await db.query(
            'SELECT institution_id, name FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        const institutionName = rows[0].name;
        
        // Update institution status
        if (status === 'deactivated') {
            await db.query(
                'UPDATE institutions SET status = ?, deactivated_at = NOW() WHERE institution_id = ?',
                [status, institution_id]
            );
            
            // CASCADE: Deactivate the coordinator who owns this institution
            // institutions.user_id points to the coordinator
            const [coordinatorUpdate] = await db.query(
                `UPDATE users u
                 JOIN institutions i ON i.user_id = u.id
                 SET u.status = 'inactive', u.token_version = COALESCE(u.token_version, 0) + 1, u.updated_at = NOW()
                 WHERE i.institution_id = ? AND u.role = 'coordinator'`,
                [institution_id]
            );
            
            // CASCADE: Deactivate all requesters assigned to this institution
            // Requesters are linked via user_printer_assignments.institution_id
            const [requesterUpdate] = await db.query(
                `UPDATE users u
                 JOIN user_printer_assignments upa ON upa.user_id = u.id
                 SET u.status = 'inactive', u.token_version = COALESCE(u.token_version, 0) + 1, u.updated_at = NOW()
                 WHERE upa.institution_id = ? AND u.role = 'requester'`,
                [institution_id]
            );
            
            console.log(`Institution ${institution_id} deactivated:`);
            console.log(`  - Deactivated ${coordinatorUpdate.affectedRows} coordinator(s)`);
            console.log(`  - Deactivated ${requesterUpdate.affectedRows} requester(s)`);
            console.log(`  - All sessions invalidated (token_version incremented)`);
            
            // Log audit action
            await logAuditAction(
                req.user.id,
                req.user.role,
                `Deactivated institution: ${institutionName} (${institution_id}) - Cascaded to ${coordinatorUpdate.affectedRows} coordinator(s) and ${requesterUpdate.affectedRows} requester(s)`,
                'deactivate',
                'institution',
                institution_id,
                JSON.stringify({
                    institution_id,
                    institution_name: institutionName,
                    coordinators_deactivated: coordinatorUpdate.affectedRows,
                    requesters_deactivated: requesterUpdate.affectedRows
                }),
                req
            );
        } else {
            await db.query(
                'UPDATE institutions SET status = ?, deactivated_at = NULL WHERE institution_id = ?',
                [status, institution_id]
            );
            
            // CASCADE: Reactivate the coordinator who owns this institution
            const [coordinatorUpdate] = await db.query(
                `UPDATE users u
                 JOIN institutions i ON i.user_id = u.id
                 SET u.status = 'active', u.updated_at = NOW()
                 WHERE i.institution_id = ? AND u.role = 'coordinator'`,
                [institution_id]
            );
            
            // CASCADE: Reactivate all requesters assigned to this institution
            const [requesterUpdate] = await db.query(
                `UPDATE users u
                 JOIN user_printer_assignments upa ON upa.user_id = u.id
                 SET u.status = 'active', u.updated_at = NOW()
                 WHERE upa.institution_id = ? AND u.role = 'requester'`,
                [institution_id]
            );
            
            console.log(`Institution ${institution_id} activated:`);
            console.log(`  - Activated ${coordinatorUpdate.affectedRows} coordinator(s)`);
            console.log(`  - Activated ${requesterUpdate.affectedRows} requester(s)`);
            
            // Log audit action
            await logAuditAction(
                req.user.id,
                req.user.role,
                `Activated institution: ${institutionName} (${institution_id}) - Cascaded to ${coordinatorUpdate.affectedRows} coordinator(s) and ${requesterUpdate.affectedRows} requester(s)`,
                'activate',
                'institution',
                institution_id,
                JSON.stringify({
                    institution_id,
                    institution_name: institutionName,
                    coordinators_activated: coordinatorUpdate.affectedRows,
                    requesters_activated: requesterUpdate.affectedRows
                }),
                req
            );
        }
        
        res.json({ 
            message: `Institution ${status === 'active' ? 'activated' : 'deactivated'} successfully. All associated users have been ${status === 'active' ? 'activated' : 'deactivated'}.`,
            status: status
        });
    } catch (error) {
        console.error('Error updating institution status:', error);
        res.status(500).json({ error: 'Failed to update institution status' });
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
            WHERE ta.institution_id = ?
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
app.post('/api/technician-assignments', authenticateAdmin, async (req, res) => {
    try {
        const { technician_id, institution_id, assigned_by } = req.body;
        
        console.log(`[INSTITUTION ASSIGNMENT] POST request received - Technician: ${technician_id}, Institution: ${institution_id}, Assigned by: ${assigned_by}`);
        
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
        
        // Verify assigner is admin or operations officer
        const [adminCheck] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role IN ("admin", "operations_officer")',
            [assigned_by]
        );
        
        if (adminCheck.length === 0) {
            return res.status(403).json({ error: 'Only admins and operations officers can assign technicians' });
        }
        
        // Check if this specific technician is already assigned to this institution
        const [existingAssignment] = await db.query(
            'SELECT id FROM technician_assignments WHERE technician_id = ? AND institution_id = ? AND is_active = TRUE',
            [technician_id, institution_id]
        );
        
        if (existingAssignment.length > 0) {
            return res.status(409).json({ 
                error: 'This technician is already assigned to this institution',
                assignment_id: existingAssignment[0].id 
            });
        }
        
        // Create new assignment (multiple technicians can be assigned to the same institution)
        const [result] = await db.query(
            `INSERT INTO technician_assignments (
                technician_id, institution_id, assigned_by, is_active
            ) VALUES (?, ?, ?, TRUE)`,
            [technician_id, institution_id, assigned_by]
        );
        
        // Get institution name for notification
        console.log(`[INSTITUTION ASSIGNMENT] Getting institution name for ${institution_id}`);
        const [institutionRows] = await db.query(
            'SELECT name FROM institutions WHERE institution_id = ?',
            [institution_id]
        );
        const institutionName = institutionRows.length > 0 ? institutionRows[0].name : institution_id;
        console.log(`[INSTITUTION ASSIGNMENT] Institution name: ${institutionName}`);
        
        // Create notification for the technician using the helper function
        console.log(`[INSTITUTION ASSIGNMENT] Creating notification for technician ${technician_id}`);
        try {
            await createNotification({
                title: 'New Institution Assigned',
                message: `You have been assigned to ${institutionName}`,
                type: 'institution_assigned',
                user_id: technician_id,
                sender_id: assigned_by,
                reference_type: 'institution',
                reference_id: institution_id,
                priority: 'medium'
            });
            console.log(`[INSTITUTION ASSIGNMENT] ✓ Notification created successfully! Technician: ${technician_id}, Institution: ${institutionName}`);
        } catch (notifError) {
            console.error('[INSTITUTION ASSIGNMENT] ✗ Failed to create notification:', notifError);
            // Don't fail the assignment if notification fails
        }
        
        res.status(201).json({ 
            message: 'Technician assigned successfully',
            assignment_id: result.insertId 
        });
        
    } catch (error) {
        console.error('Error creating technician assignment:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        // Provide more specific error messages
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Institution already has an active technician assignment' });
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({ error: 'Invalid reference - check technician, institution, or admin ID' });
        } else {
            res.status(500).json({ 
                error: 'Failed to assign technician',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// Remove technician assignment
app.delete('/api/technician-assignments/:assignmentId', authenticateAdmin, async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const removedBy = req.user.id; // Admin who is removing the assignment
        
        console.log('[INSTITUTION UNASSIGNMENT] DELETE request received - Assignment ID:', assignmentId, 'Removed by:', removedBy);
        
        // Check if assignment exists and get details
        const [existing] = await db.query(
            'SELECT id, technician_id, institution_id FROM technician_assignments WHERE id = ?',
            [assignmentId]
        );
        
        console.log('[INSTITUTION UNASSIGNMENT] Assignment lookup result:', existing);
        
        if (existing.length === 0) {
            console.log('[INSTITUTION UNASSIGNMENT] Assignment not found');
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const assignment = existing[0];
        
        // Get institution name for notification
        const [institutionRows] = await db.query(
            'SELECT name FROM institutions WHERE institution_id = ?',
            [assignment.institution_id]
        );
        const institutionName = institutionRows.length > 0 ? institutionRows[0].name : assignment.institution_id;
        
        // Delete the assignment from the database
        const [result] = await db.query(
            'DELETE FROM technician_assignments WHERE id = ?',
            [assignmentId]
        );
        
        console.log('[INSTITUTION UNASSIGNMENT] Delete result:', result);
        console.log(`[INSTITUTION UNASSIGNMENT] Assignment ${assignmentId} permanently deleted from database`);
        
        // Create notification for the technician about being unassigned
        try {
            await createNotification({
                title: 'Institution Assignment Removed',
                message: `You have been unassigned from ${institutionName}`,
                type: 'institution_unassigned',
                user_id: assignment.technician_id,
                sender_id: removedBy,
                reference_type: 'institution',
                reference_id: assignment.institution_id,
                priority: 'medium'
            });
            console.log(`[INSTITUTION UNASSIGNMENT] ✓ Notification created for technician ${assignment.technician_id}`);
        } catch (notifError) {
            console.error('[INSTITUTION UNASSIGNMENT] ✗ Failed to create notification:', notifError);
            // Don't fail the unassignment if notification fails
        }
        
        res.json({ message: 'Technician assignment removed successfully' });
        
    } catch (error) {
        console.error('Error removing technician assignment:', error);
        res.status(500).json({ error: 'Failed to remove assignment' });
    }
});

// TEST endpoint to verify notification creation works
app.post('/api/test-notification', authenticateAdmin, async (req, res) => {
    try {
        console.log('[TEST NOTIFICATION] Attempting to create test notification...');
        const notificationId = await createNotification({
            title: 'Test Notification',
            message: 'This is a test notification for institution assignment',
            type: 'institution_assigned',
            user_id: 57, // Tek Nishian
            sender_id: req.user.id,
            reference_type: 'institution',
            reference_id: 'INST-017',
            priority: 'medium'
        });
        console.log('[TEST NOTIFICATION] ✓ Notification created successfully! ID:', notificationId);
        res.json({ success: true, notificationId, message: 'Test notification created' });
    } catch (error) {
        console.error('[TEST NOTIFICATION] ✗ Failed:', error);
        res.status(500).json({ error: error.message });
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
                sr.location,
                sr.created_at,
                sr.updated_at,
                sr.inventory_item_id,
                i.name as client_name,
                i.type as institution_type,
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.email as requester_email,
                requester.role as requester_role,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email,
                ii.name as printer_name,
                ii.brand as brand,
                ii.model as model,
                ii.serial_number as serial_number,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details,
                    '' as client_contact,
                '' as department,
                sr.updated_at as last_updated
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
            LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
            LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
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
                sr.started_at,
                sr.completed_at,
                sr.resolved_at,
                sr.resolution_notes,
                ii.name as equipment_name,
                ii.brand,
                ii.model,
                ii.serial_number,
                CONCAT(ii.name, ' (', ii.brand, ' ', ii.model, ' SN:', ii.serial_number, ')') as printer_full_details
            FROM service_requests sr
            LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            WHERE sr.institution_id = ?
            ORDER BY sr.created_at DESC
        `, [institutionId]);
        console.log(`[DEBUG] Found ${rows.length} service requests for institutionId:`, institutionId);
        console.log('[DEBUG] First row data:', rows[0]);
        console.log('[DEBUG] started_at field value:', rows[0]?.started_at);
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
                requester.first_name as requester_first_name,
                requester.last_name as requester_last_name,
                requester.email as requester_email,
                requester.role as requester_role,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                tech.email as technician_email
            FROM service_requests sr
            JOIN institutions i ON sr.institution_id = i.institution_id
            LEFT JOIN users requester ON sr.requested_by_user_id = requester.id
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

// Walk-in Service Request Endpoints (Admin/Operations Officer)
// Create walk-in service request
app.post('/api/walk-in-service-requests', authenticateAdmin, async (req, res) => {
    try {
        const { walk_in_customer_name, printer_brand, priority, issue, location } = req.body;
        const created_by = req.user.id;
        
        // Validation
        if (!walk_in_customer_name || !printer_brand || !issue) {
            return res.status(400).json({ 
                error: 'Customer name, printer brand, and issue description are required' 
            });
        }
        
        // Generate request number
        const [countResult] = await db.query('SELECT COUNT(*) as count FROM service_requests');
        const requestNumber = `SR-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;
        
        // Create service request
        const [result] = await db.query(
            `INSERT INTO service_requests (
                request_number,
                walk_in_customer_name,
                printer_brand,
                is_walk_in,
                priority,
                description,
                location,
                status,
                requested_by_user_id,
                institution_id,
                created_at
            ) VALUES (?, ?, ?, TRUE, ?, ?, ?, 'pending', ?, NULL, NOW())`,
            [requestNumber, walk_in_customer_name, printer_brand, priority || 'medium', issue, location || '', created_by]
        );
        
        // Get available technicians to notify
        const [technicians] = await db.query(
            `SELECT id FROM users WHERE role = 'technician' AND status = 'active' AND approval_status = 'approved'`
        );
        
        // Create notification for all technicians
        for (const tech of technicians) {
            try {
                await createNotification({
                    title: 'New Walk-In Service Request',
                    message: `Walk-in customer "${walk_in_customer_name}" needs service for ${printer_brand} printer. Issue: ${issue.substring(0, 100)}...`,
                    type: 'service_request',
                    user_id: tech.id,
                    sender_id: created_by,
                    reference_type: 'service_request',
                    reference_id: result.insertId,
                    priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'medium'
                });
            } catch (notifError) {
                console.error('Failed to create notification for technician:', tech.id, notifError);
            }
        }
        
        res.status(201).json({
            message: 'Walk-in service request created successfully',
            id: result.insertId,
            request_number: requestNumber
        });
        
    } catch (error) {
        console.error('Error creating walk-in service request:', error);
        res.status(500).json({ error: 'Failed to create walk-in service request' });
    }
});

// Get walk-in service requests
app.get('/api/walk-in-service-requests', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = `
            SELECT 
                sr.*,
                creator.first_name as created_by_first_name,
                creator.last_name as created_by_last_name,
                tech.first_name as technician_first_name,
                tech.last_name as technician_last_name,
                sa.status as approval_status,
                sa.coordinator_id as approved_by,
                sa.reviewed_at as approved_at,
                sa.technician_notes,
                sa.coordinator_notes,
                approver.first_name as approved_by_first_name,
                approver.last_name as approved_by_last_name
            FROM service_requests sr
            LEFT JOIN users creator ON sr.requested_by_user_id = creator.id
            LEFT JOIN users tech ON sr.assigned_technician_id = tech.id
            LEFT JOIN service_approvals sa ON sr.id = sa.service_request_id
            LEFT JOIN users approver ON sa.coordinator_id = approver.id
            WHERE sr.is_walk_in = TRUE
        `;
        
        const params = [];
        if (status) {
            query += ' AND sr.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY sr.created_at DESC';
        
        const [rows] = await db.query(query, params);
        res.json(rows);
        
    } catch (error) {
        console.error('Error fetching walk-in service requests:', error);
        res.status(500).json({ error: 'Failed to fetch walk-in service requests' });
    }
});

// Technician completes walk-in service request with parts used
app.post('/api/service-requests/:id/complete', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { parts, resolution_notes } = req.body; // Changed from parts_used to parts (array)
        const technician_id = req.user.id;
        
        // Verify user is technician
        if (req.user.role !== 'technician') {
            return res.status(403).json({ error: 'Only technicians can complete service requests' });
        }
        
        // Get the service request
        const [requests] = await db.query(
            'SELECT * FROM service_requests WHERE id = ?',
            [id]
        );
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        const request = requests[0];
        
        // Update service request to pending_approval status
        await db.query(
            `UPDATE service_requests 
             SET status = 'pending_approval',
                 completed_at = NOW(),
                 resolution_notes = ?,
                 assigned_technician_id = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [resolution_notes, technician_id, id]
        );
        
        // Delete existing parts if resubmitting (to prevent duplicates)
        await db.query(
            'DELETE FROM service_parts_used WHERE service_request_id = ?',
            [id]
        );
        
        // Save parts used to service_parts_used table
        if (parts && Array.isArray(parts) && parts.length > 0) {
            for (const part of parts) {
                await db.query(
                    `INSERT INTO service_parts_used (service_request_id, part_name, quantity, part_brand, notes)
                     VALUES (?, ?, ?, ?, ?)`,
                    [id, part.name, part.quantity || 1, part.brand || null, part.notes || null]
                );
            }
        }
        
        // Create service approval record (only if one doesn't exist)
        const [existingApproval] = await db.query(
            'SELECT id FROM service_approvals WHERE service_request_id = ?',
            [id]
        );
        
        if (existingApproval.length === 0) {
            await db.query(
                `INSERT INTO service_approvals (service_request_id, status, technician_notes, submitted_at)
                 VALUES (?, 'pending_approval', ?, NOW())`,
                [id, resolution_notes]
            );
        } else {
            // Update existing record back to pending_approval if it was rejected
            await db.query(
                `UPDATE service_approvals 
                 SET status = 'pending_approval', 
                     technician_notes = ?,
                     submitted_at = NOW(),
                     coordinator_id = NULL,
                     coordinator_notes = NULL,
                     reviewed_at = NULL
                 WHERE service_request_id = ?`,
                [resolution_notes, id]
            );
        }
        
        // If it's a walk-in request, notify admins and operations officers for approval
        if (request.is_walk_in) {
            const [admins] = await db.query(
                `SELECT id FROM users WHERE role IN ('admin', 'operations_officer') AND status = 'active'`
            );
            
            const customerName = request.walk_in_customer_name || 'Unknown Customer';
            const partsText = parts && parts.length > 0 
                ? parts.map(p => `${p.name} (x${p.quantity || 1})`).join(', ')
                : 'None';
            
            for (const admin of admins) {
                try {
                    await createNotification({
                        title: 'Service Request Completed - Requires Approval',
                        message: `Technician ${req.user.first_name} ${req.user.last_name} completed service for walk-in customer "${customerName}". Parts used: ${partsText}. Please review and approve.`,
                        type: 'service_request',
                        user_id: admin.id,
                        sender_id: technician_id,
                        reference_type: 'service_request',
                        reference_id: id,
                        priority: 'high'
                    });
                } catch (notifError) {
                    console.error('Failed to create notification:', notifError);
                }
            }
        }
        
        res.json({
            message: 'Service request completed successfully and submitted for approval',
            requires_approval: request.is_walk_in,
            status: 'pending_approval'
        });
        
    } catch (error) {
        console.error('Error completing service request:', error);
        res.status(500).json({ error: 'Failed to complete service request' });
    }
});

// Admin/Operations Officer approves completed service request
app.post('/api/service-requests/:id/approve-completion', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, notes } = req.body;
        const approver_id = req.user.id;
        
        // Get the service request with requester info
        const [requests] = await db.query(
            `SELECT sr.*, 
                    u.first_name as requester_first_name,
                    u.last_name as requester_last_name,
                    ii.name as printer_name
             FROM service_requests sr
             LEFT JOIN users u ON sr.requested_by_user_id = u.id
             LEFT JOIN inventory_items ii ON sr.inventory_item_id = ii.id
             WHERE sr.id = ?`,
            [id]
        );
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Service request not found' });
        }
        
        const request = requests[0];
        
        console.log('[APPROVAL DEBUG] Service request details:', {
            id: request.id,
            request_number: request.request_number,
            status: request.status,
            assigned_technician_id: request.assigned_technician_id,
            resolved_by: request.resolved_by,
            requester_first_name: request.requester_first_name,
            requester_last_name: request.requester_last_name,
            printer_name: request.printer_name,
            is_walk_in: request.is_walk_in,
            walk_in_customer_name: request.walk_in_customer_name
        });
        
        if (request.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Service request must be in pending_approval status' });
        }
        
        // Update service_approvals table
        const approvalStatus = approved ? 'approved' : 'revision_requested';
        
        if (approved) {
            // Only set coordinator_id on actual approval
            await db.query(
                `UPDATE service_approvals 
                 SET status = ?,
                     coordinator_id = ?,
                     coordinator_notes = ?,
                     reviewed_at = NOW()
                 WHERE service_request_id = ? AND status = 'pending_approval'`,
                [approvalStatus, approver_id, notes || null, id]
            );
        } else {
            // On rejection, don't set coordinator_id to avoid showing "approved by"
            await db.query(
                `UPDATE service_approvals 
                 SET status = ?,
                     coordinator_notes = ?,
                     reviewed_at = NOW()
                 WHERE service_request_id = ? AND status = 'pending_approval'`,
                [approvalStatus, notes || null, id]
            );
        }
        
        // Update service request status
        const newStatus = approved ? 'completed' : 'in_progress';
        await db.query(
            `UPDATE service_requests 
             SET status = ?,
                 resolved_at = ${approved ? 'NOW()' : 'NULL'},
                 updated_at = NOW()
             WHERE id = ?`,
            [newStatus, id]
        );
        
        // If approved, deduct parts from technician inventory
        const technicianId = request.assigned_technician_id || request.resolved_by;
        
        if (approved && technicianId) {
            try {
                console.log(`[INVENTORY DEDUCTION] Starting deduction for technician ${technicianId}, service request ${id}`);
                
                // Get all parts used for this service request
                const [partsUsed] = await db.query(
                    `SELECT spu.*, pp.name as part_name, pp.brand as part_brand
                     FROM service_parts_used spu
                     JOIN printer_parts pp ON spu.part_id = pp.id
                     WHERE spu.service_request_id = ?`,
                    [id]
                );
                
                console.log(`[INVENTORY DEDUCTION] Found ${partsUsed.length} parts to deduct for service request ${id}`, partsUsed);
                
                // Deduct each part from technician inventory
                for (const part of partsUsed) {
                    try {
                        // Check current inventory
                        const [inventory] = await db.query(
                            `SELECT quantity FROM technician_inventory 
                             WHERE technician_id = ? AND part_id = ?`,
                            [technicianId, part.part_id]
                        );
                        
                        console.log(`[INVENTORY DEDUCTION] Current inventory for part ${part.part_id}:`, inventory);
                        
                        if (inventory.length > 0) {
                            const currentQty = inventory[0].quantity;
                            const newQty = currentQty - part.quantity_used;
                            
                            if (newQty >= 0) {
                                await db.query(
                                    `UPDATE technician_inventory 
                                     SET quantity = ?, last_updated = NOW()
                                     WHERE technician_id = ? AND part_id = ?`,
                                    [newQty, technicianId, part.part_id]
                                );
                                console.log(`[INVENTORY DEDUCTION] ✅ Deducted ${part.quantity_used}x ${part.part_name} from technician ${technicianId}. Old: ${currentQty}, New: ${newQty}`);
                            } else {
                                console.warn(`[INVENTORY WARNING] ⚠️ Cannot deduct ${part.quantity_used}x ${part.part_name} - insufficient inventory (current: ${currentQty})`);
                            }
                        } else {
                            console.warn(`[INVENTORY WARNING] ⚠️ Part ${part.part_name} (ID: ${part.part_id}) not found in technician ${technicianId}'s inventory`);
                        }
                    } catch (partError) {
                        console.error(`[INVENTORY ERROR] ❌ Failed to deduct part ${part.part_name}:`, partError);
                        // Continue with other parts even if one fails
                    }
                }
            } catch (inventoryError) {
                console.error('[INVENTORY ERROR] ❌ Failed to process inventory deduction:', inventoryError);
                // Don't fail the approval if inventory deduction fails
            }
        } else {
            console.log(`[INVENTORY DEDUCTION] Skipping deduction - approved: ${approved}, technicianId: ${technicianId}`);
        }
        
        // Notify technician
        console.log('[APPROVAL DEBUG] Checking if should notify technician...', {
            has_assigned_technician: !!request.assigned_technician_id,
            assigned_technician_id: request.assigned_technician_id
        });
        
        if (request.assigned_technician_id) {
            try {
                // Determine customer name
                const customerName = request.is_walk_in 
                    ? request.walk_in_customer_name 
                    : (request.requester_first_name ? `${request.requester_first_name} ${request.requester_last_name}` : 'Unknown');
                
                const printerInfo = request.printer_name || 'the printer';
                
                console.log('[APPROVAL DEBUG] Creating notification with data:', {
                    title: approved ? 'Service Completion Approved' : 'Service Needs Revision',
                    user_id: request.assigned_technician_id,
                    sender_id: approver_id,
                    customerName,
                    printerInfo
                });
                
                await createNotification({
                    title: approved ? 'Service Completion Approved' : 'Service Needs Revision',
                    message: approved 
                        ? `Your completed service for ${customerName}'s ${printerInfo} (Request #${request.request_number}) has been approved by the coordinator.`
                        : `Your service for ${customerName}'s ${printerInfo} (Request #${request.request_number}) needs revision. ${notes ? `Notes: ${notes}` : 'Please review and resubmit.'}`,
                    type: approved ? 'service_approved' : 'service_revision_requested',
                    user_id: request.assigned_technician_id,
                    sender_id: approver_id,
                    reference_type: 'service_request',
                    reference_id: id,
                    priority: 'high'
                });
                
                console.log(`[NOTIFICATION SUCCESS] Sent ${approved ? 'approval' : 'revision'} notification to technician ${request.assigned_technician_id} for service request ${id}`);
            } catch (notifError) {
                console.error('[NOTIFICATION ERROR] Failed to create notification:', notifError);
                console.error('[NOTIFICATION ERROR] Stack:', notifError.stack);
            }
        } else {
            console.warn(`[NOTIFICATION SKIP] No technician assigned to service request ${id}, skipping notification`);
        }
        
        res.json({
            message: approved ? 'Service request approved successfully' : 'Service request sent back for revision'
        });
        
    } catch (error) {
        console.error('Error approving service request:', error);
        res.status(500).json({ error: 'Failed to approve service request' });
    }
});

// Get parts used for a service request
app.get('/api/service-parts-used/:requestId', auth, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const [parts] = await db.query(
            `SELECT 
                spu.id,
                spu.service_request_id,
                spu.quantity_used as quantity,
                spu.notes,
                spu.used_by,
                spu.used_at,
                pp.name as part_name,
                pp.brand as part_brand,
                pp.category,
                u.first_name as used_by_first_name,
                u.last_name as used_by_last_name
             FROM service_parts_used spu
             LEFT JOIN printer_parts pp ON spu.part_id = pp.id
             LEFT JOIN users u ON spu.used_by = u.id
             WHERE spu.service_request_id = ? 
             ORDER BY spu.used_at ASC`,
            [requestId]
        );
        
        res.json(parts);
    } catch (error) {
        console.error('Error fetching parts used:', error);
        res.status(500).json({ error: 'Failed to fetch parts used' });
    }
});

// Service requests are handled in the dedicated router at `server/routes/service-requests.js`
// (Duplicate inline POST handler removed to avoid double-creation of requests.)

// Inventory Items API
// List inventory items (optionally only available)
// Debug endpoint to check assignments
app.get('/api/debug/assignments', async (req, res) => {
    try {
        console.log('=== DEBUG: Checking assignments ===');
        
        // Check client_printer_assignments table
        const [assignments] = await db.query('SELECT * FROM client_printer_assignments LIMIT 10');
        console.log('Assignments found:', assignments.length);
        console.log('Sample assignments:', assignments);
        
        // Check institutions table
        const [institutions] = await db.query('SELECT * FROM institutions LIMIT 10');
        console.log('Institutions found:', institutions.length);
        console.log('Sample institutions:', institutions);
        
        // Check assigned inventory items
        const [assignedItems] = await db.query('SELECT * FROM inventory_items WHERE status = "assigned" LIMIT 10');
        console.log('Assigned items found:', assignedItems.length);
        console.log('Sample assigned items:', assignedItems);
        
        // Try the JOIN query manually
        const [joinResult] = await db.query(`
            SELECT 
                ii.id, ii.brand, ii.model, ii.serial_number, ii.status,
                cpa.location_note,
                i.name as institution_name,
                i.type as institution_type
            FROM inventory_items ii
            LEFT JOIN client_printer_assignments cpa ON ii.id = cpa.inventory_item_id
            LEFT JOIN institutions i ON cpa.institution_id = i.institution_id
            WHERE ii.status = 'assigned'
        `);
        console.log('JOIN result:', joinResult);
        
        res.json({
            assignments: assignments,
            institutions: institutions,
            assignedItems: assignedItems,
            joinResult: joinResult
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/inventory-items', async (req, res) => {
    try {
        const onlyAvailable = String(req.query.available || '').toLowerCase() === 'true';
        const includeAssignments = String(req.query.assignments || '').toLowerCase() === 'true';
        
        console.log('API call - onlyAvailable:', onlyAvailable, 'includeAssignments:', includeAssignments);
        
        let query, params = [];
        
        if (includeAssignments) {
            // Debug: First let's check if assignments exist
            const [assignmentCount] = await db.query('SELECT COUNT(*) as count FROM client_printer_assignments');
            console.log('Total assignments in database:', assignmentCount[0].count);
            
            const [assignmentSample] = await db.query('SELECT * FROM client_printer_assignments LIMIT 3');
            console.log('Sample assignments:', assignmentSample);
            
            // Include assignment information with institution details
            query = `
                SELECT 
                    ii.*,
                    cpa.location_note,
                    i.name as institution_name,
                    i.type as institution_type
                FROM inventory_items ii
                LEFT JOIN client_printer_assignments cpa ON ii.id = cpa.inventory_item_id
                LEFT JOIN institutions i ON cpa.institution_id = i.institution_id
                ${onlyAvailable ? 'WHERE ii.status = "available"' : ''}
                ORDER BY ii.created_at DESC
            `;
        } else {
            // Original query without assignments
            query = onlyAvailable ?
                'SELECT * FROM inventory_items WHERE status = "available" ORDER BY created_at DESC' :
                'SELECT * FROM inventory_items ORDER BY created_at DESC';
        }
        
        console.log('Executing query:', query);
        const [rows] = await db.query(query, params);
        console.log('Query results:', rows.length, 'items found');
        
        // Log a sample of assigned items
        const assignedItems = rows.filter(item => item.status === 'assigned');
        if (assignedItems.length > 0) {
            console.log('Sample assigned item:', assignedItems[0]);
        }
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Get single inventory item by ID
app.get('/api/inventory-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT 
                ii.*,
                cpa.location_note,
                i.name as institution_name,
                i.type as institution_type
            FROM inventory_items ii
            LEFT JOIN client_printer_assignments cpa ON ii.id = cpa.inventory_item_id
            LEFT JOIN institutions i ON cpa.institution_id = i.institution_id
            WHERE ii.id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
});

// Create inventory item (printer)
app.post('/api/inventory-items', authenticateAdmin, async (req, res) => {
    try {
        const { name, brand, model, serial_number, location, quantity } = req.body;
        const composedName = (name && String(name).trim()) || [brand, model].filter(Boolean).join(' ').trim();
        if (!composedName) {
            return res.status(400).json({ error: 'Brand or Model is required' });
        }
        
        const itemQuantity = quantity && Number(quantity) > 0 ? Number(quantity) : 1;
        
        const [result] = await db.query(
            `INSERT INTO inventory_items (category, name, brand, model, serial_number, quantity, location, status)
             VALUES ('printer', ?, ?, ?, ?, ?, ?, 'available')`,
            [composedName, brand || null, model || null, serial_number || null, itemQuantity, location || null]
        );
        res.status(201).json({ message: 'Inventory item created', id: result.insertId });
    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
});

// Update inventory item
app.put('/api/inventory-items/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand, model, serial_number, location, status, quantity } = req.body;
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
                quantity = COALESCE(?, quantity),
                location = COALESCE(?, location),
                status = COALESCE(?, status)
             WHERE id = ?`,
            [nextName, brand, model, serial_number, quantity, location, status, id]
        );
        res.json({ message: 'Item updated' });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// Delete inventory item (only if not assigned)
app.delete('/api/inventory-items/:id', authenticateAdmin, async (req, res) => {
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

// Parts Requests API Routes
const partsRequestsRouter = require('./routes/parts-requests');
app.use('/api/parts-requests', partsRequestsRouter);

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

// Technician Authentication Routes
const technicianAuthRouter = require('./routes/technician-auth');
app.use('/api', technicianAuthRouter);

// Technician Inventory Routes
const technicianInventoryRouter = require('./routes/technician-inventory');
app.use('/api/technician', technicianInventoryRouter);

// Technician History Routes
const technicianHistoryRouter = require('./routes/technician-history');
app.use('/api/technician', technicianHistoryRouter);

// Notifications API Routes
const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);

// Coordinator service approvals routes
const coordinatorServiceApprovalsRouter = require('./routes/coordinator-service-approvals');
app.use('/api/coordinator/service-approvals', coordinatorServiceApprovalsRouter);

// Association Rule Mining Routes
const armRouter = require('./routes/arm');
app.use('/api/arm', armRouter);

// Voluntary Services Routes
const voluntaryServicesRouter = require('./routes/voluntary-services');
app.use('/api/voluntary-services', voluntaryServicesRouter);

// Admin Routes
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// ============================================
// AUDIT LOGS API ENDPOINTS
// ============================================

// Get audit logs (admin only)
app.get('/api/audit-logs', authenticateAdmin, async (req, res) => {
    try {
        const { 
            user_role, 
            action_type, 
            start_date, 
            end_date, 
            search,
            page = 1, 
            limit = 50 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let whereConditions = [];
        let queryParams = [];
        
        // Filter by user role
        if (user_role) {
            whereConditions.push('al.user_role = ?');
            queryParams.push(user_role);
        }
        
        // Filter by action type
        if (action_type) {
            whereConditions.push('al.action_type = ?');
            queryParams.push(action_type);
        }
        
        // Filter by date range
        if (start_date) {
            whereConditions.push('al.created_at >= ?');
            queryParams.push(start_date);
        }
        
        if (end_date) {
            whereConditions.push('al.created_at <= ?');
            queryParams.push(end_date);
        }
        
        // Search in action or details
        if (search) {
            whereConditions.push('(al.action LIKE ? OR al.details LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM audit_logs al
            INNER JOIN users u ON al.user_id = u.id
            ${whereClause}
        `, queryParams);
        
        const total = countResult[0].total;
        
        // Get paginated logs
        const [logs] = await db.query(`
            SELECT 
                al.*,
                u.first_name,
                u.last_name,
                u.email
            FROM audit_logs al
            INNER JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);
        
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Get audit log statistics (admin only)
app.get('/api/audit-logs/stats', authenticateAdmin, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateFilter = '';
        let queryParams = [];
        
        if (start_date && end_date) {
            dateFilter = 'WHERE created_at BETWEEN ? AND ?';
            queryParams = [start_date, end_date];
        }
        
        // Get action counts by type
        const [actionStats] = await db.query(`
            SELECT 
                action_type,
                COUNT(*) as count
            FROM audit_logs
            ${dateFilter}
            GROUP BY action_type
            ORDER BY count DESC
        `, queryParams);
        
        // Get user role activity
        const [roleStats] = await db.query(`
            SELECT 
                user_role,
                COUNT(*) as count
            FROM audit_logs
            ${dateFilter}
            GROUP BY user_role
            ORDER BY count DESC
        `, queryParams);
        
        // Get most active users
        const [userStats] = await db.query(`
            SELECT 
                al.user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                COUNT(*) as action_count
            FROM audit_logs al
            INNER JOIN users u ON al.user_id = u.id
            ${dateFilter}
            GROUP BY al.user_id, u.first_name, u.last_name, u.email, u.role
            ORDER BY action_count DESC
            LIMIT 10
        `, queryParams);
        
        // Get recent activity (last 24 hours)
        const [recentActivity] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
                COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY hour
            ORDER BY hour ASC
        `);
        
        res.json({
            actionStats,
            roleStats,
            userStats,
            recentActivity
        });
        
    } catch (error) {
        console.error('Error fetching audit log statistics:', error);
        res.status(500).json({ error: 'Failed to fetch audit log statistics' });
    }
});

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
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    
    // Update notifications table schema
    try {
        console.log('Checking notifications table schema...');
        
        // Add user_id column if it doesn't exist
        try {
            await db.query('ALTER TABLE notifications ADD COLUMN user_id INT NULL AFTER id');
            console.log('Added user_id column to notifications');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.log('user_id column already exists or error:', e.message);
            }
        }
        
        // Add reference_type column if it doesn't exist
        try {
            await db.query('ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50) NULL AFTER message');
            console.log('Added reference_type column to notifications');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.log('reference_type column already exists or error:', e.message);
            }
        }
        
        // Add reference_id column if it doesn't exist
        try {
            await db.query('ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(50) NULL AFTER reference_type');
            console.log('Added reference_id column to notifications');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.log('reference_id column already exists or error:', e.message);
            }
        }
        
        // Add sender_id column if it doesn't exist
        try {
            await db.query('ALTER TABLE notifications ADD COLUMN sender_id INT NULL AFTER user_id');
            console.log('Added sender_id column to notifications');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.log('sender_id column already exists or error:', e.message);
            }
        }
        
        // Update type enum to include new types
        try {
            await db.query(`ALTER TABLE notifications MODIFY COLUMN type VARCHAR(100) NOT NULL`);
            console.log('Updated notifications type column to VARCHAR');
        } catch (e) {
            console.log('Type column update skipped or error:', e.message);
        }
        
        console.log('Notifications table schema updated');
    } catch (error) {
        console.error('Error updating notifications schema:', error);
    }
    
    // Fix database constraint on startup
    try {
        // Try to drop the constraint - ignore error if it doesn't exist
        try {
            await db.query('ALTER TABLE technician_assignments DROP INDEX unique_active_assignment');
            console.log('Dropped unique_active_assignment constraint');
        } catch (dropError) {
            console.log('Constraint unique_active_assignment does not exist or already dropped');
        }
        
        // Create indexes with error handling for existing indexes
        try {
            await db.query('CREATE INDEX idx_technician_institution ON technician_assignments (technician_id, institution_id)');
            console.log('Created idx_technician_institution index');
        } catch (indexError) {
            console.log('Index idx_technician_institution already exists');
        }
        
        try {
            await db.query('CREATE INDEX idx_institution_active ON technician_assignments (institution_id, is_active)');
            console.log('Created idx_institution_active index');
        } catch (indexError) {
            console.log('Index idx_institution_active already exists');
        }
        
        console.log('Database constraint fixed: Multiple technicians can now be assigned to institutions');
    } catch (error) {
        console.error('Error fixing database constraint:', error.message);
    }
});