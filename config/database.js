const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const winston = require('winston');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(dataDir, 'app.log') }),
        new winston.transports.Console()
    ]
});

const dbPath = path.join(dataDir, 'notes.db');
logger.info(`Using database at: ${dbPath}`);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        process.exit(1);
    }
    logger.info('Connected to SQLite database');
    initializeDatabase();
});

// Initialize database schema
function initializeDatabase() {
    db.serialize(() => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create notes table
        db.run(`
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                archived INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        // Create todos table
        db.run(`
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                position INTEGER DEFAULT 0,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
        `);

        // Create images table
        db.run(`
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            )
        `);

        // Check if admin user exists, create if not
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, user) => {
            if (err) {
                logger.error('Error checking admin user:', err);
                return;
            }

            if (!user) {
                try {
                    const hash = await bcrypt.hash('admin', 10);
                    db.run(
                        'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
                        ['admin', hash, 1],
                        (err) => {
                            if (err) {
                                logger.error('Error creating admin user:', err);
                                return;
                            }
                            logger.info('Admin user created successfully');
                        }
                    );
                } catch (err) {
                    logger.error('Error hashing admin password:', err);
                }
            }
        });
    });
}

module.exports = { db, logger };