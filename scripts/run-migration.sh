#!/bin/bash

# Script de migration SQLite → PostgreSQL
# À exécuter depuis le host où Docker tourne

echo "🔄 Migration SQLite → PostgreSQL"
echo "================================"
echo ""

# Vérifier que les containers tournent
if ! docker ps | grep -q "noteflow-postgres"; then
  echo "❌ Container PostgreSQL non trouvé. Lancez: docker-compose up -d"
  exit 1
fi

if ! docker ps | grep -q "notes-todo-app"; then
  echo "❌ Container notes-todo-app non trouvé. Lancez: docker-compose up -d"
  exit 1
fi

echo "✅ Containers trouvés"
echo ""

# Test de connexion PostgreSQL
echo "🔍 Test de connexion PostgreSQL..."
docker exec notes-todo-app node scripts/verify-postgres-connection.js

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Impossible de se connecter à PostgreSQL"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Lancement de la migration..."
echo ""

# Exécuter la migration depuis le container notes-todo-app
# Le fichier SQLite est monté dans /app/data-sqlite/notes.db
docker exec -e SQLITE_PATH=/app/data-sqlite/notes.db notes-todo-app node scripts/migrate-sqlite-to-postgres.js

if [ $? -eq 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Migration terminée avec succès!"
  echo ""
  echo "📋 Prochaines étapes:"
  echo "  1. Vérifier les articles RSS dans l'interface"
  echo "  2. Tester la récupération des flux RSS"
  echo "  3. Supprimer l'ancienne base SQLite (data/notes.db) si tout fonctionne"
else
  echo ""
  echo "❌ Erreur lors de la migration"
  exit 1
fi
