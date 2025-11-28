// Script de migration SQLite → PostgreSQL
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

console.log('\n==================== MIGRATION SQLite → PostgreSQL ====================\n');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../data/notes.db');
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://noteflow:noteflow_secure_password_change_me@localhost:5499/noteflow`;

// Connexion SQLite (source)
const sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
  if (err) {
    console.error('Erreur connexion SQLite:', err);
    process.exit(1);
  }
  console.log('✓ SQLite connecté:', SQLITE_PATH);
});

// Connexion PostgreSQL (destination)
const pgPool = new Pool({
  connectionString: DATABASE_URL,
});

pgPool.connect((err, client, release) => {
  if (err) {
    console.error('Erreur connexion PostgreSQL:', err);
    process.exit(1);
  }
  release();
  console.log('✓ PostgreSQL connecté\n');
});

// Tables à migrer (dans l'ordre pour respecter les foreign keys)
const TABLES_ORDER = [
  'users',
  'notes',
  'note_todos',
  'global_todos',
  'note_images',
  'note_files',
  'settings',
  'rss_feeds',
  'rss_articles',
  'rss_summaries',
  'calendar_events',
  'note_tags',
  'google_oauth_tokens'
];

/**
 * Récupérer les données d'une table SQLite
 */
function getSqliteData(tableName) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        if (err.message.includes('no such table')) {
          resolve([]); // Table n'existe pas, ok
        } else {
          reject(err);
        }
      } else {
        resolve(rows);
      }
    });
  });
}

// Colonnes booléennes connues (pour conversion 0/1 → FALSE/TRUE)
const BOOLEAN_COLUMNS = {
  users: ['is_admin'],
  notes: ['archived'],
  note_todos: ['completed', 'priority'],
  global_todos: ['completed', 'priority'],
  rss_feeds: ['enabled'],
  calendar_events: ['all_day']
};

/**
 * Insérer les données dans PostgreSQL
 */
async function insertPostgresData(tableName, rows) {
  if (rows.length === 0) {
    console.log(`  ⏭️  Table "${tableName}" vide, skip`);
    return 0;
  }

  const client = await pgPool.connect();
  let inserted = 0;
  const booleanCols = BOOLEAN_COLUMNS[tableName] || [];

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      // Convertir les noms de colonnes et valeurs
      const columns = Object.keys(row);
      const values = columns.map((col, idx) => {
        const val = Object.values(row)[idx];

        // Convertir les valeurs SQLite vers PostgreSQL
        if (val === null) return null;
        if (typeof val === 'boolean') return val;

        // Convertir les colonnes booléennes: 0/1 → FALSE/TRUE
        if (booleanCols.includes(col) && (val === 0 || val === 1)) {
          return val === 1;
        }

        if (typeof val === 'number') return val;
        // Dates
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          return val; // Déjà au bon format
        }
        return val;
      });

      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const columnsStr = columns.join(', ');

      const sql = `
        INSERT INTO ${tableName} (${columnsStr})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      try {
        await client.query(sql, values);
        inserted++;
      } catch (err) {
        console.warn(`    ⚠️  Erreur insertion ligne (ignorée):`, err.message.substring(0, 100));
      }
    }

    // Reset des séquences pour les colonnes SERIAL
    try {
      await client.query(`
        SELECT setval(pg_get_serial_sequence('${tableName}', 'id'),
        (SELECT MAX(id) FROM ${tableName}))
      `);
    } catch (err) {
      // Ignore si pas de colonne id
    }

    await client.query('COMMIT');
    console.log(`  ✓ Table "${tableName}": ${inserted}/${rows.length} lignes migrées`);
    return inserted;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Erreur table "${tableName}":`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Migration principale
 */
async function migrate() {
  let totalRows = 0;

  try {
    console.log('📊 Début de la migration...\n');

    for (const table of TABLES_ORDER) {
      console.log(`📋 Migration table: ${table}`);

      const rows = await getSqliteData(table);
      const inserted = await insertPostgresData(table, rows);
      totalRows += inserted;
    }

    console.log('\n========================================================');
    console.log(`✅ Migration terminée!`);
    console.log(`Total: ${totalRows} lignes migrées`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('\n❌ Erreur lors de la migration:', err);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }

  process.exit(0);
}

// Vérifier que la DB SQLite existe
if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`❌ Fichier SQLite introuvable: ${SQLITE_PATH}`);
  console.log('\nUtilisation:');
  console.log('  SQLITE_PATH=/path/to/notes.db node scripts/migrate-sqlite-to-postgres.js');
  process.exit(1);
}

// Lancer la migration
migrate();
