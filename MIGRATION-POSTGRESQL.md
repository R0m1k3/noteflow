# Migration vers PostgreSQL + Docker

Ce guide explique comment migrer NoteFlow de SQLite vers PostgreSQL avec Docker.

## 🎯 Pourquoi PostgreSQL?

### Problèmes avec SQLite
- ❌ Concurrence limitée (verrous sur toute la DB)
- ❌ Difficile de savoir quelle DB est utilisée
- ❌ Pas de logs de requêtes natifs
- ❌ Corruption possible en cas de crash
- ❌ Pas adapté pour la production

### Avantages de PostgreSQL
- ✅ Concurrence parfaite (MVCC)
- ✅ Une seule source de vérité
- ✅ Transactions ACID robustes
- ✅ Logs et monitoring natifs
- ✅ Production-ready et performant
- ✅ Intégration Docker parfaite

## 📋 Prérequis

- Docker et Docker Compose installés
- Sauvegarde de votre base SQLite actuelle
- 5 minutes de votre temps

## 🚀 Étapes de Migration

### 1. Installer les dépendances PostgreSQL

```bash
npm install pg@^8.11.3
```

### 2. Activer PostgreSQL dans database.js

```bash
# Backup de l'ancien fichier
cp config/database.js config/database-sqlite.js.backup

# Installer la nouvelle version PostgreSQL
cp config/database-postgres.js config/database.js
```

### 3. Créer le fichier .env (optionnel)

```bash
cat > .env <<EOF
# PostgreSQL
POSTGRES_PASSWORD=votre_mot_de_passe_securise_ici
DATABASE_URL=postgresql://noteflow:votre_mot_de_passe_securise_ici@localhost:5499/noteflow

# JWT
JWT_SECRET=votre_secret_jwt_ici
EOF
```

### 4. Démarrer PostgreSQL avec Docker

```bash
# Démarrer uniquement PostgreSQL
docker-compose up -d postgres

# Vérifier que PostgreSQL est démarré
docker-compose logs postgres

# Vous devriez voir: "database system is ready to accept connections"
```

### 5. Migrer les données SQLite → PostgreSQL

**IMPORTANT:** Localisez d'abord votre vraie base SQLite

```bash
# Chercher où est votre vraie base de données
find / -name "notes.db" 2>/dev/null

# Ou regarder dans les logs du serveur
grep "Base de données connectée" data/app.log
```

Une fois trouvée, lancez la migration:

```bash
# Exemple si la DB est dans /app/data/notes.db
SQLITE_PATH=/app/data/notes.db node scripts/migrate-sqlite-to-postgres.js

# Ou si locale
SQLITE_PATH=./data/notes.db node scripts/migrate-sqlite-to-postgres.js
```

Vous devriez voir:

```
==================== MIGRATION SQLite → PostgreSQL ====================

✓ SQLite connecté: /app/data/notes.db
✓ PostgreSQL connecté

📊 Début de la migration...

📋 Migration table: users
  ✓ Table "users": 2/2 lignes migrées
📋 Migration table: notes
  ✓ Table "notes": 45/45 lignes migrées
📋 Migration table: rss_articles
  ✓ Table "rss_articles": 127/127 lignes migrées
...

========================================================
✅ Migration terminée!
Total: 250 lignes migrées
========================================================
```

### 6. Redémarrer l'application

```bash
# Reconstruire l'image Docker
docker-compose build notes-app

# Redémarrer tout
docker-compose up -d

# Voir les logs
docker-compose logs -f notes-app
```

Vous devriez voir:

```
[INFO]: ✓ PostgreSQL connecté: postgresql://noteflow:***@postgres:5499/noteflow
[INFO]: ✓ Tables PostgreSQL créées avec succès
[INFO]: Server running on port 2222
```

## ✅ Vérification

### 1. Tester la connexion PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it noteflow-postgres psql -U noteflow -d noteflow

# Vérifier les tables
\dt

# Compter les articles RSS
SELECT COUNT(*) FROM rss_articles;

# Voir les 5 derniers articles
SELECT title, pub_date FROM rss_articles ORDER BY pub_date DESC LIMIT 5;

