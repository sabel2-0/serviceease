/**
 * Authentication Middleware
 * Verifies JWT token and adds user information to request
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

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

// Helper to determine action type from HTTP method and path
function getActionType(method, path) {
    // Check for specific action keywords in path
    if (path.includes('/login')) return 'login';
    if (path.includes('/logout')) return 'logout';
    if (path.includes('/approve')) return 'approve';
    if (path.includes('/reject')) return 'reject';
    if (path.includes('/assign')) return 'assign';
    if (path.includes('/complete')) return 'complete';
    if (path.includes('/start')) return 'other'; // Starting work
    if (path.includes('/cancel')) return 'delete';
    
    // Map HTTP methods to action types
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
    
    // Service requests
    if (path.includes('/service-requests') || path.includes('/walk-in-service-requests')) {
        targetType = 'service_request';
        targetId = req.params.id || req.params.requestId || req.body.id || req.query.id;
    } 
    // Users and staff
    else if (path.includes('/users') || path.includes('/staff')) {
        targetType = 'user';
        targetId = req.params.id || req.params.userId || req.body.id;
    } 
    // Printers - check for assignment first
    else if (path.includes('/institutions') && path.includes('/printers') && req.method === 'POST') {
        targetType = 'printer_assignment';
        targetId = req.params.institutionId || req.body.institution_id;
    }
    else if (path.includes('/printers')) {
        targetType = 'printer';
        targetId = req.params.id || req.body.id || req.body.printer_id;
    } 
    // Inventory
    else if (path.includes('/inventory')) {
        targetType = 'inventory';
        targetId = req.params.id || req.body.id || req.body.item_id;
    } 
    // Parts
    else if (path.includes('/parts')) {
        targetType = 'parts';
        targetId = req.params.id || req.body.id;
    } 
    // Coordinators
    else if (path.includes('/coordinator')) {
        targetType = 'coordinator';
        targetId = req.params.id || req.body.id || req.body.coordinator_id;
    } 
    // Institutions/Clients
    else if (path.includes('/institutions') || path.includes('/clients')) {
        targetType = 'institution';
        targetId = req.params.institutionId || req.body.institution_id;
    }
    // Notifications
    else if (path.includes('/notifications')) {
        targetType = 'notification';
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

const auth = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Check if token is Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Authentication token format invalid' });
    }

    const token = parts[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'serviceease_dev_secret');
        
        // Add user data to request
        req.user = decoded;
        
        // Audit logging for tracked roles (admin, technician, operations_officer)
        // Log important actions: logins, data modifications (POST, PUT, PATCH, DELETE)
        if (['admin', 'technician', 'operations_officer'].includes(req.user.role)) {
            // Define which actions should be logged
            const shouldLog = 
                req.method === 'POST' ||   // Creating data
                req.method === 'PUT' ||    // Updating data
                req.method === 'PATCH' ||  // Partial updates
                req.method === 'DELETE' || // Deleting data
                req.path.includes('/login') || // User logins
                req.path.includes('/logout') || // User logouts
                req.path.includes('/approve') || // Approvals
                req.path.includes('/reject') || // Rejections
                req.path.includes('/complete') || // Completions
                req.path.includes('/start'); // Starting work
            
            if (shouldLog) {
                // Intercept response to log after successful completion
                const originalJson = res.json.bind(res);
                res.json = function(data) {
                    // Only log successful responses (200-299)
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const action = `${req.method} ${req.path}`;
                        const actionType = getActionType(req.method, req.path);
                        const { targetType, targetId } = extractTarget(req);
                        
                        // Create detailed description of the action
                        let actionDescription = action;
                        if (targetType) {
                            // Generate human-readable descriptions
                            if (targetType === 'printer_assignment') {
                                actionDescription = `Assigned printer to client ${targetId}`;
                            } else if (targetType === 'printer' && req.method === 'DELETE') {
                                actionDescription = `Unassigned printer from client`;
                            } else if (targetType === 'printer' && req.method === 'PUT') {
                                actionDescription = `Updated printer assignment details`;
                            } else if (targetType === 'inventory' && req.method === 'POST') {
                                actionDescription = `Added new inventory item`;
                            } else if (targetType === 'inventory' && req.method === 'PUT') {
                                actionDescription = `Updated inventory item${targetId ? ' #' + targetId : ''}`;
                            } else if (targetType === 'institution' && req.method === 'POST') {
                                actionDescription = `Created new institution`;
                            } else if (targetType === 'institution' && req.method === 'PUT') {
                                actionDescription = `Updated institution ${targetId}`;
                            } else if (targetType === 'user' && req.method === 'POST') {
                                actionDescription = `Created new user account`;
                            } else if (targetType === 'user' && req.method === 'PUT') {
                                actionDescription = `Updated user account${targetId ? ' #' + targetId : ''}`;
                            } else if (targetType === 'service_request') {
                                if (req.path.includes('/approve')) {
                                    actionDescription = `Approved service request ${targetId}`;
                                } else if (req.path.includes('/reject')) {
                                    actionDescription = `Rejected service request ${targetId}`;
                                } else if (req.path.includes('/complete')) {
                                    actionDescription = `Completed service request ${targetId}`;
                                } else if (req.method === 'POST') {
                                    actionDescription = `Created service request`;
                                } else if (req.method === 'PUT') {
                                    actionDescription = `Updated service request ${targetId}`;
                                }
                            } else {
                                // Fallback to original format
                                actionDescription = `${actionType.toUpperCase()}: ${targetType}${targetId ? ' #' + targetId : ''}`;
                            }
                        }
                        
                        const details = JSON.stringify({
                            method: req.method,
                            path: req.path,
                            params: req.params,
                            query: Object.keys(req.query).length > 0 ? req.query : undefined,
                            body: sanitizeBody(req.body),
                            description: actionDescription
                        });
                        
                        // Log asynchronously without blocking response
                        setImmediate(() => {
                            logAuditAction(req.user.id, req.user.role, actionDescription, actionType, targetType, targetId, details, req);
                        });
                    }
                    return originalJson(data);
                };
            }
        }
        
        // Continue with request
        next();
    } catch (error) {
        // Only log if it's not a common expiration error
        if (error.name !== 'TokenExpiredError') {
            console.error('[AUTH] Token verification failed:', error.message);
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired', 
                code: 'TOKEN_EXPIRED' 
            });
        }
        
        return res.status(401).json({ message: 'Invalid authentication token' });
    }
};

/**
 * Middleware to authenticate technician users
 * Only allows technicians to access protected routes
 */
