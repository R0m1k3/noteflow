# Configuration OAuth Google Calendar

Ce guide vous aide à résoudre les erreurs d'authentification OAuth Google.

## Problème : Erreur 400 - redirect_uri_mismatch

Cette erreur se produit quand l'URL de redirection configurée dans votre code ne correspond pas à celle configurée dans Google Cloud Console.

### Solution

#### 1. Identifier votre URL de redirection

Votre application utilise automatiquement :
```
{VOTRE_DOMAINE}/api/calendar/oauth-callback
```

Exemples :
- En local : `http://localhost:2222/api/calendar/oauth-callback`
- En production : `https://votredomaine.com/api/calendar/oauth-callback`

#### 2. Configurer la variable d'environnement APP_URL

Si vous utilisez un domaine personnalisé ou une URL différente de `http://localhost:2222` :

1. Créez un fichier `.env` à la racine du projet (copiez depuis `.env.example`) :
   ```bash
   cp .env.example .env
   ```

2. Modifiez la variable `APP_URL` dans le fichier `.env` :
   ```env
   # Pour un domaine local
   APP_URL=http://localhost:2222

   # Pour un domaine en production
   APP_URL=https://votredomaine.com

   # IMPORTANT : Pas de slash "/" à la fin !
   ```

3. Redémarrez l'application pour que les changements prennent effet.

#### 3. Configurer Google Cloud Console

1. Allez sur [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Sélectionnez votre projet

3. Cliquez sur votre "OAuth 2.0 Client ID"

4. Dans la section **"URIs de redirection autorisées"**, ajoutez EXACTEMENT l'URL affichée dans l'interface NoteFlow (panneau Administration > Google Calendar)

5. Cliquez sur **"Enregistrer"**

6. **Important** : Attendez quelques minutes que Google propage les changements (peut prendre 5-10 minutes)

#### 4. Tester la connexion

1. Dans NoteFlow, allez dans **Administration** > **Google Calendar**

2. Vérifiez que l'URL affichée dans l'encadré jaune correspond exactement à celle configurée dans Google Cloud Console

3. Cliquez sur **"Se connecter avec Google"**

4. Vous devriez maintenant voir un écran de sélection de compte Google

## Problème : Pas de choix du compte Google

### Solution

Ce problème a été corrigé dans le code. L'authentification utilise maintenant `prompt: 'select_account consent'` qui force l'affichage du sélecteur de compte Google.

Si vous ne voyez toujours pas le choix du compte :
1. Déconnectez-vous de Google Calendar dans NoteFlow
2. Effacez les cookies Google dans votre navigateur
3. Reconnectez-vous

## Vérification rapide

✅ Checklist :
- [ ] Fichier `.env` créé avec la bonne valeur pour `APP_URL`
- [ ] URL de redirection configurée dans Google Cloud Console (sans faute de frappe !)
- [ ] API Google Calendar activée dans Google Cloud Console
- [ ] Client ID et Client Secret enregistrés dans NoteFlow
- [ ] Application redémarrée après modification du `.env`
- [ ] Attendu 5-10 minutes après modification dans Google Cloud Console

## Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs de l'application pour des messages d'erreur détaillés
2. Assurez-vous que votre navigateur accepte les cookies tiers
3. Essayez en navigation privée pour éliminer les problèmes de cache
4. Vérifiez que l'API Google Calendar est bien activée dans votre projet Google Cloud
