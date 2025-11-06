const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'data/app.log' }),
    new winston.transports.Console()
  ]
});

const dbPath = path.resolve(__dirname, '../data/notes.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  }
  logger.info('Connected to SQLite database');
  initializeDatabase();
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Notes table
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Todos table
    db.run(`CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id)
    )`);

    // Images table
    db.run(`CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id)
    )`);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_todos_note_id ON todos(note_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_images_note_id ON images(note_id)');

    // Check if admin user exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        logger.error('Error checking admin user:', err);
        return;
      }
      if (!row) {
        // Create default admin user
        bcrypt.hash('admin', 10, (err, hash) => {
          if (err) {
            logger.error('Error hashing password:', err);
            return;
          }
          db.run(
            'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)',
            ['admin', hash],
            (err) => {
              if (err) {
                logger.error('Error creating admin user:', err);
                return;
              }
              logger.info('Default admin user created');
            }
          );
        });
      }
    });
  });
}

module.exports = { db, logger };