// Configuration et initialisation de la base de données SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const logger = require('./logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/notes.db');

// Créer une connexion à la base de données
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    logger.error('Erreur lors de la connexion à la base de données:', err);
    process.exit(1);
  }
  logger.info(`Base de données connectée: ${DB_PATH}`);
});

// Activer les clés étrangères
db.run('PRAGMA foreign_keys = ON');

/**
 * Initialiser la base de données avec les tables nécessaires
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Table users
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table notes
        db.run(`
          CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            image_filename TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        // Table note_todos (todos dans les notes)
        db.run(`
          CREATE TABLE IF NOT EXISTS note_todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            position INTEGER DEFAULT 0,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
          )
        `);

        // Table global_todos (sidebar permanente)
        db.run(`
          CREATE TABLE IF NOT EXISTS global_todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        // Créer les index pour la performance
        db.run('CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_todos ON note_todos(note_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_global_todos_user ON global_todos(user_id)');

        logger.info('✓ Tables de base de données créées avec succès');

        // Créer l'utilisateur admin par défaut si la table est vide
        db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
          if (err) {
            logger.error('Erreur lors de la vérification des utilisateurs:', err);
            reject(err);
            return;
          }

          if (row.count === 0) {
            // Créer l'utilisateur admin par défaut
            const defaultPassword = 'admin';
            const passwordHash = await bcrypt.hash(defaultPassword, 12);

            db.run(
              'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
              ['admin', passwordHash, 1],
              (err) => {
                if (err) {
                  logger.error('Erreur lors de la création de l\'utilisateur admin:', err);
                  reject(err);
                } else {
                  logger.info('✓ Utilisateur admin créé (username: admin, password: admin)');
                  logger.warn('⚠️  IMPORTANT: Changez le mot de passe admin en production!');
                  resolve();
                }
              }
            );
          } else {
            logger.info('✓ Base de données déjà initialisée');
            resolve();
          }
        });
      } catch (error) {
        logger.error('Erreur lors de l\'initialisation de la base de données:', error);
        reject(error);
      }
    });
  });
}

/**
 * Exécuter une requête avec promesse
 */
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Récupérer une seule ligne
 */
function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Récupérer toutes les lignes
 */
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  initDatabase,
  runQuery,
  getOne,
  getAll
};