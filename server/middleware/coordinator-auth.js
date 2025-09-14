/**
 * Coordinator Authentication Middleware
 * Verifies that the authenticated user has coordinator role
 */

const coordinatorAuth = (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Check if user has coordinator role
    if (req.user.role !== 'coordinator') {
        return res.status(403).json({ message: 'Access denied. Not authorized as coordinator' });
    }

    // User is authenticated and has coordinator role, proceed
    next();
};

module.exports = coordinatorAuth;