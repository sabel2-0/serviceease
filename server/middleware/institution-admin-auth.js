/**
 * institution_admin Authentication Middleware
 * Verifies that the authenticated user has institution_admin role
 */

const institution_adminAuth = (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Check if user has institution_admin role
    if (req.user.role !== 'institution_admin') {
        return res.status(403).json({ message: 'Access denied. Not authorized as institution_admin' });
    }

    // User is authenticated and has institution_admin role, proceed
    next();
};

module.exports = institution_adminAuth;


