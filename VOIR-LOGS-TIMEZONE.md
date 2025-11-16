# 🔍 VOIR LES LOGS DE TIMEZONE DIRECTEMENT DANS VOTRE NAVIGATEUR

Ce système vous permet de voir en temps réel ce qui se passe avec les dates, **sans avoir besoin d'accès aux logs Docker**.

---

## 🚀 COMMENT UTILISER

### **ÉTAPE 1 : Rebuild et redémarrage**

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

### **ÉTAPE 3 : Ouvrir la page de logs**

Ouvrez votre navigateur et allez sur :

```
http://localhost:2222/api/timezone-logs/html
```

**Laissez cette page ouverte** dans un onglet.

### **ÉTAPE 4 : Synchroniser avec Google Calendar**

1. Dans un autre onglet, ouvrez http://localhost:2222
2. Allez dans **Admin** → **Google Calendar**
3. Cliquez sur **🔄 Synchroniser**

### **ÉTAPE 5 : Regarder les logs apparaître**

Retournez sur l'onglet des logs (`/api/timezone-logs/html`) et vous verrez :

- 🟣 **SYNC** : Ce que Google Calendar renvoie
- 🟠 **PARSER** : Comment PostgreSQL parse les dates
- 🟢 **GET** : Ce qui est envoyé au frontend

---

## 📊 FONCTIONNALITÉS DE LA PAGE DE LOGS

### **Boutons en haut** :

- **🔄 Rafraîchir** : Recharger la page pour voir les nouveaux logs
- **🗑️ Vider les logs** : Supprimer tous les logs
- **⏱️ Auto-refresh** : Activer le rafraîchissement automatique toutes les 3 secondes
- **Filtres** : Afficher seulement les logs d'une catégorie (Tous, Sync, Parser, Get)

### **Statistiques affichées** :

- Total de logs
- Nombre de logs par catégorie

### **Chaque log affiche** :

- ⏰ Timestamp (date et heure exacte)
- 🏷️ Catégorie (SYNC, PARSER, GET)
- 📝 Message descriptif
- 📦 Données JSON (si disponibles)

---

## 🔍 EXEMPLE DE LOGS ATTENDUS

### **Lors de la synchronisation** :

```
[SYNC] 📅 Événement: "Dr Julian Wlodarczak"
{
  "googleStartBrut": {
    "dateTime": "2024-11-17T10:20:00+01:00"
  },
  "startTimeExtrait": "2024-11-17T10:20:00+01:00",
  "type": "string",
  "isAllDay": false
}

[SYNC] → Conversion: new Date("2024-11-17T10:20:00+01:00") = 2024-11-17T09:20:00.000Z
{
  "affichageParis": "17/11/2024 10:20:00",
  "heureParisSeule": "10:20"
}
```

### **Lors du parsing PostgreSQL** :

```
[PARSER] Input sans TZ: "2024-11-17 09:20:00" → ISO+Z: "2024-11-17T09:20:00Z" → Output: "2024-11-17T09:20:00.000Z"
```

### **Lors de l'envoi au frontend** :

```
[GET] 📤 Envoi au frontend: "Dr Julian Wlodarczak"
{
  "start_time_DB": "2024-11-17T09:20:00.000Z",
  "type": "string"
}

[GET] → Frontend recevra: 2024-11-17T09:20:00.000Z
{
  "apresNewDate": "2024-11-17T09:20:00.000Z",
  "affichageParisAttendu": "10:20"
}
```

---

## ✅ CE QU'IL FAUT VÉRIFIER

Dans les logs, vérifiez que :

1. ✅ **Google renvoie** : `"2024-11-17T10:20:00+01:00"` (10:20 heure de Paris)
2. ✅ **Conversion UTC** : `2024-11-17T09:20:00.000Z` (09:20 UTC = 10:20 Paris)
3. ✅ **PostgreSQL stocke** : `"2024-11-17 09:20:00"` (09:20 UTC)
4. ✅ **Parser normalise** : `"2024-11-17T09:20:00.000Z"`
5. ✅ **Frontend reçoit** : `"2024-11-17T09:20:00.000Z"`
6. ✅ **Affichage attendu** : `"10:20"`

---

## 🎨 COULEURS DANS L'INTERFACE

- 🟣 **Violet** : Logs de synchronisation (SYNC)
- 🟠 **Orange** : Logs du parser PostgreSQL (PARSER)
- 🟢 **Vert** : Logs d'envoi au frontend (GET)

---

## 📱 ACCESSIBLE DEPUIS PORTAINER

Si vous utilisez Portainer :

1. Ouvrez Portainer
2. Cliquez sur votre container `notes-app`
3. Dans le navigateur, allez sur : `http://localhost:2222/api/timezone-logs/html`

Vous pouvez aussi accéder à la page depuis **n'importe quel appareil** sur le même réseau :

```
http://VOTRE_IP:2222/api/timezone-logs/html
```

---

## 🆘 SI VOUS VOYEZ UN DÉCALAGE

Prenez une **capture d'écran de la page de logs** et cherchez :

- ❌ Où l'heure change de 10:20 à 11:20
- ❌ Quelle étape cause le décalage (SYNC, PARSER, ou GET)

Envoyez-moi la capture et je pourrai corriger le problème exact.

---

## 🔄 AUTRES ENDPOINTS DISPONIBLES

### **Logs en JSON** :
```
GET http://localhost:2222/api/timezone-logs
```

### **Vider les logs** :
```
POST http://localhost:2222/api/timezone-logs/clear
```

### **Logs d'une catégorie** :
```
GET http://localhost:2222/api/timezone-logs/category/SYNC
GET http://localhost:2222/api/timezone-logs/category/PARSER
GET http://localhost:2222/api/timezone-logs/category/GET
```

---

## 💡 ASTUCE

Activez l'**Auto-refresh** pour voir les logs apparaître en temps réel pendant que vous synchronisez !
