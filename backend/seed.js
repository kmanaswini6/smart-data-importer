const pool = require('./db/connection');
const bcrypt = require('bcryptjs');

async function seedUser() {
    const username = process.env.SEED_USERNAME;
    const email = process.env.SEED_EMAIL;
    const plainPassword = process.env.SEED_PASSWORD;

    if (!username || !email || !plainPassword) {
        console.error(
            'Seeding skipped: set SEED_USERNAME, SEED_EMAIL, and SEED_PASSWORD in your local environment.'
        );
        process.exit(1);
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const query = `
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE password_hash = ?
        `;

        await pool.execute(query, [username, email, hashedPassword, hashedPassword]);
        console.log('Seed user created or updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('User seeding failed:', error.message);
        process.exit(1);
    }
}

seedUser();
