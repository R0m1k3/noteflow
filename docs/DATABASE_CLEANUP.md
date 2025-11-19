# Purge Automatique de la Base de Données

Ce document décrit le système de purge automatique de la base de données NoteFlow.

## Vue d'ensemble

Le système de purge automatique supprime périodiquement les données obsolètes pour maintenir la base de données propre et performante. Il s'exécute automatiquement en arrière-plan et peut également être déclenché manuellement.

## Éléments Purgés

La purge supprime automatiquement :

1. **Flux RSS désactivés** - Tous les flux où `enabled = FALSE`
2. **Tâches complétées** - Tâches globales et de notes complétées depuis plus de 3 mois (par défaut)
3. **Notes archivées** - Notes archivées depuis plus de 6 mois (par défaut)
4. **Rendez-vous passés** - Rendez-vous terminés depuis plus de 6 mois (par défaut)

## Installation

### 1. Migration de la Base de Données

Avant d'utiliser le système de purge, vous devez exécuter la migration pour ajouter les champs de tracking nécessaires :

```bash
npm run db:migrate
```

Cette migration ajoute :
- `archived_at` à la table `notes`
- `completed_at` aux tables `global_todos` et `note_todos`
- `created_at` à la table `note_todos`
- Triggers automatiques pour mettre à jour ces dates

**Note:** La migration est idempotente et peut être exécutée plusieurs fois sans problème.

## Configuration

Le système de purge se configure via des variables d'environnement dans votre fichier `.env` ou `docker-compose.yml` :

```bash
# Activer/désactiver la purge automatique (défaut: true)
CLEANUP_ENABLED=true

# Intervalle entre les purges en heures (défaut: 24)
CLEANUP_INTERVAL_HOURS=24

# Délai avant suppression des tâches complétées en jours (défaut: 90)
CLEANUP_COMPLETED_TASKS_DAYS=90

# Délai avant suppression des notes archivées en jours (défaut: 180)
CLEANUP_ARCHIVED_NOTES_DAYS=180

# Délai avant suppression des rendez-vous passés en jours (défaut: 180)
CLEANUP_PAST_EVENTS_DAYS=180
```

### Exemple de configuration Docker Compose

```yaml
services:
  notes-app:
    environment:
      - CLEANUP_ENABLED=true
      - CLEANUP_INTERVAL_HOURS=24
      - CLEANUP_COMPLETED_TASKS_DAYS=90
      - CLEANUP_ARCHIVED_NOTES_DAYS=180
      - CLEANUP_PAST_EVENTS_DAYS=180
```

## Utilisation

### Purge Automatique

Le scheduler de purge démarre automatiquement avec l'application si `CLEANUP_ENABLED=true`.

- **Première exécution** : 1 minute après le démarrage de l'application
- **Exécutions suivantes** : Selon l'intervalle configuré (défaut: toutes les 24h)

Les logs de purge apparaissent dans les logs de l'application :

```
═══════════════════════════════════════════════════
🧹 DÉMARRAGE DU SCHEDULER DE PURGE AUTOMATIQUE
═══════════════════════════════════════════════════
Configuration:
  • Intervalle: toutes les 24 heure(s)
  • Tâches complétées: > 90 jours
  • Notes archivées: > 180 jours
  • Rendez-vous passés: > 180 jours
  • Première exécution: dans 60 secondes
═══════════════════════════════════════════════════
```

### Purge Manuelle via Script

#### Mode Simulation (Dry Run)

Pour voir ce qui serait supprimé **sans effectuer de suppression** :

```bash
npm run db:cleanup:dry-run
```

#### Purge Réelle

Pour exécuter la purge immédiatement :

```bash
npm run db:cleanup
```

**Dans Docker :**

```bash
# Simulation
docker-compose exec notes-app npm run db:cleanup:dry-run

# Purge réelle
docker-compose exec notes-app npm run db:cleanup
```

### Purge Manuelle via API

L'API admin permet de contrôler la purge depuis l'application.

**Important:** Toutes les routes API nécessitent une authentification admin.

#### 1. Prévisualiser la Purge

```http
GET /api/admin/cleanup/preview
```

**Paramètres de requête (optionnels) :**
- `completedTasksDays` - Délai pour les tâches (défaut: 90)
- `archivedNotesDays` - Délai pour les notes (défaut: 180)
- `pastEventsDays` - Délai pour les rendez-vous (défaut: 180)

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:2222/api/admin/cleanup/preview?completedTasksDays=60"
```

**Réponse :**
```json
{
  "success": true,
  "config": {
    "completedTasksDays": 60,
    "archivedNotesDays": 180,
    "pastEventsDays": 180
  },
  "preview": {
    "rssFeeds": 2,
    "globalTodos": 45,
    "noteTodos": 123,
    "archivedNotes": 8,
    "calendarEvents": 156,
    "total": 334
  }
}
```

#### 2. Exécuter la Purge

```http
POST /api/admin/cleanup
Content-Type: application/json

