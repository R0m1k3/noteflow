# 🔧 FIX TIMEZONE CALENDRIER - PROCÉDURE COMPLÈTE

## ⚠️ IMPORTANT: Cette procédure doit être suivie EXACTEMENT

Le décalage horaire persiste car le changement du parser PostgreSQL nécessite:
1. **REBUILD** de l'image Docker (pas juste restart!)
2. **SUPPRESSION** des événements synchronisés avant le fix
3. **RESYNCHRONISATION** avec Google Calendar

---

## 📋 ÉTAPE PAR ÉTAPE (À FAIRE DANS L'ORDRE!)

### ÉTAPE 1: Diagnostic initial (optionnel mais recommandé)

```bash
docker exec notes-todo-app node scripts/full-diagnosis-timezone.js
```

**Ce script montre:**
- Si le parser fonctionne (dates = strings ou objets Date)
- Comment PostgreSQL stocke les dates
- Comment l'API renvoie les dates
- Où se situe exactement le problème

**Si le diagnostic dit "Le driver pg renvoie toujours des objets Date":**
→ Le parser n'est PAS actif → Rebuild obligatoire

**Si le diagnostic dit "Le parser fonctionne!":**
→ Les anciennes données sont corrompues → Suppression + resync

---

### ÉTAPE 2: REBUILD COMPLET (OBLIGATOIRE!)

```bash
# Arrêter les containers
docker-compose down

# Rebuild l'image notes-app
docker-compose build --no-cache notes-app

# Redémarrer tout
docker-compose up -d
```

**⏱️ Durée: 2-3 minutes**

**Attendez que le serveur soit complètement démarré:**
```bash
docker-compose logs -f notes-app
```

Attendez de voir:
```
✓ Serveur NoteFlow démarré sur le port 2222
```

Puis appuyez sur **Ctrl+C**

---

### ÉTAPE 3: Suppression des événements corrompus

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "DELETE FROM calendar_events"
```

**Résultat attendu:**
```
DELETE 15
```
(ou le nombre d'événements que vous aviez)

**⚠️ C'est normal!** Les événements seront resynchronisés à l'étape suivante.

---

### ÉTAPE 4: Vérification du parser

```bash
docker exec notes-todo-app node scripts/full-diagnosis-timezone.js
```

**Vous devriez maintenant voir:**
```
✅ Le parser fonctionne!
   Les dates sont renvoyées comme strings
```

**Si vous voyez encore "objets Date":**
→ Le rebuild n'a pas fonctionné
→ Recommencez l'ÉTAPE 2 avec `--no-cache`

---

### ÉTAPE 5: Resynchronisation Google Calendar

1. Ouvrez **http://localhost:2222**
2. Connectez-vous
3. Allez dans **Admin** → **Google Calendar**
4. Cliquez sur **🔄 Synchroniser**

**Résultat attendu:**
```
15 événements synchronisés
```

---

### ÉTAPE 6: VÉRIFICATION FINALE

Dans la box **Rendez-vous** sur la page d'accueil:

**Comparez avec Google Calendar:**

| Google Calendar | NoteFlow (avant) | NoteFlow (après) |
|----------------|------------------|------------------|
| 10:00          | 11:00 ❌         | 10:00 ✅         |
| 14:30          | 15:30 ❌         | 14:30 ✅         |
| 09:15          | 10:15 ❌         | 09:15 ✅         |

**Les heures doivent être IDENTIQUES!**

---

## 🔍 SI LE PROBLÈME PERSISTE

### Test 1: Vérifier que le rebuild a bien été fait

```bash
# Voir la date de build de l'image
docker images | grep noteflow

# Vérifier les logs du build
docker-compose build notes-app 2>&1 | grep "types.setTypeParser"
```

### Test 2: Vérifier manuellement une date

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "
  SELECT
    title,
    start_time,
    start_time AT TIME ZONE 'Europe/Paris' as heure_paris
  FROM calendar_events
  ORDER BY start_time ASC
  LIMIT 1;
"
```

**Comparez `heure_paris` avec l'heure dans Google Calendar.**

### Test 3: Test direct JavaScript

```bash
docker exec notes-todo-app node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT start_time FROM calendar_events LIMIT 1')
  .then(r => {
    const val = r.rows[0]?.start_time;
    console.log('Type:', typeof val);
    console.log('Value:', val);
    if (typeof val === 'string') {
      console.log('✅ Parser OK - String');
    } else {
      console.log('❌ Parser KO - Objet Date');
    }
    pool.end();
  });
"
```

---

## 🆘 DÉPANNAGE

### Problème: "Le parser renvoie toujours des objets Date"

**Cause:** Le rebuild n'a pas pris en compte les changements

**Solution:**
```bash
docker-compose down
docker system prune -f
docker-compose build --no-cache --pull notes-app
docker-compose up -d
```

### Problème: "Les heures sont toujours décalées après resync"

**Cause:** Cache navigateur

**Solution:**
1. Ouvrez les DevTools (F12)
2. Onglet **Network** → Cocher **Disable cache**
3. Actualisez la page (Ctrl+F5 ou Cmd+Shift+R)
4. Videz le cache navigateur:
   - Chrome: Ctrl+Shift+Del
   - Firefox: Ctrl+Shift+Del
   - Edge: Ctrl+Shift+Del

### Problème: "Certains événements corrects, d'autres décalés"

**Cause:** Mélange d'événements avant/après le fix

**Solution:**
```bash
# Supprimer TOUS les événements
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "DELETE FROM calendar_events"

# Resynchroniser
# (depuis l'interface web)
```

---

## ✅ CHECKLIST FINALE

Cochez quand fait:

- [ ] ÉTAPE 1: Diagnostic initial effectué
- [ ] ÉTAPE 2: Rebuild complet avec `--no-cache`
- [ ] ÉTAPE 3: Événements supprimés (DELETE FROM)
- [ ] ÉTAPE 4: Diagnostic confirme "parser OK"
- [ ] ÉTAPE 5: Google Calendar resynchronisé
- [ ] ÉTAPE 6: Heures vérifiées = identiques à Google
- [ ] Cache navigateur vidé (Ctrl+F5)
- [ ] Aucun décalage horaire observé

---

## 🎯 RÉSUMÉ EN 4 COMMANDES

```bash
# 1. Rebuild complet
docker-compose down && docker-compose build --no-cache notes-app && docker-compose up -d

# 2. Attendre 30s
sleep 30

# 3. Supprimer événements
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "DELETE FROM calendar_events"

# 4. Puis resynchroniser Google Calendar depuis l'interface web
```

---

## 📊 POURQUOI CE FIX FONCTIONNE

**Avant (cassé):**
```
PostgreSQL → driver pg parse en Date object → décalage timezone
```

**Après (corrigé):**
```
PostgreSQL → driver pg renvoie string ISO → frontend parse avec bon timezone
```

**La clé:** `types.setTypeParser(1184, str => str)`

Ce parser transforme les TIMESTAMPTZ PostgreSQL en strings ISO au lieu d'objets Date, ce qui permet au frontend de gérer correctement le timezone avec `timeZone: 'Europe/Paris'`.

---

**Commit:** 1a68d87 - Fix: Désactivation parsing Date PostgreSQL
**Date:** 2025-11-14

**Si vous suivez cette procédure EXACTEMENT, le problème SERA résolu!** 🎉
