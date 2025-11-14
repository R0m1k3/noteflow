# 🚀 Quick Start: Migration PostgreSQL

Migration rapide de NoteFlow vers PostgreSQL en 5 minutes.

## Pourquoi cette migration?

**Votre problème actuel:**
```
[INFO]: ✅ 18 nouveaux articles
```
Mais... **rien ne s'affiche** dans l'interface 😱

**Cause:** SQLite avec multiples fichiers DB, impossible de savoir laquelle est utilisée.

**Solution:** PostgreSQL = UNE SEULE source de vérité.

## 📋 Installation en 5 Étapes

### 1️⃣ Installer dépendances

```bash
npm install
```

### 2️⃣ Activer PostgreSQL

```bash
cp config/database-postgres.js config/database.js
```

### 3️⃣ Créer fichier .env (optionnel)

```bash
cat > .env <<EOF
POSTGRES_PASSWORD=votre_password_securise
JWT_SECRET=votre_jwt_secret
EOF
```

### 4️⃣ Démarrer PostgreSQL

```bash
# Démarrer PostgreSQL seul
docker-compose up -d postgres

# Attendre 10 secondes qu'il démarre
sleep 10

# Vérifier que c'est OK
docker-compose logs postgres | grep "ready"
```

### 5️⃣ Migrer vos données

**Trouvez d'abord votre vraie DB SQLite:**

```bash
# Option A: Chercher dans tout le système
find / -name "notes.db" 2>/dev/null

# Option B: Regarder les logs
grep "Base de données connectée" data/app.log

# Vous devriez trouver quelque chose comme:
# /app/data/notes.db
# OU
# /var/lib/docker/volumes/xxx/notes.db
```

**Puis migrez:**

```bash
# Remplacez /path/to par le vrai chemin trouvé
SQLITE_PATH=/path/to/notes.db node scripts/migrate-sqlite-to-postgres.js

# Exemple si dans Docker:
SQLITE_PATH=/var/lib/docker/volumes/noteflow_notes_data/_data/notes.db node scripts/migrate-sqlite-to-postgres.js

# Exemple si local:
SQLITE_PATH=./data/notes.db node scripts/migrate-sqlite-to-postgres.js
```

Vous verrez:
```
==================== MIGRATION SQLite → PostgreSQL ====================

✓ SQLite connecté: /path/to/notes.db
✓ PostgreSQL connecté

📊 Début de la migration...

📋 Migration table: users
  ✓ Table "users": 2/2 lignes migrées
📋 Migration table: rss_articles
  ✓ Table "rss_articles": 127/127 lignes migrées
...

========================================================
✅ Migration terminée!
Total: 250 lignes migrées
========================================================
```

### 6️⃣ Redémarrer l'application

```bash
# Rebuild avec PostgreSQL
docker-compose build notes-app

# Tout redémarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f notes-app
```

**Vous devriez voir:**
```
[INFO]: ✓ PostgreSQL connecté: postgresql://noteflow:***@postgres:5499/noteflow
[INFO]: ✓ Tables PostgreSQL créées
[INFO]: 🔄 === Début mise à jour RSS ===
[INFO]: ✅ 18 nouveaux articles
```

## ✅ Vérification

### Tester PostgreSQL

```bash
# Se connecter
docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499

# Compter articles RSS
SELECT COUNT(*) FROM rss_articles;

# Voir les 5 derniers
SELECT title, pub_date FROM rss_articles ORDER BY pub_date DESC LIMIT 5;

# Quitter
\q
```

### Tester l'application

1. Ouvrir http://localhost:2222
2. Login: `admin` / `admin`
3. Vérifier que vos notes sont là
4. Vérifier que les flux RSS s'affichent ✨
5. Les nouveaux articles apparaissent dans les 2 minutes

## 🎯 Résultat

### Avant (SQLite)
```
😱 Articles récupérés mais jamais affichés
😱 Impossible de déboguer
😱 Plusieurs fichiers DB, confusion totale
```

### Après (PostgreSQL)
```
✅ Articles affichés immédiatement
✅ Une seule DB, pas de confusion
✅ Logs SQL pour debug
✅ Production-ready
```

## 🐛 Problème?

### PostgreSQL ne démarre pas

```bash
docker-compose logs postgres
docker-compose down -v
docker-compose up -d postgres
```

### App ne se connecte pas

```bash
docker-compose logs notes-app | grep -i postgres
docker-compose logs notes-app | grep -i error
```

### Articles toujours pas affichés

```bash
# Vérifier que les articles sont en DB
docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "SELECT COUNT(*) FROM rss_articles;"

# Si 0, vérifier les flux
docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "SELECT id, title, enabled FROM rss_feeds;"

# Vérifier les logs RSS
docker-compose logs notes-app | grep RSS
```

## 📚 Documentation Complète

Voir `MIGRATION-POSTGRESQL.md` pour:
- Backup/Restore PostgreSQL
- Monitoring et performance
- Configuration avancée
- Rollback vers SQLite
- Dépannage complet

## 💡 Pro Tips

1. **Toujours backup avant migration:**
   ```bash
   cp data/notes.db data/notes.db.backup
   ```

2. **Vérifier PostgreSQL est prêt:**
   ```bash
   docker-compose logs postgres | grep "ready"
   ```

3. **Voir les requêtes SQL en temps réel:**
   ```bash
   docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
     -c "SELECT query FROM pg_stat_activity WHERE state = 'active';"
   ```

4. **Backup automatique quotidien:**
   ```bash
   # Ajouter à crontab
   0 2 * * * docker exec noteflow-postgres pg_dump -U noteflow noteflow | gzip > /backup/noteflow-$(date +\%Y\%m\%d).sql.gz
   ```

**🎉 Votre système RSS va enfin fonctionner correctement avec PostgreSQL !**
