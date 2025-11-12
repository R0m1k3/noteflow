# Google Calendar - Deux méthodes d'authentification

NoteFlow supporte maintenant **deux méthodes** pour se connecter à Google Calendar :

## 🔐 OAuth 2.0 (Recommandé pour usage personnel)
**Avantages** :
- Accès sécurisé à votre calendrier personnel
- Choix du compte Google lors de la connexion
- Consentement explicite de l'utilisateur

**Utilisation** : Administration > Google Calendar > Méthode : OAuth 2.0

[📖 Guide complet OAuth 2.0](./OAUTH_SETUP.md#configuration-oauth-20)

---

## 🤖 Service Account (Pour automatisation)
**Avantages** :
- Aucune interaction utilisateur requise
- Parfait pour calendriers partagés en entreprise
- Fonctionne en arrière-plan automatiquement

**Utilisation** : Administration > Google Calendar > Méthode : Service Account

[📖 Guide complet Service Account](./OAUTH_SETUP.md#configuration-service-account)

---

## Problèmes courants résolus

### ✅ Erreur 400 : redirect_uri_mismatch
- Variable `APP_URL` ajoutée dans `.env.example`
- Guide de configuration détaillé dans OAUTH_SETUP.md

### ✅ Pas de choix de compte Google
- Le prompt `select_account` force maintenant l'affichage du sélecteur

### ✅ Besoin d'accès automatisé sans popup
- Utilisez Service Account pour une authentification sans interaction

---

## Configuration rapide

### Pour OAuth 2.0 :
1. Créez `.env` avec `APP_URL=http://localhost:2222`
2. Configurez OAuth 2.0 dans Google Cloud Console
3. Dans NoteFlow : Administration > Google Calendar > OAuth 2.0
4. Ajoutez Client ID et Client Secret
5. Cliquez sur "Se connecter avec Google"

### Pour Service Account :
1. Créez un Service Account sur Google Cloud Console
2. Téléchargez la clé JSON
3. Partagez votre calendrier avec l'email du Service Account
4. Dans NoteFlow : Administration > Google Calendar > Service Account
5. Collez le JSON et l'email du calendrier
6. Cliquez sur "Synchroniser"

---

## Documentation complète

📚 Consultez [OAUTH_SETUP.md](./OAUTH_SETUP.md) pour :
- Guide pas à pas complet
- Résolution des erreurs
- Checklist de vérification
- Conseils de dépannage
