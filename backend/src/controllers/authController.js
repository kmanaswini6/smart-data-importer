const pool = require('../../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Registers a new system user profile, hashing their password safely.
 */
async function register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password parameters are required.' });
    }

    try {
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'A user identity matching those credentials already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        return res.status(201).json({ message: 'User identity generated successfully.', userId: result.insertId });
    } catch (error) {
        console.error('Registration processing failed:', error.message);
        return res.status(500).json({ error: 'Internal system user creation error.' });
    }
}

/**
 * Validates credentials and generates a signed access token.
 * No development or master-password bypass is permitted.
 */
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password credentials must be provided.' });
    }

    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');
        return res.status(500).json({ error: 'Authentication is not configured on the server.' });
    }

    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Authentication process failed:', error.message);
        return res.status(500).json({ error: 'Internal system validation runtime error.' });
    }
}

module.exports = {
    register,
    login
};
