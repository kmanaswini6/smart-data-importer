const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const pool = require('../../db/connection');

if (getApps().length === 0) {
    try {
        const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log('Firebase Security Engine initialized successfully.');
    } catch (initError) {
        console.error('Critical Failure initializing Firebase Admin credentials:', initError.message);
    }
}

async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access rejected. Missing token signature authorization.' });
    }

    let decodedToken;
    try {
        const auth = getAuth();
        decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
        console.error('Firebase Token Verification Error:', error.message);
        return res.status(403).json({ error: 'Token transmission verification signature failed or expired.' });
    }

    try {
        const email = decodedToken.email;
        const name = decodedToken.name || 'Anonymous Operator';
        const defaultUsername = email ? email.split('@')[0] : 'operator';

        let [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        let localUserId;

        if (rows.length > 0) {
            localUserId = rows[0].id;
        } else {
            try {
                // Try inserting with username field if legacy table structure requires it
                const [insertResult] = await pool.execute(
                    'INSERT INTO users (email, name, username) VALUES (?, ?, ?)',
                    [email, name, defaultUsername]
                );
                localUserId = insertResult.insertId;
            } catch (legacyErr) {
                // Standard insert if username column was dropped/modified
                const [insertResult] = await pool.execute(
                    'INSERT INTO users (email, name) VALUES (?, ?)',
                    [email, name]
                );
                localUserId = insertResult.insertId;
            }
        }

        req.user = {
            id: localUserId,
            uid: decodedToken.uid,
            email: email,
            name: name
        };

        next();
    } catch (dbError) {
        console.error('Database User Lookup Exception:', dbError.message);
        return res.status(500).json({ error: 'Database session initialization error.', details: dbError.message });
    }
}

module.exports = verifyToken;