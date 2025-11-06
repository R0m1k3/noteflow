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

// Ensure database directory has correct permissions
try {
    fs.accessSync(dataDir, fs.constants.W_OK);
} catch (err) {
    logger.error(`No write access to ${dataDir}`, err);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        process.exit(1);
    }
    logger.info('Connected to SQLite database');
    initializeDatabase();
});

// Rest of the file remains the same...