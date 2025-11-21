# Système de Migrations Automatiques

Ce document décrit le système de migrations automatiques de NoteFlow.

## Vue d'ensemble

Le système de migrations automatiques s'exécute **à chaque démarrage de l'application** pour s'assurer que le schéma de la base de données est à jour. Cela permet de :

- ✅ Déployer automatiquement les changements de schéma
- ✅ Éviter les erreurs de "colonne inexistante"
- ✅ Simplifier le processus de mise à jour
- ✅ Garantir la cohérence entre le code et la base de données

## Comment ça fonctionne

### 1. Démarrage de l'application

Lors du démarrage, l'application exécute dans l'ordre :

```javascript
1. initDatabase()          // Crée les tables de base
2. autoMigrate()           // Applique les migrations manquantes
3. startSchedulers()       // Démarre les services
4. listen()                // Lance le serveur
```

### 2. Vérification intelligente

Le script `scripts/auto-migrate.js` vérifie pour chaque migration :

```sql
-- Est-ce que la colonne existe déjà ?
SELECT column_name
FROM information_schema.columns
WHERE table_name='ma_table' AND column_name='ma_colonne'
```

Si la colonne n'existe pas, elle est créée automatiquement.

### 3. Sécurité

- **Idempotent** : Les migrations peuvent être exécutées plusieurs fois sans problème
- **Transactionnel** : Utilise `BEGIN`/`COMMIT`/`ROLLBACK`
- **Non-bloquant** : En cas d'erreur, l'application démarre quand même (mais log l'erreur)
- **Double protection** : Le code API a aussi une rétrocompatibilité en cas d'échec

## Migrations actuelles

### Migration 1 : Champs de tracking pour purge

**Ajouté** : v1.1.0

**Objectif** : Permettre la purge automatique des données obsolètes

**Changements** :
- `notes.archived_at` - Date d'archivage d'une note
- `global_todos.completed_at` - Date de complétion d'une tâche globale
- `note_todos.completed_at` - Date de complétion d'une tâche de note
- `note_todos.created_at` - Date de création d'une tâche de note
- Triggers PostgreSQL pour mise à jour automatique

**Script manuel** (si besoin) :
```bash
npm run db:migrate
```

### Migration 2 : Champ priority pour tâches

**Ajouté** : v1.2.0

**Objectif** : Permettre de marquer les tâches importantes avec une étoile

**Changements** :
- `global_todos.priority` - Indicateur de priorité (BOOLEAN)
- `note_todos.priority` - Indicateur de priorité (BOOLEAN)
- Index pour optimiser le tri par priorité

**Script manuel** (si besoin) :
```bash
npm run db:migrate:priority
```

## Ajouter une nouvelle migration

Pour ajouter une nouvelle migration au système automatique :

### 1. Créer le script manuel (optionnel)

Créez un fichier dans `scripts/` pour permettre l'exécution manuelle :

```javascript
// scripts/add-mon-champ.js
#!/usr/bin/env node

const { Pool } = require('pg');
// ... votre migration
```

### 2. Ajouter au script auto-migrate.js

Éditez `scripts/auto-migrate.js` et ajoutez votre migration :

```javascript
// Migration 3: Votre nouvelle fonctionnalité
logger.info('  Vérification: mon nouveau champ...');

const monChampExists = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name='ma_table' AND column_name='mon_champ'
`);

if (monChampExists.rows.length === 0) {
  logger.info('  → Ajout du champ mon_champ à ma_table');
  await client.query(`ALTER TABLE ma_table ADD COLUMN mon_champ TYPE DEFAULT valeur`);

  // Mise à jour des données existantes si nécessaire
  await client.query(`UPDATE ma_table SET mon_champ = ... WHERE ...`);
}
```

### 3. Tester localement

```bash
# Démarrer l'application
npm run start

# Vérifier les logs
# Vous devriez voir : "✓ Migrations automatiques appliquées"