const authenticateTechnician = async (req, res, next) => {
    auth(req, res, async () => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(403).json({ message: 'Access denied. Technicians only.' });
            }
            // Query the users table for the role
            const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0 || rows[0].role !== 'technician') {
                return res.status(403).json({ message: 'Access denied. Technicians only.' });
            }
            next();
        } catch (error) {
            console.error('Technician auth DB error:', error);
            return res.status(500).json({ message: 'Internal server error during technician authentication.' });
        }
    });
};

/**
 * Middleware to authenticate coordinator users
 * Only allows coordinators to access protected routes
 */
const authenticateCoordinator = (req, res, next) => {
    auth(req, res, () => {
        // After general auth, verify user is a coordinator
        if (req.user && req.user.role === 'coordinator') {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Coordinators only.' });
        }
    });
};

/**
 * Middleware to authenticate admin users
 * Only allows admins and operations officers to access protected routes
 */
const authenticateAdmin = (req, res, next) => {
    auth(req, res, () => {
        // After general auth, verify user is an admin or operations officer
        if (req.user && (req.user.role === 'admin' || req.user.role === 'operations_officer')) {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Admins and operations officers only.' });
        }
    });
};

module.exports = {
    auth,
    authenticateTechnician,
    authenticateCoordinator,
    authenticateAdmin
};