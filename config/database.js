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

        // Table note_images (images attachées aux notes)
        db.run(`
          CREATE TABLE IF NOT EXISTS note_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
          )
        `);

        // Table note_files (fichiers attachés aux notes)
        db.run(`
          CREATE TABLE IF NOT EXISTS note_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
          )
        `);

        // Table settings (paramètres globaux)
        db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table rss_feeds (flux RSS)
        db.run(`
          CREATE TABLE IF NOT EXISTS rss_feeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE NOT NULL,
            title TEXT,
            description TEXT,
            enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_fetched_at DATETIME
          )
        `);

        // Table rss_articles (articles des flux RSS)
        db.run(`
          CREATE TABLE IF NOT EXISTS rss_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feed_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            link TEXT UNIQUE NOT NULL,
            description TEXT,
            pub_date DATETIME,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
          )
        `);

        // Table rss_summaries (résumés générés)
        db.run(`
          CREATE TABLE IF NOT EXISTS rss_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            summary TEXT NOT NULL,
            model TEXT,
            articles_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table calendar_events (événements Google Calendar)
        db.run(`
          CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_event_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            location TEXT,
            color_id TEXT,
            html_link TEXT,
            synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        // Table note_tags (tags pour les notes)
        db.run(`
          CREATE TABLE IF NOT EXISTS note_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
            UNIQUE(note_id, tag)
          )
        `);

        // Table google_oauth_tokens (tokens OAuth pour Google Calendar)
        db.run(`
          CREATE TABLE IF NOT EXISTS google_oauth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            token_type TEXT DEFAULT 'Bearer',
            expiry_date INTEGER,
            scope TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id)
          )
        `);

        // Créer les index pour la performance
        db.run('CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_todos ON note_todos(note_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_global_todos_user ON global_todos(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_images ON note_images(note_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_files ON note_files(note_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_tags ON note_tags(note_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag)');
        db.run('CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)');
        db.run('CREATE INDEX IF NOT EXISTS idx_rss_articles_feed ON rss_articles(feed_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_rss_articles_date ON rss_articles(pub_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time)');

        logger.info('✓ Tables de base de données créées avec succès');

        // Migrations automatiques
        // Migration pour rss_summaries - ajouter feed_title
        db.all("PRAGMA table_info(rss_summaries)", (err, columns) => {
          if (err) {
            logger.error('Erreur lors de la vérification de la structure de la table rss_summaries:', err);
            return;
          }

          const hasFeedTitle = columns.some(col => col.name === 'feed_title');

          if (!hasFeedTitle) {
            logger.info('Migration: Ajout de la colonne feed_title à rss_summaries...');
            db.run('ALTER TABLE rss_summaries ADD COLUMN feed_title TEXT', (err) => {
              if (err) {
                logger.error('Erreur lors de l\'ajout de la colonne feed_title:', err);
              } else {
                logger.info('✓ Colonne feed_title ajoutée avec succès');
              }
            });
          }
        });

        db.all("PRAGMA table_info(notes)", (err, columns) => {
          if (err) {
            logger.error('Erreur lors de la vérification de la structure de la table notes:', err);
            return;
          }

          const hasImageFilename = columns.some(col => col.name === 'image_filename');
          const hasArchived = columns.some(col => col.name === 'archived');

          if (!hasImageFilename) {
            logger.info('Migration: Ajout de la colonne image_filename...');
            db.run('ALTER TABLE notes ADD COLUMN image_filename TEXT', (err) => {
              if (err) {
                logger.error('Erreur lors de l\'ajout de la colonne image_filename:', err);
              } else {
                logger.info('✓ Colonne image_filename ajoutée avec succès');
              }
            });
          }

          if (!hasArchived) {
            logger.info('Migration: Ajout de la colonne archived...');
            db.run('ALTER TABLE notes ADD COLUMN archived BOOLEAN DEFAULT 0', (err) => {
              if (err) {
                logger.error('Erreur lors de l\'ajout de la colonne archived:', err);
              } else {
                logger.info('✓ Colonne archived ajoutée avec succès');
              }
            });
          }
        });

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