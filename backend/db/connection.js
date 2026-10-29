const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const requiredConfig = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingConfig = requiredConfig.filter((key) => !process.env[key]);

if (missingConfig.length > 0) {
    throw new Error(
        `Missing required database configuration: ${missingConfig.join(', ')}. Configure backend/.env or the container environment.`
    );
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    let connection;
    try {
        connection = await pool.getConnection();

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Backward-compatible patches for databases created by earlier versions.
        try {
            await connection.query('ALTER TABLE users ADD COLUMN name VARCHAR(255);');
        } catch (error) {
            if (!/duplicate column/i.test(error.message)) throw error;
        }

        try {
            await connection.query('ALTER TABLE users MODIFY COLUMN username VARCHAR(255) NULL DEFAULT NULL;');
        } catch (error) {
            // A missing legacy username column is expected for a fresh schema.
            if (!/unknown column|doesn't exist/i.test(error.message)) throw error;
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS imports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_rows INT DEFAULT 0,
                valid_rows INT DEFAULT 0,
                invalid_rows INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'uploaded',
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                import_id INT,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(255),
                age VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS import_errors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                import_id INT,
                \`row_number\` INT,
                reason TEXT,
                raw_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
            );
        `);

        console.log('Database tables (users, imports, customers, import_errors) verified and ready.');
    } catch (err) {
        console.error('Database initialization failed:', err.message);
    } finally {
        if (connection) connection.release();
    }
}

initDB();

module.exports = pool;
