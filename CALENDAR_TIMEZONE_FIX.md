# Fix Décalage Horaire Calendrier

## Problème

Les événements du calendrier Google s'affichent avec 1 heure de décalage dans NoteFlow.

## Cause Racine

Le driver PostgreSQL (`pg`) convertit automatiquement les colonnes `TIMESTAMPTZ` en objets `Date` JavaScript, causant une double conversion de timezone:
1. Google Calendar → PostgreSQL (stockage en UTC)
2. PostgreSQL → JavaScript Date (conversion automatique en timezone locale)
3. Frontend → Affichage (nouvelle conversion)

## Solution Appliquée

### 1. Désactivation du parsing automatique (config/database.js)

```javascript
const { Pool, types } = require('pg');

// IMPORTANT: Désactiver le parsing automatique des TIMESTAMPTZ
types.setTypeParser(1184, function(stringValue) {
  return stringValue;  // Renvoie la string ISO au lieu d'un objet Date
});

const pool = new Pool({...});
```

### 2. Frontend avec timezone explicite (src/pages/Index.tsx)

```javascript
startDate.toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris'
})
```

## Procédure de Fix

### Étape 1: Diagnostic

Vérifier si le fix est actif:

```bash
node scripts/check-calendar-timezone.js
```

Ce script va vérifier:
- ✓ Si `start_time` est retourné comme `string` (bon)
- ✗ Si `start_time` est un `Date` object (mauvais - rebuild requis)

### Étape 2: Rebuild du Container (SI NÉCESSAIRE)

Si le diagnostic montre que les dates sont des `Date` objects:

```bash
# 1. Arrêter le container
docker-compose down

# 2. Rebuild SANS cache (important!)
docker-compose build --no-cache notes-app

# 3. Redémarrer
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f notes-app
```

### Étape 3: Resynchronisation

1. Ouvrir l'interface web NoteFlow
2. Aller dans Admin → Calendrier
3. Cliquer sur "Synchroniser avec Google Calendar"
4. Vérifier que les heures affichées sont correctes

### Étape 4: Si le problème persiste

Supprimer les événements et re-synchroniser:

```bash
# Se connecter à PostgreSQL
docker exec -it noteflow-postgres psql -U noteflow -d noteflow -p 5499

# Supprimer tous les événements
DELETE FROM calendar_events;

# Quitter
\q
```

Puis re-synchroniser depuis l'interface web.

## Vérification Finale

Comparer un événement dans Google Calendar et NoteFlow:

**Google Calendar:**
- Rendez-vous: 14:00

**NoteFlow (devrait afficher):**
- Rendez-vous: 14:00 ✓

**Si NoteFlow affiche:**
- Rendez-vous: 15:00 ✗ → Reprendre la procédure depuis l'étape 2

## Notes Techniques

### Types PostgreSQL

- `TIMESTAMP` - Sans timezone, stocke la valeur brute
- `TIMESTAMPTZ` - Avec timezone, stocke en UTC + timezone

### Type Parser ID

- `1184` = TIMESTAMPTZ (timestamp with time zone)
- `1114` = TIMESTAMP (timestamp without time zone)

### Timezone PostgreSQL

Par défaut, PostgreSQL utilise UTC:

```sql
SHOW timezone;
-- Résultat: UTC
```

### Timezone Node.js/Container

```bash
echo $TZ
# Si vide, Node.js utilise la timezone système (généralement UTC dans Docker)
```

### Format des Dates Google Calendar

Google Calendar API retourne:
- `event.start.dateTime`: `"2025-11-15T14:00:00+01:00"` (événement avec heure)
- `event.start.date`: `"2025-11-15"` (événement toute la journée)

Ces valeurs sont stockées telles quelles dans PostgreSQL TIMESTAMPTZ.

## Historique des Tentatives

1. ✗ Changed TIMESTAMP → TIMESTAMPTZ
2. ✗ Migration with 'AT TIME ZONE UTC'
3. ✗ Migration with 'AT TIME ZONE Europe/Paris'
4. ✗ Added timeZone: 'Europe/Paris' to frontend
5. ✓ **types.setTypeParser(1184)** - Solution finale

## Contact

Si le problème persiste après toutes ces étapes, vérifier:
1. Version de `pg` dans package.json
2. Logs backend pendant la récupération des événements
3. Network tab du navigateur pour voir les données brutes retournées par l'API
