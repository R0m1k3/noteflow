# 🚨 Résolution : Erreur 400 - Accès bloqué Google OAuth

## L'erreur que vous voyez

```
Accès bloqué : erreur d'autorisation
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy
Error 400: invalid_request
```

## 🔍 Cause du problème

Cette erreur se produit quand votre **application OAuth est en mode "Testing"** dans Google Cloud Console et que l'utilisateur qui essaie de se connecter n'est pas dans la liste des testeurs autorisés.

## ✅ Solution complète (étape par étape)

### Option 1 : Ajouter l'utilisateur comme testeur (Solution rapide)

#### Étape 1 : Accéder à l'écran de consentement OAuth
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche : **APIs & Services** > **OAuth consent screen**

#### Étape 2 : Vérifier le statut de publication
Vous devriez voir :
```
Publishing status: Testing
```

#### Étape 3 : Ajouter des utilisateurs testeurs
1. Faites défiler jusqu'à la section **"Test users"**
2. Cliquez sur **"+ ADD USERS"**
3. Ajoutez l'adresse email : `michaelschal@gmail.com`
4. Cliquez sur **"SAVE"**

#### Étape 4 : Tester la connexion
1. Retournez sur NoteFlow
2. Dans **Administration** > **Google Calendar**
3. Cliquez sur **"Se connecter avec Google"**
4. ✅ Vous devriez maintenant pouvoir vous authentifier !

---

### Option 2 : Publier l'application (Solution permanente)

⚠️ **Attention** : Cette option est pour une utilisation publique. Si c'est pour un usage personnel, utilisez l'Option 1.

#### Étape 1 : Préparer l'application
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** > **OAuth consent screen**

#### Étape 2 : Compléter l'écran de consentement
Assurez-vous d'avoir rempli :
- ✅ App name (Nom de l'application) : `NoteFlow`
- ✅ User support email (Email de support)
- ✅ Developer contact information (Informations de contact)
- ✅ App logo (Optionnel mais recommandé)
- ✅ App domain (Domaine de l'application) : `note.ffnancy.fr`
- ✅ Authorized domains : `ffnancy.fr`

#### Étape 3 : Vérifier les Scopes (Permissions)
Dans l'onglet **"Scopes"**, assurez-vous d'avoir uniquement :
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
```

Ces scopes sont considérés comme "sensibles" mais **ne nécessitent PAS** de vérification Google pour un usage personnel.

#### Étape 4 : Publier l'application
1. Retournez sur l'onglet **"OAuth consent screen"**
2. Cliquez sur le bouton **"PUBLISH APP"**
3. Confirmez en cliquant sur **"CONFIRM"**

⚠️ **Note importante** :
- Votre app restera en status "In production" mais **"Not verified"**
- C'est **normal et acceptable** pour un usage personnel ou interne
- Les utilisateurs verront un avertissement mais pourront cliquer sur "Advanced" > "Go to NoteFlow (unsafe)" pour continuer
- Google ne nécessite une vérification que pour les apps publiques avec beaucoup d'utilisateurs

---

## 🔧 Vérifications supplémentaires

### 1. Vérifier l'URL de redirection

Dans **APIs & Services** > **Credentials** > Votre OAuth 2.0 Client ID :

L'URL de redirection doit être **EXACTEMENT** :
```
https://note.ffnancy.fr/api/calendar/oauth-callback
```

❌ **Erreurs courantes** :
- `https://note.ffnancy.fr/api/calendar/oauth-callback/` (slash à la fin)
- `http://note.ffnancy.fr/api/calendar/oauth-callback` (http au lieu de https)
- `https://www.note.ffnancy.fr/api/calendar/oauth-callback` (www en trop)

### 2. Vérifier l'API activée

Dans **APIs & Services** > **Library** :
1. Recherchez **"Google Calendar API"**
2. Vérifiez que le status est **"ENABLED"**
3. Si ce n'est pas le cas, cliquez sur **"ENABLE"**

### 3. Vérifier les credentials dans NoteFlow

Dans NoteFlow > **Administration** > **Google Calendar** :
1. Méthode d'authentification : **OAuth 2.0**
2. Client ID Google : Doit commencer par des chiffres et finir par `.apps.googleusercontent.com`
3. Client Secret : Doit commencer par `GOCSPX-`
4. URL du site : `https://note.ffnancy.fr` (automatiquement détectée)

---

## 📋 Résumé de la solution recommandée

### Pour un usage personnel (recommandé) :

```
1. Google Cloud Console > OAuth consent screen
2. Vérifier : Publishing status = Testing
3. Ajouter michaelschal@gmail.com dans "Test users"
4. SAVE
5. Retourner sur NoteFlow et se reconnecter
```

### Pour un usage public :

```
1. Compléter toutes les informations de l'écran de consentement
2. Publier l'application (PUBLISH APP)
3. Accepter que l'app soit "Not verified" (c'est normal)
4. Les utilisateurs devront cliquer sur "Advanced" > "Continue to NoteFlow"
```

---

## ❓ Questions fréquentes

### Pourquoi Google dit que mon app n'est pas conforme ?
En mode "Testing", seuls les utilisateurs testeurs listés peuvent accéder à l'application. C'est une mesure de sécurité de Google.

### Est-ce que je dois faire vérifier mon application par Google ?
**Non**, sauf si :
- Vous avez plus de 100 utilisateurs
- Vous publiez l'application publiquement
- Vous demandez des scopes sensibles en dehors du calendrier

Pour un usage personnel ou en petite équipe, le mode "Testing" avec des testeurs est suffisant.

### Combien de testeurs puis-je ajouter ?
Jusqu'à **100 testeurs** en mode "Testing". C'est largement suffisant pour un usage personnel ou une petite entreprise.

### L'authentification expire-t-elle ?
En mode "Testing", les tokens OAuth expirent après **7 jours**. En mode "Production", ils sont permanents (jusqu'à révocation).

---

## 🆘 Besoin d'aide ?

Si le problème persiste après avoir suivi ces étapes :
1. Vérifiez les logs de l'application : `docker-compose logs -f notes-todo-app`
2. Vérifiez que vous avez attendu 5-10 minutes après les changements dans Google Cloud Console
3. Essayez en navigation privée pour éliminer les problèmes de cache
4. Déconnectez-vous de Google Calendar dans NoteFlow et reconnectez-vous

---

## 📚 Documentation supplémentaire

- [Guide complet OAuth 2.0](./OAUTH_SETUP.md)
- [Configuration Google Calendar](./GUIDE_CONFIG_OAUTH.md)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
