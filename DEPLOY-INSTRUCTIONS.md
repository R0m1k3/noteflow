# Instructions de déploiement - Correction des notes

## Problème actuel
Erreur 500 sur `/api/notes` - Les notes ne s'affichent pas

## Cause
Les données booléennes dans PostgreSQL sont stockées en INTEGER (0/1) au lieu de BOOLEAN (TRUE/FALSE)

## ✅ Solution AUTOMATIQUE (Recommandée)

La correction se fait **automatiquement au démarrage de Docker** !

### Déploiement avec Docker
```bash
cd /chemin/vers/noteflow
git pull origin claude/fix-notes-sync-issue-01AMeEdrKQErsM7bvhKkqEEF
docker-compose down
docker-compose up -d --build
```

Le conteneur Docker va automatiquement:
1. Attendre que PostgreSQL soit prêt
2. Exécuter les migrations de schéma
3. **Corriger automatiquement les types booléens** ✨
4. Démarrer le serveur

C'est tout ! Les notes s'afficheront correctement après le redémarrage.

---

## Solution manuelle (Si vous n'utilisez pas Docker)

### Étape 1 : Déployer le nouveau code
```bash
cd /chemin/vers/noteflow
git pull origin claude/fix-notes-sync-issue-01AMeEdrKQErsM7bvhKkqEEF
```

### Étape 2 : Exécuter le script de correction
```bash
# Option A: Script Node.js
node scripts/fix-boolean-data.js

# Option B: Script SQL (plus rapide)
psql -U noteflow -d noteflow -f scripts/fix-postgres-boolean-types.sql
```

### Étape 3 : Redémarrer le serveur
```bash
# Si vous utilisez PM2:
pm2 restart noteflow

# Si vous utilisez systemd:
sudo systemctl restart noteflow

# Ou simplement:
npm run start
```

### Étape 4 : Vérifier
Ouvrez https://note.ffnancy.fr et vérifiez que les notes s'affichent correctement.

## Alternative manuelle (SQL direct)

Si le script ne fonctionne pas, vous pouvez exécuter ces commandes SQL directement:

```sql
-- Se connecter à PostgreSQL
psql -U noteflow -d noteflow

-- Convertir les colonnes
ALTER TABLE users ALTER COLUMN is_admin TYPE BOOLEAN USING CASE WHEN is_admin = 0 THEN FALSE WHEN is_admin = 1 THEN TRUE ELSE is_admin::BOOLEAN END;
ALTER TABLE notes ALTER COLUMN archived TYPE BOOLEAN USING CASE WHEN archived = 0 THEN FALSE WHEN archived = 1 THEN TRUE ELSE archived::BOOLEAN END;
ALTER TABLE note_todos ALTER COLUMN completed TYPE BOOLEAN USING CASE WHEN completed = 0 THEN FALSE WHEN completed = 1 THEN TRUE ELSE completed::BOOLEAN END;
ALTER TABLE note_todos ALTER COLUMN priority TYPE BOOLEAN USING CASE WHEN priority = 0 THEN FALSE WHEN priority = 1 THEN TRUE ELSE priority::BOOLEAN END;
ALTER TABLE global_todos ALTER COLUMN completed TYPE BOOLEAN USING CASE WHEN completed = 0 THEN FALSE WHEN completed = 1 THEN TRUE ELSE completed::BOOLEAN END;
ALTER TABLE global_todos ALTER COLUMN priority TYPE BOOLEAN USING CASE WHEN priority = 0 THEN FALSE WHEN priority = 1 THEN TRUE ELSE priority::BOOLEAN END;
ALTER TABLE rss_feeds ALTER COLUMN enabled TYPE BOOLEAN USING CASE WHEN enabled = 0 THEN FALSE WHEN enabled = 1 THEN TRUE ELSE enabled::BOOLEAN END;
ALTER TABLE calendar_events ALTER COLUMN all_day TYPE BOOLEAN USING CASE WHEN all_day = 0 THEN FALSE WHEN all_day = 1 THEN TRUE ELSE all_day::BOOLEAN END;
```

## Commits déployés

- `616e257` - Correction initiale des types BOOLEAN
- `6f2f366` - Correction des champs INTEGER (priority, in_progress)
- `a8ebca6` - Ajout du script de correction des données

## Support

Si vous rencontrez des problèmes, vérifiez:
1. La connexion PostgreSQL fonctionne: `psql -U noteflow -d noteflow -c "SELECT 1"`
2. Le fichier .env contient bien DATABASE_URL
3. Les logs du serveur: `pm2 logs noteflow` ou `journalctl -u noteflow -f`
