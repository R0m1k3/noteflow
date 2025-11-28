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
echo "🔄 Vérification des migrations de schéma..."
node scripts/auto-migrate.js

echo ""
echo "🔄 Migration des timezones du calendrier..."
node scripts/migrate-calendar-timezone.js 2>/dev/null || echo "  ℹ️  Migration timezone déjà effectuée ou non nécessaire"

echo ""
echo "🔧 Correction des types booléens PostgreSQL..."
# Exécuter le script SQL de correction des types booléens
if [ -f "/app/scripts/fix-postgres-boolean-types.sql" ]; then
    # Extraire les informations de connexion depuis DATABASE_URL
    PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    PGPORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGUSER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

    # Exécuter le script SQL
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /app/scripts/fix-postgres-boolean-types.sql > /dev/null 2>&1; then
        echo "  ✅ Types booléens corrigés"
    else
        echo "  ℹ️  Correction des types booléens déjà effectuée ou non nécessaire"
    fi
else
    echo "  ⚠️  Script de correction non trouvé"
fi

echo ""
echo "========================================"
echo "🚀 Démarrage du serveur NoteFlow..."
echo ""

# Démarrer le serveur Node.js
exec node server.js
