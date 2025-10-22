/**
 * Authentication Middleware
 * Verifies JWT token and adds user information to request
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

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
const db = require('../config/database');
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
 * Only allows admins to access protected routes
 */
const authenticateAdmin = (req, res, next) => {
    auth(req, res, () => {
        // After general auth, verify user is an admin
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
    });
};

module.exports = {
    auth,
    authenticateTechnician,
    authenticateCoordinator,
    authenticateAdmin
};