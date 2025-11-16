// Configuration et initialisation de la base de données PostgreSQL
const { Pool, types } = require('pg');
const bcrypt = require('bcrypt');
const logger = require('./logger');
const timezoneLogger = require('../services/timezone-logger');

// IMPORTANT: Parser personnalisé pour TIMESTAMPTZ
// On force PostgreSQL à renvoyer en UTC (options: '-c timezone=UTC')
// Mais PostgreSQL peut renvoyer "2024-11-17 09:20:00" sans le 'Z'
// On doit normaliser en ISO UTC propre
types.setTypeParser(1184, function(stringValue) {
  // 1184 = TIMESTAMPTZ
  if (!stringValue) return null;

  // LOG pour debug
  const originalValue = stringValue;

  // PostgreSQL avec timezone=UTC renvoie: "2024-11-17 09:20:00" ou "2024-11-17 09:20:00+00"
  // On doit toujours renvoyer une ISO string UTC propre avec 'Z'

  let result;

  // Si déjà au format ISO avec Z ou timezone (+HH:MM ou +HH)
  if (stringValue.includes('Z') || stringValue.match(/[+-]\d{2}(:\d{2})?$/)) {
    result = new Date(stringValue).toISOString();
    timezoneLogger.log('PARSER', `Input avec TZ: "${originalValue}" → Output: "${result}"`);
  } else {
    // Si format "YYYY-MM-DD HH:MM:SS" sans timezone
    // Comme timezone=UTC, on sait que c'est en UTC
    // On ajoute 'Z' pour forcer JavaScript à l'interpréter comme UTC
    const isoString = stringValue.replace(' ', 'T') + 'Z';
    result = new Date(isoString).toISOString();
    timezoneLogger.log('PARSER', `Input sans TZ: "${originalValue}" → ISO+Z: "${isoString}" → Output: "${result}"`);
  }

  return result;
});

// Configuration PostgreSQL depuis DATABASE_URL ou variables d'environnement
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'noteflow'}:${process.env.PGPASSWORD || 'noteflow_secure_password_change_me'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5499'}/${process.env.PGDATABASE || 'noteflow'}`;

// Créer le pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // IMPORTANT: Forcer le timezone à UTC pour toutes les connexions
  // Cela garantit que PostgreSQL renvoie toujours les dates en UTC
  options: '-c timezone=UTC'
});

// Gestion des erreurs du pool
pool.on('error', (err) => {
  logger.error('Erreur PostgreSQL pool:', err);
});

// Test de connexion
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Erreur lors de la connexion à PostgreSQL:', err);
    process.exit(1);
  }
  release();
  logger.info(`✓ PostgreSQL connecté: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
});

/**
 * Initialiser la base de données avec les tables nécessaires
 */
async function initDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Table users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table notes
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT,
        image_filename TEXT,
        archived BOOLEAN DEFAULT FALSE,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table note_todos
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_todos (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        position INTEGER DEFAULT 0
      )
    `);

    // Table global_todos
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table note_images
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_images (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table note_files
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_files (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table rss_feeds
    await client.query(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_fetched_at TIMESTAMP
      )
    `);

    // Table rss_articles
    await client.query(`
      CREATE TABLE IF NOT EXISTS rss_articles (
        id SERIAL PRIMARY KEY,
        feed_id INTEGER NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        link TEXT UNIQUE NOT NULL,
        description TEXT,
        pub_date TIMESTAMP,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table rss_summaries
    await client.query(`
      CREATE TABLE IF NOT EXISTS rss_summaries (
        id SERIAL PRIMARY KEY,
        summary TEXT NOT NULL,
        model TEXT,
        articles_count INTEGER DEFAULT 0,
        feed_title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table calendar_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        google_event_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        location TEXT,
        color_id TEXT,
        html_link TEXT,
        all_day BOOLEAN DEFAULT FALSE,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table note_tags
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_tags (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        tag VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(note_id, tag)
      )
    `);

    // Table google_oauth_tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_oauth_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        expiry_date BIGINT,
        scope TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Créer les index pour la performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority DESC, updated_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_note_todos ON note_todos(note_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_global_todos_user ON global_todos(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_note_images ON note_images(note_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_note_files ON note_files(note_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_note_tags ON note_tags(note_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rss_articles_feed ON rss_articles(feed_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rss_articles_date ON rss_articles(pub_date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time)');

    logger.info('✓ Tables PostgreSQL créées avec succès');

    // Créer l'utilisateur admin par défaut si la table est vide
    const usersCount = await client.query('SELECT COUNT(*) as count FROM users');

    if (usersCount.rows[0].count === '0') {
      const defaultPassword = 'admin';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);

      await client.query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
        ['admin', passwordHash, true]
      );

      logger.info('✓ Utilisateur admin créé (username: admin, password: admin)');
      logger.warn('⚠️  IMPORTANT: Changez le mot de passe admin en production!');
    } else {
      logger.info('✓ Base de données déjà initialisée');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Exécuter une requête avec promesse
 */
async function runQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return {
      id: result.rows[0]?.id || result.rowCount,
      changes: result.rowCount
    };
  } catch (error) {
    logger.error('Erreur runQuery:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Récupérer une seule ligne
 */
async function getOne(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Erreur getOne:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Récupérer toutes les lignes
 */
async function getAll(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Erreur getAll:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  runQuery,
  getOne,
  getAll
};
