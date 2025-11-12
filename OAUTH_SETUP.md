# Configuration Google Calendar

Ce guide vous aide à configurer l'accès à Google Calendar avec deux méthodes disponibles : **OAuth 2.0** et **Service Account**.

## Choisir la bonne méthode

### OAuth 2.0 (Recommandé pour usage personnel)
- ✅ Accès au calendrier personnel de l'utilisateur
- ✅ Sécurisé avec consentement explicite
- ✅ Choix du compte Google à la connexion
- ⚠️ Nécessite une interaction utilisateur (popup de consentement)

### Service Account (Pour applications automatisées)
- ✅ Aucune interaction utilisateur requise
- ✅ Idéal pour calendriers partagés en entreprise
- ✅ Fonctionne en arrière-plan
- ⚠️ Nécessite de partager le calendrier avec le Service Account
- ⚠️ Configuration plus technique

---

# Configuration OAuth 2.0

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

---

# Configuration Service Account

Le Service Account permet un accès automatisé sans interaction utilisateur, idéal pour des calendriers partagés.

## Étapes de configuration

### 1. Créer un Service Account

1. Allez sur [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

2. Sélectionnez votre projet (ou créez-en un nouveau)

3. Cliquez sur **"+ CREATE SERVICE ACCOUNT"**

4. Donnez un nom au compte (ex: `noteflow-calendar`)

5. Cliquez sur **"CREATE AND CONTINUE"**

6. Sautez les étapes optionnelles et cliquez sur **"DONE"**

### 2. Générer une clé JSON

1. Dans la liste des Service Accounts, cliquez sur celui que vous venez de créer

2. Allez dans l'onglet **"KEYS"**

3. Cliquez sur **"ADD KEY"** > **"Create new key"**

4. Choisissez le format **JSON**

5. Téléchargez le fichier JSON (conservez-le en sécurité !)

### 3. Activer l'API Google Calendar

1. Allez sur [Google Cloud Console - API Library](https://console.cloud.google.com/apis/library)

2. Recherchez **"Google Calendar API"**

3. Cliquez sur **"ENABLE"**

### 4. Partager votre calendrier

1. Ouvrez [Google Calendar](https://calendar.google.com)

2. Trouvez votre calendrier dans la liste à gauche

3. Cliquez sur les **3 points** à côté du nom du calendrier

4. Sélectionnez **"Paramètres et partage"**

5. Faites défiler jusqu'à **"Partager avec des personnes en particulier"**

6. Cliquez sur **"+ Ajouter des personnes"**

7. Collez l'**email du Service Account** (trouvé dans le fichier JSON, champ `client_email`)

8. Donnez les permissions **"Afficher tous les détails des événements"**

9. Cliquez sur **"Envoyer"**

### 5. Configurer NoteFlow

1. Dans NoteFlow, allez dans **Administration** > **Google Calendar**

2. Sélectionnez **"Service Account"** dans le menu déroulant

3. Ouvrez le fichier JSON téléchargé et **copiez tout son contenu**

4. Collez le contenu dans le champ **"Clé Service Account (JSON)"**

5. Entrez votre email (celui du calendrier partagé) dans **"Email du calendrier à synchroniser"**

6. Cliquez sur **"Enregistrer"**

7. Cliquez sur **"Synchroniser"** pour tester

## Dépannage Service Account

### Erreur : "Clé Service Account invalide"
- Vérifiez que vous avez copié l'intégralité du fichier JSON
- Assurez-vous qu'il n'y a pas d'espaces ou de caractères en trop

### Erreur : "Calendar not found" ou "Permission denied"
- Vérifiez que vous avez bien partagé le calendrier avec l'email du Service Account
- Vérifiez que l'email du calendrier est correct
- Attendez quelques minutes après avoir partagé le calendrier

### Les événements ne se synchronisent pas
- Vérifiez que l'API Google Calendar est activée dans votre projet
- Vérifiez les logs de l'application pour plus de détails
- Assurez-vous que le Service Account a les bonnes permissions

---

## Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs de l'application pour des messages d'erreur détaillés
2. Pour OAuth 2.0 : Assurez-vous que votre navigateur accepte les cookies tiers
3. Pour OAuth 2.0 : Essayez en navigation privée pour éliminer les problèmes de cache
4. Vérifiez que l'API Google Calendar est bien activée dans votre projet Google Cloud
5. Pour Service Account : Vérifiez que le calendrier est bien partagé avec le bon email
