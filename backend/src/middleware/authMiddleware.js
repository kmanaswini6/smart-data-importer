const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const pool = require('../../db/connection');

// Firebase Admin uses Application Default Credentials. Set
// GOOGLE_APPLICATION_CREDENTIALS to the path of a service-account JSON file
// stored locally; never commit that file to the repository.
if (getApps().length === 0) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            'GOOGLE_APPLICATION_CREDENTIALS is required. Configure a local Firebase service-account file path.'
        );
    }

    initializeApp({
        credential: applicationDefault()
    });
    console.log('Firebase Admin initialized with Application Default Credentials.');
}

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'A valid Bearer token is required.' });
    }

    let decodedToken;
    try {
        decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
        console.error('Firebase token verification failed:', error.message);
        return res.status(403).json({ error: 'The token is invalid or expired.' });
    }

    try {
        const email = decodedToken.email;
        if (!email) {
            return res.status(403).json({ error: 'The verified token must include an email address.' });
        }

        const name = decodedToken.name || 'User';
        const defaultUsername = email.split('@')[0];

        const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        let localUserId;

        if (rows.length > 0) {
            localUserId = rows[0].id;
        } else {
            // Support both the current schema and legacy schemas with a username column.
            try {
                const [insertResult] = await pool.execute(
                    'INSERT INTO users (email, name, username) VALUES (?, ?, ?)',
                    [email, name, defaultUsername]
                );
                localUserId = insertResult.insertId;
            } catch (insertError) {
                if (!/unknown column|doesn't exist/i.test(insertError.message)) {
                    throw insertError;
                }
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
            email,
            name
        };

        return next();
    } catch (dbError) {
        console.error('Database user lookup failed:', dbError.message);
        return res.status(500).json({ error: 'Unable to initialize the user session.' });
    }
}

module.exports = verifyToken;
