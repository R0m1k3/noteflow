# Migration SQLite → PostgreSQL - Instructions

## ✅ Ce qui a été préparé

1. **Docker-compose configuré** avec PostgreSQL sur port 5499
2. **Scripts de migration** créés et prêts
3. **Configuration PostgreSQL** complète dans `config/database-postgres.js`
4. **Volume monté** pour accéder à la base SQLite depuis le container

## 🚀 Étapes de migration

### Option A: Script automatique (RECOMMANDÉ)

```bash
# 1. Reconstruire l'image Docker avec les nouvelles dépendances
docker-compose build notes-app

# 2. Démarrer les containers
docker-compose up -d

# 3. Attendre que PostgreSQL soit prêt (30 secondes)
docker-compose logs -f postgres | grep "ready to accept connections"
# Appuyez sur Ctrl+C quand vous voyez le message

# 4. Lancer la migration automatique
bash scripts/run-migration.sh
```

### Option B: Commandes manuelles

```bash
# 1. Reconstruire et démarrer
docker-compose build notes-app
docker-compose up -d

# 2. Vérifier que PostgreSQL est accessible
docker exec notes-todo-app node scripts/verify-postgres-connection.js

# 3. Lancer la migration
docker exec -e SQLITE_PATH=/app/data-sqlite/notes.db \
  notes-todo-app node scripts/migrate-sqlite-to-postgres.js

# 4. Vérifier les données migrées
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "SELECT COUNT(*) FROM rss_articles;"
```

## 🔍 Vérification après migration

### Vérifier les articles RSS

```bash
# Compter les articles dans PostgreSQL
docker exec notes-todo-app node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.query('SELECT COUNT(*) FROM rss_articles').then(r => {
  console.log('Articles RSS:', r.rows[0].count);
  pool.end();
});
"
```

### Vérifier les flux RSS

```bash
# Compter les flux configurés
docker exec notes-todo-app node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.query('SELECT COUNT(*) FROM rss_feeds').then(r => {
  console.log('Flux RSS:', r.rows[0].count);
  pool.end();
});
"
```

## 🎯 Test du système RSS

### 1. Forcer une mise à jour des flux

```bash
# Exécuter manuellement le scheduler RSS
docker exec notes-todo-app node services/rss-scheduler-v2.js
```

### 2. Vérifier dans l'interface web

Ouvrez votre navigateur sur `http://localhost:2222` et vérifiez:
- Les articles RSS s'affichent
- Les nouveaux articles apparaissent (pas seulement ceux du 12 nov)
- L'auto-refresh fonctionne (2 minutes)

## 📊 Logs et diagnostic

### Voir les logs du container

```bash
# Logs de l'application
docker-compose logs -f notes-app

# Logs PostgreSQL
docker-compose logs -f postgres
```

### Entrer dans le container pour debug

```bash
# Shell dans le container
docker exec -it notes-todo-app sh

# Puis dans le container:
node -e "console.log(process.env.DATABASE_URL)"
ls -la /app/data-sqlite/
```

## 🧹 Nettoyage après migration réussie

Une fois que TOUT fonctionne parfaitement:

```bash
# Sauvegarder l'ancienne base SQLite
cp data/notes.db data/notes.db.backup-$(date +%Y%m%d)

# Optionnel: Supprimer l'ancienne base
# rm data/notes.db
```

## ❌ En cas de problème

### Problème: Container ne démarre pas

```bash
# Voir les erreurs
docker-compose logs notes-app

# Reconstruire proprement
docker-compose down
docker-compose build --no-cache notes-app
docker-compose up -d
```

### Problème: Connexion PostgreSQL refusée

```bash
# Vérifier que PostgreSQL écoute sur le bon port
docker exec noteflow-postgres netstat -tlnp | grep 5499

# Vérifier les variables d'environnement
docker exec notes-todo-app env | grep DATABASE
```

### Problème: Migration échoue

```bash
# Vérifier que le fichier SQLite est accessible
docker exec notes-todo-app ls -la /app/data-sqlite/notes.db

# Relancer avec plus de détails
docker exec -e SQLITE_PATH=/app/data-sqlite/notes.db \
  notes-todo-app node scripts/migrate-sqlite-to-postgres.js
```

## 🔄 Rollback vers SQLite

Si vous voulez revenir à SQLite temporairement:

1. Arrêter les containers: `docker-compose down`
2. Modifier `docker-compose.yml`: commenter la section `postgres`
3. Modifier l'environnement de `notes-app` pour utiliser SQLite
4. Redémarrer: `docker-compose up -d`

## 📝 Notes importantes

- La base SQLite est montée en **lecture seule** (`:ro`) pour éviter les modifications accidentelles
- Le container PostgreSQL utilise un volume persistant `postgres_data`
- Les données ne sont PAS perdues si vous redémarrez les containers
- Le port 5499 est exposé sur le host pour debug si besoin

## 🎉 Prochaine étape

Une fois la migration réussie, consultez:
- `QUICK-START-POSTGRES.md` pour l'utilisation quotidienne
- `MIGRATION-POSTGRESQL.md` pour la documentation technique complète
