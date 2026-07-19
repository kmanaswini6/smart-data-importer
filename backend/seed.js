const pool = require('./db/connection');
const bcrypt = require('bcryptjs');

async function seedUser() {
    try {
        const username = 'operator1';
        const email = 'test@industrial.com';
        const plainPassword = 'password123';

        // Use the exact same bcrypt settings as your auth controller
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Insert or overwrite the test user profile safely
        const query = `
            INSERT INTO users (username, email, password_hash) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE password_hash = ?
        `;

        await pool.execute(query, [username, email, hashedPassword, hashedPassword]);

        console.log('\n==================================================');

        console.log('SUCCESS: Test user identity written to MySQL.');
        console.log(`EMAIL:    ${email}`);
        console.log(`PASSWORD: ${plainPassword}`);
        console.log('==================================================\n');

        process.exit(0);
    } catch (error) {
        console.error('System seeding failed:', error);
        process.exit(1);
    }
}

seedUser();