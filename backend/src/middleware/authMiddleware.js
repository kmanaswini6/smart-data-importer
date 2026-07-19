const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_industrial_key_2026';

/**
 * Intercepts incoming network requests to enforce token validity checks.
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    // Look for standard 'Bearer <token>' pattern
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access rejected. Missing token signature authorization.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Inject operational contextual footprint directly into the request object
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token transmission verification signature failed or expired.' });
    }
}

module.exports = verifyToken;