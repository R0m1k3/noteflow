#!/bin/bash

echo ""
echo "🐘 MIGRATION VERS POSTGRESQL"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Cette opération va:"
echo "  1. Activer PostgreSQL"
echo "  2. Migrer toutes vos données SQLite → PostgreSQL"
echo "  3. Reconfigurer l'application"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - La base SQLite sera conservée (backup automatique)"
echo "  - La migration prend environ 1-2 minutes"
echo "  - Vos données ne seront PAS supprimées"
echo ""
read -p "Continuer? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "📋 Étape 1/5: Sauvegarde de la base SQLite..."
cp data/notes.db data/notes.db.backup-$(date +%Y%m%d-%H%M%S)
echo "  ✅ Backup créé: data/notes.db.backup-*"

echo ""
echo "📋 Étape 2/5: Activation de PostgreSQL..."

# Décommenter les lignes PostgreSQL
sed -i 's|^#      - DATABASE_URL=|      - DATABASE_URL=|g' docker-compose.yml
sed -i 's|^#      - DB_TYPE=postgres|      - DB_TYPE=postgres|g' docker-compose.yml

echo "  ✅ Configuration PostgreSQL activée"

echo ""
echo "📋 Étape 3/5: Redémarrage des containers..."
docker-compose down
docker-compose build notes-app
docker-compose up -d

echo ""
echo "📋 Étape 4/5: Attente démarrage PostgreSQL..."
for i in {1..30}; do
  if docker exec noteflow-postgres pg_isready -U noteflow -d noteflow -p 5499 >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL prêt"
    break
  fi
  echo -n "."
  sleep 1
done
echo ""

echo ""
echo "📋 Étape 5/5: Migration des données..."
docker exec -e SQLITE_PATH=/app/data-sqlite/notes.db notes-todo-app node scripts/migrate-sqlite-to-postgres.js

if [ $? -eq 0 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "✅ MIGRATION RÉUSSIE!"
  echo ""
  echo "PostgreSQL est maintenant actif avec toutes vos données."
  echo ""
  echo "🔍 Vérification:"
  node scripts/check-data.js
  echo ""
  echo "🌐 Accédez à votre application:"
  echo "   http://localhost:2222"
  echo ""
  echo "📦 Backup SQLite disponible dans:"
  echo "   data/notes.db.backup-*"
  echo ""
  echo "═══════════════════════════════════════════════════════"
else
  echo ""
  echo "❌ ERREUR LORS DE LA MIGRATION"
  echo ""
  echo "Pour revenir à SQLite:"
  echo "  bash scripts/restore-sqlite.sh"
  echo ""
  echo "Logs d'erreur:"
  docker-compose logs notes-app | tail -20
fi
echo ""
