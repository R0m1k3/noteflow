// Script de diagnostic - Vérifier où sont les données
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Pool } = require('pg');

console.log('\n🔍 DIAGNOSTIC DES DONNÉES\n');
console.log('═══════════════════════════════════════════\n');

// Variables d'environnement
console.log('📋 Configuration actuelle:');
console.log('  DB_TYPE:', process.env.DB_TYPE || '(non défini → SQLite)');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ?
  process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : '(non défini)');
console.log('');

// 1. Vérifier SQLite
const SQLITE_PATH = path.join(__dirname, '../data/notes.db');
console.log('📊 Données dans SQLite (' + SQLITE_PATH + '):');

const sqliteDb = new sqlite3.Database(SQLITE_PATH, async (err) => {
  if (err) {
    console.log('  ❌ Erreur connexion SQLite:', err.message);
    checkPostgres();
    return;
  }

  const tables = ['users', 'notes', 'global_todos', 'rss_feeds', 'rss_articles', 'calendar_events', 'settings'];
  let completed = 0;

  for (const table of tables) {
    sqliteDb.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        console.log(`  • ${table}: ❌ ${err.message}`);
      } else {
        const icon = row.count > 0 ? '✅' : '⚪';
        console.log(`  ${icon} ${table.padEnd(20)} : ${row.count}`);
      }

      completed++;
      if (completed === tables.length) {
        sqliteDb.close(() => {
          console.log('');
          checkPostgres();
        });
      }
    });
  }
});

// 2. Vérifier PostgreSQL
async function checkPostgres() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
    console.log('📊 PostgreSQL: Non configuré (DATABASE_URL manquant)\n');
    showConclusion();
    return;
  }

  console.log('📊 Données dans PostgreSQL:');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 3000,
  });

  try {
    const client = await pool.connect();

    const tables = ['users', 'notes', 'global_todos', 'rss_feeds', 'rss_articles', 'calendar_events', 'settings'];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        const icon = count > 0 ? '✅' : '⚪';
        console.log(`  ${icon} ${table.padEnd(20)} : ${count}`);
      } catch (err) {
        console.log(`  • ${table.padEnd(20)} : ❌ ${err.message.split('\n')[0]}`);
      }
    }

    client.release();
    await pool.end();
    console.log('');
    showConclusion();

  } catch (error) {
    console.log('  ❌ Connexion impossible:', error.message);
    console.log('');
    showConclusion();
  }
}

function showConclusion() {
  console.log('═══════════════════════════════════════════');
  console.log('\n💡 CONCLUSION:\n');

  const dbType = process.env.DB_TYPE || 'sqlite';
  const hasDbUrl = process.env.DATABASE_URL?.startsWith('postgresql://');

  if (dbType === 'postgres' || hasDbUrl) {
    console.log('  L\'application est configurée pour PostgreSQL');
    console.log('  ');
    console.log('  ⚠️  Si PostgreSQL est vide et SQLite contient des données:');
    console.log('     → Vos données sont dans SQLite');
    console.log('     → Lancez la migration: bash scripts/run-migration.sh');
    console.log('     ');
    console.log('  ✅ Si PostgreSQL contient des données:');
    console.log('     → Migration déjà effectuée');
    console.log('     → Redémarrez: docker-compose restart notes-app');
  } else {
    console.log('  L\'application est configurée pour SQLite');
    console.log('  ');
    console.log('  ✅ Si SQLite contient des données:');
    console.log('     → Tout est normal');
    console.log('     → Vérifiez l\'interface web');
  }

  console.log('\n═══════════════════════════════════════════\n');
  process.exit(0);
}
