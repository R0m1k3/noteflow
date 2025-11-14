# 🔧 FIX DÉFINITIF - Décalage Horaire Google Calendar

## 🔍 Problème identifié

**Analyse approfondie effectuée:** Le décalage d'1 heure vient de la migration PostgreSQL qui utilisait `AT TIME ZONE 'UTC'` au lieu de `'Europe/Paris'`.

### Flux du problème:

```
Google Calendar (10h Paris avec offset +01:00)
    ↓
PostgreSQL stocke en TIMESTAMP (sans timezone) → "10:00:00"
    ↓
Migration: AT TIME ZONE 'UTC' ❌ (suppose que 10h est UTC)
    ↓
PostgreSQL traite comme: 10h UTC = 11h Paris
    ↓
Frontend affiche: 11h ❌ (décalage d'1h)
```

### Solution appliquée:

```
Google Calendar (10h Paris avec offset +01:00)
    ↓
Migration: DELETE les anciens événements ✅
    ↓
Migration: AT TIME ZONE 'Europe/Paris' ✅
    ↓
Nouvelle sync Google Calendar
    ↓
PostgreSQL TIMESTAMPTZ stocke correctement
    ↓
Frontend affiche: 10h ✅ (correct!)
```

---

## 🚀 ÉTAPES DE CORRECTION

### 1️⃣ Rebuild Docker (applique les corrections)

```bash
docker-compose build notes-app && docker-compose restart notes-app
```

**Attendez de voir dans les logs:**
```
🔄 Migration des timezones du calendrier...
📊 Types actuels: timestamp without time zone
🔄 Conversion en cours...
  🗑️  Suppression des événements existants
  ✅ X événements supprimés
  ✅ start_time → TIMESTAMPTZ
  ✅ end_time → TIMESTAMPTZ
✅ Migration terminée avec succès!
```

### 2️⃣ Resynchroniser Google Calendar

1. Ouvrez **http://localhost:2222**
2. Connectez-vous
3. Allez dans **Admin** → **Google Calendar**
4. Cliquez sur **🔄 Synchroniser**

**Résultat attendu:**
```
15 événements synchronisés
```

### 3️⃣ Vérifier les heures

Dans la box Calendrier, vérifiez que:
- Événement Google à 10h00 → NoteFlow affiche 10h00 ✅
- Événement Google à 15h30 → NoteFlow affiche 15h30 ✅
- Plus de décalage d'1h!

---

## 🔍 DIAGNOSTIC (si problème persiste)

Exécutez le script de diagnostic:

```bash
docker exec notes-todo-app node scripts/diagnose-calendar-timezone.js
```

**Ce script affichera:**
- ✅ Timezone PostgreSQL (devrait être UTC)
- ✅ Types de colonnes (TIMESTAMPTZ ou TIMESTAMP)
- ✅ Exemples de dates stockées (brut, UTC, Paris)
- ✅ Format renvoyé par le driver Node.js
- ⚠️ Recommandations si problème détecté

---

## 📊 Vérification manuelle PostgreSQL

### Vérifier les types de colonnes:

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'calendar_events'
    AND column_name IN ('start_time', 'end_time');
"
```

**Attendu:**
```
 column_name |          data_type
-------------+-----------------------------------
 end_time    | timestamp with time zone
 start_time  | timestamp with time zone
```

### Vérifier un exemple de date:

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "
  SELECT
    title,
    start_time,
    start_time AT TIME ZONE 'Europe/Paris' as heure_paris
  FROM calendar_events
  ORDER BY start_time ASC
  LIMIT 3;
"
```

**Vérifiez que `heure_paris` correspond à l'heure dans Google Calendar.**

---

## 🆘 Si le problème persiste

### Option 1: Suppression manuelle + resync

```bash
# Supprimer tous les événements
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "DELETE FROM calendar_events"

# Puis resynchroniser depuis l'interface web
```

### Option 2: Vérifier timezone serveur PostgreSQL

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "SHOW timezone"
```

**Devrait afficher:** `UTC` ou `Etc/UTC`

Si ce n'est pas UTC, définissez-le:

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "ALTER DATABASE noteflow SET timezone TO 'UTC'"
```

Puis redémarrez:

```bash
docker-compose restart postgres
docker-compose restart notes-app
```

### Option 3: Vérifier timezone navigateur

Le décalage pourrait venir du navigateur. Vérifiez:

```javascript
// Dans la console du navigateur (F12)
console.log(new Date().getTimezoneOffset());
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
```

**Attendu pour Paris:**
- `getTimezoneOffset()`: -60 (hiver) ou -120 (été)
- `timeZone`: "Europe/Paris"

---

## 📋 Checklist finale

Après rebuild et resync:

- [ ] Docker rebuild terminé sans erreur
- [ ] Migration timezone appliquée (voir logs)
- [ ] Événements supprimés et resynchronisés
- [ ] Colonnes en TIMESTAMPTZ (pas TIMESTAMP)
- [ ] Google Calendar synchronisé avec succès
- [ ] Heures affichées correspondent à Google Calendar
- [ ] Événements "toute la journée" affichés correctement
- [ ] Plus de décalage d'1h!

---

## 🎯 Résumé technique

### Avant (cassé):

```sql
-- Colonnes: TIMESTAMP (sans timezone)
start_time TIMESTAMP

-- Stockage: "2025-11-14 10:00:00" (ambigu)
-- Lecture: Traité comme UTC → affiché 11h Paris ❌
```

### Après (corrigé):

```sql
-- Colonnes: TIMESTAMPTZ (avec timezone)
start_time TIMESTAMPTZ

-- Stockage: "2025-11-14 10:00:00+01:00" → converti en "09:00:00Z UTC"
-- Lecture: "09:00:00Z UTC" → affiché 10h Paris ✅
```

### Commits appliqués:

- **70bc3e0**: Fix décalage horaire (TIMESTAMPTZ)
- **6b4137f**: Migration avec suppression données
- **e8de7eb**: Suppression branding login
- **f3e1eb1**: Timezone Europe/Paris + diagnostic ← **ACTUEL**

---

## 💡 Explication finale

**Pourquoi ça marchait pas?**
- Les anciennes données étaient en heure locale (Paris)
- La migration disait "c'est de l'UTC" (`AT TIME ZONE 'UTC'`)
- PostgreSQL stockait donc mal
- Frontend affichait avec décalage

**Pourquoi ça marche maintenant?**
- Migration dit "c'est de l'heure Paris" (`AT TIME ZONE 'Europe/Paris'`)
- Anciennes données supprimées
- Nouvelles syncs avec Google utilisent TIMESTAMPTZ correctement
- Les dates ont l'info timezone
- Frontend affiche correctement

---

**Date de création:** 2025-11-14
**Commit:** f3e1eb1 - Fix: Timezone Europe/Paris + diagnostic complet calendrier

**Rebuild Docker pour appliquer les corrections!** 🚀