# Quitter
\q
```

### 2. Tester l'application

1. Ouvrez http://localhost:2222
2. Connectez-vous (admin/admin)
3. Vérifiez que vos notes sont là
4. Vérifiez que les flux RSS s'affichent
5. Ajoutez un nouveau flux RSS
6. Attendez 2 minutes et vérifiez les nouveaux articles

## 🔧 Configuration

### Variables d'environnement

Le système utilise `DATABASE_URL` pour se connecter à PostgreSQL:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Exemple:
```bash
DATABASE_URL=postgresql://noteflow:mon_password@postgres:5432/noteflow
```

### Dans docker-compose.yml

PostgreSQL tourne sur le **port 5499** (externe) et communique sur le **port 5432** (interne):

```yaml
postgres:
  ports:
    - "5499:5499"  # Accessible depuis l'hôte sur 5499
```

L'application se connecte via le nom du service:
```yaml
notes-app:
  environment:
    - DATABASE_URL=postgresql://noteflow:password@postgres:5432/noteflow
```

## 📊 Maintenance PostgreSQL

### Backup

```bash
# Backup complet
docker exec noteflow-postgres pg_dump -U noteflow -d noteflow > backup.sql

# Backup compressé
docker exec noteflow-postgres pg_dump -U noteflow -d noteflow | gzip > backup.sql.gz
```

### Restore

```bash
# Depuis un backup
docker exec -i noteflow-postgres psql -U noteflow -d noteflow < backup.sql

# Depuis un backup compressé
gunzip < backup.sql.gz | docker exec -i noteflow-postgres psql -U noteflow -d noteflow
```

### Logs

```bash
# Voir les logs PostgreSQL
docker-compose logs postgres

# Logs en temps réel
docker-compose logs -f postgres
```

### Performance

```bash
# Se connecter à PostgreSQL
docker exec -it noteflow-postgres psql -U noteflow -d noteflow

# Voir les requêtes lentes
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

# Taille de la base
SELECT pg_size_pretty(pg_database_size('noteflow'));

# Taille des tables
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🐛 Dépannage

### Problème: PostgreSQL ne démarre pas

```bash
# Vérifier les logs
docker-compose logs postgres

# Supprimer le volume et recommencer
docker-compose down -v
docker-compose up -d postgres
```

### Problème: Application ne se connecte pas

```bash
# Vérifier les variables d'environnement
docker exec notes-todo-app env | grep DATABASE

# Vérifier que PostgreSQL est accessible
docker exec notes-todo-app nc -zv postgres 5432
```

### Problème: Articles RSS toujours pas affichés

```bash
# Se connecter à PostgreSQL
docker exec -it noteflow-postgres psql -U noteflow -d noteflow

# Compter les articles
SELECT COUNT(*) FROM rss_articles;

# Voir les 10 derniers
SELECT id, title, pub_date FROM rss_articles ORDER BY pub_date DESC LIMIT 10;

# Vérifier les flux
SELECT id, title, enabled FROM rss_feeds;
```

Si la table est vide, le problème vient du scheduler. Vérifiez les logs:

```bash
docker-compose logs -f notes-app | grep RSS
```

## 🔄 Rollback vers SQLite

Si vous devez revenir à SQLite:

```bash
# 1. Arrêter Docker
docker-compose down

# 2. Restaurer l'ancien database.js
cp config/database-sqlite.js.backup config/database.js

# 3. Modifier docker-compose.yml
# Commentez la section postgres et remettez DB_PATH

# 4. Redémarrer
docker-compose up -d
```

## ✨ Résultat Attendu

Après migration vers PostgreSQL:

✅ **Problème RSS résolu**: Les nouveaux articles s'affichent immédiatement
✅ **Pas de confusion DB**: Une seule source de vérité
✅ **Debuggable**: Logs SQL natifs dans PostgreSQL
✅ **Performance**: Meilleure concurrence et vitesse
✅ **Production-ready**: Système robuste et fiable
✅ **Monitoring**: Outils natifs PostgreSQL disponibles

**Les articles du 14 novembre (et suivants) seront visibles dès le prochain cycle du scheduler !** 🎉