{
  "dryRun": false,
  "config": {
    "completedTasksDays": 90,
    "archivedNotesDays": 180,
    "pastEventsDays": 180
  }
}
```

**Paramètres :**
- `dryRun` (boolean, optionnel) - Mode simulation (défaut: false)
- `config` (object, optionnel) - Configuration personnalisée

**Exemple avec curl :**
```bash
# Simulation
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  http://localhost:2222/api/admin/cleanup

# Purge réelle
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}' \
  http://localhost:2222/api/admin/cleanup
```

**Réponse :**
```json
{
  "success": true,
  "dryRun": false,
  "config": {
    "completedTasksDays": 90,
    "archivedNotesDays": 180,
    "pastEventsDays": 180
  },
  "stats": {
    "rssFeeds": 2,
    "globalTodos": 45,
    "noteTodos": 123,
    "archivedNotes": 8,
    "calendarEvents": 156
  },
  "total": 334,
  "message": "Purge terminée avec succès: 334 élément(s) supprimés"
}
```

#### 3. Obtenir le Statut du Scheduler

```http
GET /api/admin/cleanup/status
```

**Réponse :**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "running": false,
    "scheduled": true,
    "config": {
      "intervalHours": 24,
      "completedTasksDays": 90,
      "archivedNotesDays": 180,
      "pastEventsDays": 180
    }
  }
}
```

#### 4. Obtenir les Statistiques de la Base de Données

```http
GET /api/admin/stats
```

**Réponse :**
```json
{
  "success": true,
  "stats": {
    "users": 3,
    "notes": 245,
    "archivedNotes": 18,
    "globalTodos": 67,
    "completedGlobalTodos": 142,
    "noteTodos": 456,
    "completedNoteTodos": 389,
    "rssFeeds": 12,
    "enabledFeeds": 10,
    "rssArticles": 1234,
    "calendarEvents": 245
  }
}
```

## Fonctionnement Technique

### Champs de Tracking

Le système utilise des champs de date automatiquement mis à jour par des triggers PostgreSQL :

- **`notes.archived_at`** - Date à laquelle la note a été archivée
- **`global_todos.completed_at`** - Date à laquelle la tâche a été complétée
- **`note_todos.completed_at`** - Date à laquelle la tâche a été complétée

### Triggers PostgreSQL

Des triggers automatiques mettent à jour ces dates :

```sql
-- Exemple pour les notes
CREATE TRIGGER trigger_notes_archived_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_notes_archived_at();
```

Lorsqu'une note passe de `archived = FALSE` à `archived = TRUE`, le trigger définit automatiquement `archived_at` à la date/heure actuelle.

### Suppressions en CASCADE

Les suppressions utilisent les contraintes `ON DELETE CASCADE` de PostgreSQL pour supprimer automatiquement les données liées :

- Supprimer une note supprime automatiquement :
  - Ses tâches (`note_todos`)
  - Ses images (`note_images`)
  - Ses fichiers (`note_files`)
  - Ses tags (`note_tags`)

- Supprimer un flux RSS supprime automatiquement :
  - Ses articles (`rss_articles`)

## Sécurité

- ✅ Toutes les routes API nécessitent une authentification admin
- ✅ Les transactions SQL utilisent des requêtes préparées (protection contre SQL injection)
- ✅ Les suppressions utilisent `BEGIN/COMMIT/ROLLBACK` pour garantir l'intégrité
- ✅ Mode simulation disponible pour tester sans risque

## Désactivation

Pour désactiver complètement la purge automatique :

```bash
# Dans .env ou docker-compose.yml
CLEANUP_ENABLED=false
```

Puis redémarrer l'application :

```bash
docker-compose restart notes-app
# ou
npm run start
```

## Dépannage

### La purge ne s'exécute pas

1. Vérifiez que `CLEANUP_ENABLED=true`
2. Vérifiez les logs de l'application :
   ```bash
   docker-compose logs -f notes-app
   ```
3. Vérifiez que la migration a été exécutée :
   ```bash
   npm run db:migrate
   ```

### Erreur "Column archived_at does not exist"

La migration n'a pas été exécutée. Lancez :

```bash
npm run db:migrate
```

### Voir les détails de la purge

Utilisez le mode simulation :

```bash
npm run db:cleanup:dry-run
```

Ou via l'API :

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  http://localhost:2222/api/admin/cleanup
```

## Recommandations

1. **Testez d'abord en simulation** - Utilisez `dryRun: true` ou `npm run db:cleanup:dry-run`
2. **Sauvegardez régulièrement** - Configurez des sauvegardes PostgreSQL automatiques
3. **Ajustez les délais** - Adaptez `CLEANUP_*_DAYS` selon vos besoins
4. **Surveillez les logs** - Vérifiez régulièrement les logs de purge
5. **Commencez conservateur** - Utilisez des délais plus longs au début (ex: 6 mois au lieu de 3)

## Support

Pour plus d'informations :
- Consultez les logs : `docker-compose logs notes-app`
- Vérifiez la configuration : `GET /api/admin/cleanup/status`
- Testez en simulation : `npm run db:cleanup:dry-run`