# Vérifier que le champ existe
psql $DATABASE_URL -c "\d ma_table"
```

### 4. Ajouter un script npm (optionnel)

Dans `package.json` :

```json
{
  "scripts": {
    "db:migrate:mon-feature": "node scripts/add-mon-champ.js"
  }
}
```

## Dépannage

### La migration ne s'exécute pas

**Vérifiez les logs au démarrage** :

```bash
docker logs noteflow-notes-app-1 | grep -i migration
```

Vous devriez voir :
```
✓ Base de données initialisée avec succès
🔄 Vérification des migrations...
  Vérification: champs de tracking pour purge...
  Vérification: champ priority pour tâches...
✅ Migrations automatiques terminées avec succès
✓ Migrations automatiques appliquées
```

### Erreur lors de la migration

Les erreurs de migration sont **loggées mais ne bloquent pas le démarrage** :

```
❌ Erreur lors des migrations automatiques: ...
✓ Scheduler RSS démarré
```

Pour corriger :

1. Identifiez l'erreur dans les logs
2. Corrigez le problème (droits, syntaxe SQL, etc.)
3. Redémarrez l'application

### Forcer une migration manuelle

Si vous préférez exécuter manuellement :

```bash
# Dans le conteneur Docker
docker exec -it noteflow-notes-app-1 node scripts/auto-migrate.js

# Ou avec npm
docker exec -it noteflow-notes-app-1 npm run db:migrate
docker exec -it noteflow-notes-app-1 npm run db:migrate:priority
```

### Vérifier l'état des migrations

Utilisez les commandes SQL directement :

```bash
docker exec -it noteflow-postgres-1 psql -U noteflow noteflow

-- Vérifier les colonnes d'une table
\d notes
\d global_todos
\d note_todos

-- Vérifier une colonne spécifique
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='global_todos';

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers;
```

## Bonnes pratiques

### ✅ À faire

- **Toujours** utiliser `IF NOT EXISTS` / `IF EXISTS`
- **Toujours** tester en local avant de déployer
- **Toujours** ajouter des logs explicites
- **Toujours** gérer la rétrocompatibilité dans le code
- **Toujours** utiliser des transactions (`BEGIN`/`COMMIT`)
- **Toujours** mettre à jour cette documentation

### ❌ À éviter

- Supprimer des colonnes directement (préférer un soft-delete)
- Modifier le type d'une colonne avec données
- Faire des migrations lourdes au démarrage (>5 secondes)
- Oublier les valeurs par défaut pour les colonnes existantes
- Crasher l'application en cas d'erreur de migration

## Architecture

```
📁 noteflow/
├── 📁 scripts/
│   ├── auto-migrate.js          ← Script principal (s'exécute au démarrage)
│   ├── add-cleanup-tracking-fields.js    ← Migration manuelle 1
│   ├── add-priority-field.js    ← Migration manuelle 2
│   └── ...                      ← Futures migrations
├── 📁 config/
│   └── database-postgres.js     ← Schéma initial (CREATE TABLE)
├── server.js                    ← Appelle autoMigrate() au démarrage
└── package.json                 ← Scripts npm pour migrations manuelles
```

## Flux de démarrage

```
┌─────────────────────────────────────────────────┐
│  docker-compose up / npm start                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  server.js: startServer()                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  initDatabase()                                 │
│  → Crée les tables de base (si n'existent pas)  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  autoMigrate()                                  │
│  → Vérifie et ajoute les colonnes manquantes   │
│  → Crée les triggers                            │
│  → Crée les index                               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Démarrage des services                         │
│  → RSS Scheduler                                │
│  → Cleanup Scheduler                            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  app.listen() - Serveur prêt ! 🚀              │
└─────────────────────────────────────────────────┘
```

## Support

Pour plus d'informations :
- Consultez les logs : `docker logs noteflow-notes-app-1`
- Exécutez manuellement : `node scripts/auto-migrate.js`
- Vérifiez la base : `psql $DATABASE_URL -c "\d"`
