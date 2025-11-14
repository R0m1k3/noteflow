# NoteFlow - PostgreSQL Uniquement

## 🐘 Configuration

NoteFlow utilise **exclusivement PostgreSQL** comme base de données.

## 🚀 Démarrage rapide

### 1. Prérequis

- Docker et Docker Compose
- Port 5499 disponible (PostgreSQL)
- Port 2222 disponible (Application)

### 2. Configuration

Créez un fichier `.env` (optionnel) pour personnaliser:

```env
# PostgreSQL
POSTGRES_PASSWORD=votre_mot_de_passe_securise

# Application
JWT_SECRET=votre_secret_jwt_securise
PORT=2222
```

### 3. Démarrage

```bash
# Construire et démarrer
docker-compose build
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

**🎉 C'est tout!** L'application:
- ✅ Attend que PostgreSQL soit prêt
- ✅ Crée automatiquement les tables
- ✅ Migre les données SQLite si détectées (une seule fois)
- ✅ Démarre le serveur

Accédez à: **http://localhost:2222**

## 📦 Migration automatique SQLite → PostgreSQL

Si vous aviez une ancienne installation avec SQLite (`data/notes.db`), la migration se fait **automatiquement** au premier démarrage:

1. Le container détecte que PostgreSQL est vide
2. Il cherche `/app/data-sqlite/notes.db` (monté depuis `./data`)
3. Si trouvé, il migre toutes les données automatiquement
4. Les données SQLite sont conservées comme backup

**Aucune action manuelle requise!**

## 🗄️ Structure PostgreSQL

### Configuration dans `docker-compose.yml`

```yaml
postgres:
  image: postgres:16-alpine
  ports:
    - "5499:5499"
  environment:
    POSTGRES_DB: noteflow
    POSTGRES_USER: noteflow
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

### Tables créées automatiquement

- `users` - Utilisateurs
- `notes` - Notes avec tags et priorités
- `note_todos` - Tâches dans les notes
- `global_todos` - Tâches de la sidebar
- `note_images` - Images attachées aux notes
- `note_files` - Fichiers attachés aux notes
- `rss_feeds` - Flux RSS configurés
- `rss_articles` - Articles RSS récupérés
- `rss_summaries` - Résumés générés par IA
- `calendar_events` - Événements Google Calendar
- `google_oauth_tokens` - Tokens OAuth Google
- `settings` - Paramètres globaux

## 🔍 Commandes utiles

### Accéder à PostgreSQL

```bash
# Via psql dans le container
docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499

# Exemples de requêtes
SELECT COUNT(*) FROM notes;
SELECT COUNT(*) FROM rss_articles;
SELECT * FROM users;
```

### Backup de la base

```bash
# Créer un dump
docker exec noteflow-postgres pg_dump -U noteflow -d noteflow -p 5499 > backup-$(date +%Y%m%d).sql

# Restaurer un dump
cat backup.sql | docker exec -i noteflow-postgres psql -U noteflow -d noteflow -p 5499
```

### Voir les logs

```bash
# Logs de l'application
docker-compose logs -f notes-app

# Logs PostgreSQL
docker-compose logs -f postgres

# Logs de migration au démarrage
docker-compose logs notes-app | grep -A 20 "Démarrage de NoteFlow"
```

### Redémarrer

```bash
# Redémarrer juste l'application
docker-compose restart notes-app

# Redémarrer tout
docker-compose restart

# Rebuild complet
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔧 Configuration avancée

### Variables d'environnement

Dans `docker-compose.yml` > `notes-app` > `environment`:

```yaml
- DATABASE_URL=postgresql://noteflow:${POSTGRES_PASSWORD}@postgres:5499/noteflow
- NODE_ENV=production
- JWT_SECRET=${JWT_SECRET}
- PORT=2222
```

### Ajuster les performances PostgreSQL

Pour une production avec beaucoup de données:

```yaml
postgres:
  command: -p 5499 -c max_connections=100 -c shared_buffers=256MB
```

### Volumes persistants

Les données sont stockées dans des volumes Docker:

```yaml
volumes:
  postgres_data:        # Données PostgreSQL
  notes_uploads:        # Images et fichiers uploadés
  notes_logs:           # Logs de l'application
```

Pour voir les volumes:
```bash
docker volume ls | grep noteflow
```

## 🆘 Dépannage

### PostgreSQL n'est pas prêt

Si l'application dit "Attente de PostgreSQL..." en boucle:

```bash
# Vérifier que PostgreSQL tourne
docker-compose ps postgres

# Voir les logs PostgreSQL
docker-compose logs postgres

# Vérifier le port
docker exec noteflow-postgres netstat -tlnp | grep 5499
```

### Connexion refusée

```bash
# Vérifier les variables d'environnement
docker exec notes-todo-app env | grep DATABASE

# Tester la connexion manuellement
docker exec notes-todo-app node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.connect()
    .then(() => { console.log('✅ OK'); pool.end(); })
    .catch(err => { console.log('❌', err.message); });
"
```

### Reset complet

**⚠️ ATTENTION: Ceci supprime TOUTES les données!**

```bash
docker-compose down -v  # -v supprime les volumes
docker-compose up -d
```

### Migrer manuellement depuis SQLite

Si la migration automatique échoue:

```bash
# Depuis le container
docker exec -e SQLITE_PATH=/app/data-sqlite/notes.db \
  notes-todo-app node scripts/migrate-sqlite-to-postgres.js

# Depuis l'hôte (si Node.js installé)
SQLITE_PATH=./data/notes.db \
DATABASE_URL=postgresql://noteflow:password@localhost:5499/noteflow \
node scripts/migrate-sqlite-to-postgres.js
```

## 📊 Monitoring

### Vérifier la santé de l'application

```bash
curl http://localhost:2222/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2025-11-14T10:00:00.000Z",
  "uptime": 123.45
}
```

### Statistiques PostgreSQL

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 🔐 Sécurité en production

### 1. Changez les mots de passe par défaut

```bash
# Générer des secrets forts
openssl rand -base64 32
```

Mettez-les dans `.env`:
```env
POSTGRES_PASSWORD=<généré>
JWT_SECRET=<généré>
```

### 2. N'exposez PAS PostgreSQL sur Internet

Par défaut, PostgreSQL est accessible sur localhost:5499. Pour la production:

```yaml
postgres:
  ports:
    - "127.0.0.1:5499:5499"  # Seulement localhost
```

### 3. Configurez un reverse proxy (nginx)

L'application utilise le réseau `nginx_default`. Configurez nginx pour gérer HTTPS.

## 📝 Notes techniques

- **Base de données:** PostgreSQL 16 Alpine
- **Node.js:** Version 20 Alpine
- **Architecture:** Multi-stage Dockerfile pour optimisation
- **Healthcheck:** Vérifie automatiquement l'état de l'application
- **Restart policy:** `unless-stopped` pour redémarrage automatique
- **Migration:** Automatique au premier démarrage si SQLite détecté
- **Logs:** Gérés par Winston avec rotation

## 🎯 Prochaines étapes après installation

1. ✅ Connectez-vous avec `admin` / `admin`
2. ⚠️ **CHANGEZ LE MOT DE PASSE ADMIN**
3. 📝 Créez vos premières notes
4. 📰 Configurez vos flux RSS (Admin > Flux RSS)
5. 📅 Connectez Google Calendar (Admin > Google Calendar)
6. 🔑 Configurez OpenRouter pour l'IA (Admin > OpenRouter)

---

**Version:** 1.0.0 - PostgreSQL Uniquement
**Documentation complète:** Voir README.md principal
