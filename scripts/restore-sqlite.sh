#!/bin/bash

echo ""
echo "🔄 RESTAURATION SQLITE - Récupération rapide des données"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Cette opération va:"
echo "  1. Arrêter PostgreSQL"
echo "  2. Reconfigurer l'application pour SQLite"
echo "  3. Redémarrer avec vos données originales"
echo ""
read -p "Continuer? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "📋 Étape 1/3: Arrêt des containers..."
docker-compose down

echo ""
echo "📋 Étape 2/3: Modification docker-compose.yml..."

# Commenter les lignes PostgreSQL dans docker-compose.yml
sed -i 's|^      - DATABASE_URL=|#      - DATABASE_URL=|g' docker-compose.yml
sed -i 's|^      - DB_TYPE=postgres|#      - DB_TYPE=postgres|g' docker-compose.yml

echo "  ✅ Configuration SQLite activée"

echo ""
echo "📋 Étape 3/3: Redémarrage avec SQLite..."
docker-compose build notes-app
docker-compose up -d

echo ""
echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ RESTAURATION TERMINÉE!"
echo ""
echo "Vos données SQLite sont maintenant actives."
echo ""
echo "🔍 Vérification:"
docker-compose logs notes-app | grep -i "database\|sqlite" | tail -3
echo ""
echo "🌐 Accédez à votre application:"
echo "   http://localhost:2222"
echo ""
echo "📊 Pour vérifier les données:"
echo "   node scripts/check-data.js"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
