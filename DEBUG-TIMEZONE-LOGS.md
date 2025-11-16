# 🔍 SYSTÈME DE LOGGING POUR DÉBUGUER LE TIMEZONE

Ce document explique comment utiliser le système de logging complet pour identifier le problème de décalage horaire.

## 📋 Logs ajoutés

### 1. **Parser PostgreSQL** (`config/database.js`)
Logs chaque conversion TIMESTAMPTZ → ISO string

### 2. **Synchronisation Google Calendar** (`routes/calendar.routes.js`)
Logs ce que Google renvoie et ce qui est stocké

### 3. **Récupération des événements** (`routes/calendar.routes.js`)
Logs ce qui est lu de la DB et envoyé au frontend

### 4. **Endpoint de diagnostic** (`GET /api/calendar/debug`)
Affiche un rapport complet du traitement

---

## 🚀 PROCÉDURE COMPLÈTE

### **ÉTAPE 1 : Rebuild avec les logs**

```bash
docker-compose down
docker-compose build --no-cache notes-app
docker-compose up -d
```

### **ÉTAPE 2 : Supprimer les anciens événements**

```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 \
  -c "DELETE FROM calendar_events"
```

### **ÉTAPE 3 : Activer les logs debug**

Suivre les logs en temps réel :

```bash
docker-compose logs -f notes-app
```

### **ÉTAPE 4 : Synchroniser avec Google Calendar**

1. Ouvrez http://localhost:2222
2. Allez dans Admin → Google Calendar
3. Cliquez sur "🔄 Synchroniser"

**Observez les logs** dans votre terminal :

```
[SYNC CALENDAR] Événement: "Dr Julian Wlodarczak"
[SYNC CALENDAR]   - Google startTime brut: {"dateTime":"2024-11-17T10:20:00+01:00"}
[SYNC CALENDAR]   - startTime extrait: "2024-11-17T10:20:00+01:00"
[SYNC CALENDAR]   - Type: string
[SYNC CALENDAR]   - new Date(startTime): 2024-11-17T09:20:00.000Z
[SYNC CALENDAR]   - Affichage Paris: 17/11/2024 10:20:00
```

**Puis le parser PostgreSQL** :

```
[PARSER TIMESTAMPTZ] Input avec TZ: "2024-11-17 09:20:00+00" → Output: "2024-11-17T09:20:00.000Z"
```

**OU**

```
[PARSER TIMESTAMPTZ] Input sans TZ: "2024-11-17 09:20:00" → ISO+Z: "2024-11-17T09:20:00Z" → Output: "2024-11-17T09:20:00.000Z"
```

### **ÉTAPE 5 : Récupérer les événements**

Rechargez la page NoteFlow et observez les logs :

```
[GET /events] "Dr Julian Wlodarczak"
[GET /events]   - start_time de la DB: "2024-11-17T09:20:00.000Z" (type: string)
[GET /events]   - new Date(): 2024-11-17T09:20:00.000Z
[GET /events]   - Affichage Paris: 10:20
```

### **ÉTAPE 6 : Utiliser l'endpoint de diagnostic**

Appelez l'endpoint de diagnostic pour voir un rapport complet :

```bash
curl -H "Authorization: Bearer VOTRE_TOKEN" \
  http://localhost:2222/api/calendar/debug | jq
```

**OU** avec le navigateur :

1. Ouvrez http://localhost:2222
2. Ouvrez la console développeur (F12)
3. Exécutez :
```javascript
fetch('/api/calendar/debug', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(console.log)
```

**Résultat attendu** :

```json
{
  "timestamp": "2024-11-17T...",
  "serverTimezone": "UTC",
  "postgresTimezone": "UTC",
  "sampleEvent": {
    "title": "Dr Julian Wlodarczak",
    "type_col": "timestamp with time zone",
    "start_time_raw": "2024-11-17T09:20:00.000Z",
    "start_time_type": "string",
    "start_text": "2024-11-17 09:20:00+00",
    "start_utc_formatted": "2024-11-17T09:20:00Z",
    "start_paris_formatted": "2024-11-17 10:20:00"
  },
  "parsing": {
    "input": "2024-11-17T09:20:00.000Z",
    "inputType": "string",
    "dateObject": "2024-11-17T09:20:00.000Z",
    "displayUTC": "Sun, 17 Nov 2024 09:20:00 GMT",
    "displayParis": "17/11/2024 10:20:00",
    "displayParisTime": "10:20"
  }
}
```

---

## 🔍 ANALYSE DES LOGS

### **Si tout est correct** :

1. Google renvoie : `"2024-11-17T10:20:00+01:00"` (10:20 Paris)
2. Conversion en UTC : `2024-11-17T09:20:00.000Z` (09:20 UTC)
3. PostgreSQL stocke : `2024-11-17 09:20:00+00` (09:20 UTC)
4. Parser renvoie : `"2024-11-17T09:20:00.000Z"`
5. Frontend affiche : `10:20` ✅

### **Si le décalage persiste** :

Cherchez dans les logs où la conversion échoue :

- ❌ **Google renvoie une heure incorrecte** → Problème API Google
- ❌ **Conversion UTC incorrecte** → Problème dans `new Date()`
- ❌ **PostgreSQL stocke mal** → Problème de timezone PostgreSQL
- ❌ **Parser renvoie mal** → Problème dans le parser
- ❌ **Frontend affiche mal** → Problème dans `toLocaleTimeString`

---

## 📊 COMMANDES UTILES

### Voir les logs en temps réel :
```bash
docker-compose logs -f notes-app
```

### Voir seulement les logs de timezone :
```bash
docker-compose logs -f notes-app | grep -E "\[SYNC CALENDAR\]|\[PARSER TIMESTAMPTZ\]|\[GET /events\]"
```

### Vérifier le timezone PostgreSQL :
```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "SHOW timezone"
```

### Voir les événements bruts dans PostgreSQL :
```bash
docker exec noteflow-postgres psql -U noteflow -d noteflow -p 5499 -c "
  SELECT
    title,
    start_time,
    start_time::text,
    start_time AT TIME ZONE 'Europe/Paris' as paris_time
  FROM calendar_events
  ORDER BY start_time DESC
  LIMIT 5
"
```

---

## 📝 RAPPORT À ENVOYER

Si le problème persiste, envoyez :

1. **Les logs de synchronisation** (ÉTAPE 4)
2. **Les logs de récupération** (ÉTAPE 5)
3. **Le résultat de l'endpoint debug** (ÉTAPE 6)
4. **Capture d'écran de NoteFlow** montrant le décalage
5. **Capture d'écran de Google Calendar** montrant l'heure correcte

Avec ces informations, je pourrai identifier EXACTEMENT où se produit le décalage.

---

## ⚠️ IMPORTANT

Les logs sont en mode `debug` et peuvent être volumineux. Pour production, pensez à :

1. Réduire le niveau de log
2. Ou désactiver les logs une fois le problème résolu
