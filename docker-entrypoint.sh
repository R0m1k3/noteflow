#!/bin/sh
set -e

echo "🚀 Démarrage de NoteFlow avec PostgreSQL"
echo "========================================"

# Créer les dossiers nécessaires
mkdir -p /app/data
mkdir -p /app/public/uploads
chmod -R 777 /app/data
chmod -R 777 /app/public/uploads

# Attendre que PostgreSQL soit prêt
echo ""
echo "⏳ Attente de PostgreSQL..."
until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.connect()
    .then(client => { client.release(); pool.end(); process.exit(0); })
    .catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   PostgreSQL n'est pas encore prêt, nouvelle tentative dans 2s..."
  sleep 2
done

echo "✅ PostgreSQL est prêt"
echo ""

# Vérifier si la migration est nécessaire
echo "🔍 Vérification des données..."

# Vérifier si PostgreSQL contient des données
HAS_DATA=$(node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT COUNT(*) as count FROM users')
    .then(result => {
      pool.end();
      console.log(result.rows[0].count);
      process.exit(0);
    })
    .catch(() => {
      pool.end();
      console.log('0');
      process.exit(0);
    });
" 2>/dev/null)

if [ "$HAS_DATA" = "0" ]; then
  echo "⚠️  PostgreSQL est vide"

  # Vérifier si SQLite existe
  if [ -f "/app/data-sqlite/notes.db" ]; then
    echo ""
    echo "📦 Base SQLite détectée: /app/data-sqlite/notes.db"
    echo "🔄 Lancement de la migration automatique..."
    echo ""

    SQLITE_PATH=/app/data-sqlite/notes.db node scripts/migrate-sqlite-to-postgres.js

    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Migration réussie!"
    else
      echo ""
      echo "❌ Erreur lors de la migration"
      echo "⚠️  L'application démarrera avec une base vide"
    fi
  else
    echo "ℹ️  Aucune base SQLite à migrer"
    echo "📝 Première installation - une base vide sera créée"
  fi
else
  echo "✅ PostgreSQL contient déjà des données ($HAS_DATA utilisateurs)"
fi

echo ""
echo "🔄 Migration des timezones du calendrier..."
node scripts/migrate-calendar-timezone.js 2>/dev/null || echo "  ℹ️  Migration timezone déjà effectuée ou non nécessaire"

echo ""
echo "========================================"
echo "🚀 Démarrage du serveur NoteFlow..."
echo ""

# Démarrer le serveur Node.js
exec node server.js
