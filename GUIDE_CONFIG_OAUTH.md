# 📋 Guide de Configuration Google Calendar - OAuth 2.0

## Votre fichier JSON

Vous avez reçu ce fichier JSON de Google Cloud Console :

```json
{
  "web": {
    "client_id": "123456789-abcdef.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxxxxxxxxxxxx",
    "redirect_uris": ["https://votre-domaine.com/api/calendar/oauth-callback"]
  }
}
```

## ✅ Configuration dans NoteFlow

### Étape 1 : Aller dans Administration
1. Cliquez sur votre profil en haut à droite
2. Cliquez sur "Administration"
3. Onglet "Google Calendar"

### Étape 2 : Sélectionner OAuth 2.0
- **Méthode d'authentification** : Sélectionnez **"OAuth 2.0"**

### Étape 3 : Entrer les informations
Extrayez les informations de votre JSON :

- **Client ID Google** : La valeur de `web.client_id` (commence par des chiffres et finit par `.apps.googleusercontent.com`)
- **Client Secret Google** : La valeur de `web.client_secret` (commence par `GOCSPX-`)

### Étape 4 : Vérifier l'URI de redirection
L'URI de redirection dans Google Cloud Console doit être **EXACTEMENT** :
```
https://note.ffnancy.fr/api/calendar/oauth-callback
```

✅ Dans votre JSON, c'est correct !

### Étape 5 : Sauvegarder et connecter
1. Cliquez sur **"Enregistrer"**
2. Cliquez sur **"Se connecter avec Google"**
3. Une popup s'ouvrira pour vous connecter à votre compte Google
4. Autorisez l'accès au calendrier
5. La popup se fermera automatiquement

### Étape 6 : Synchroniser
Une fois connecté :
- Le statut affichera "Connecté à Google Calendar (OAuth 2.0)"
- Cliquez sur **"Synchroniser"** pour récupérer vos événements

## ⚠️ IMPORTANT

### NE PAS utiliser :
- ❌ **API externe** : Cette option nécessite une clé API Google (qui ne fonctionne QUE pour les calendriers publics)
- ❌ **Service Account** : Cette option nécessite un fichier JSON différent avec `client_email`

### À utiliser :
- ✅ **OAuth 2.0** : C'est la méthode pour votre fichier JSON actuel

## 🐛 Dépannage

### Erreur "redirect_uri_mismatch"
Vérifiez que dans Google Cloud Console → OAuth 2.0 Client IDs → URIs de redirection autorisées, vous avez bien :
```
https://note.ffnancy.fr/api/calendar/oauth-callback
```

### Erreur "Not Found"
- Vous utilisez probablement l'option "API externe" au lieu de "OAuth 2.0"
- Changez pour "OAuth 2.0"

### La popup ne s'ouvre pas
- Vérifiez que votre navigateur n'a pas bloqué les popups
- Autorisez les popups pour note.ffnancy.fr

## 📝 Récapitulatif

1. **Méthode** : OAuth 2.0
2. **Client ID** : La valeur de `web.client_id` dans votre JSON
3. **Client Secret** : La valeur de `web.client_secret` dans votre JSON
4. **Enregistrer** → **Se connecter avec Google** → **Synchroniser**
