# Scripts de correction PostgreSQL

## Problème: Notes ne s'affichent pas (Erreur 500)

Si vous voyez une erreur 500 sur `/api/notes` après la migration vers PostgreSQL, c'est probablement dû à un problème de conversion des données booléennes.

### Cause

Lors de la migration de SQLite vers PostgreSQL:
- SQLite stocke les booléens comme INTEGER (0/1)
- PostgreSQL utilise le type BOOLEAN (TRUE/FALSE)
- Si les données ont été migrées sans conversion, les valeurs restent en INTEGER
- Les requêtes SQL qui utilisent `completed = TRUE` échouent

### Solution

Exécutez le script de correction sur votre base de données de production:

```bash
# Sur le serveur de production
cd /path/to/noteflow
node scripts/fix-boolean-data.js
```

Ce script va:
1. Se connecter à votre base PostgreSQL
2. Vérifier les types des colonnes booléennes
3. Convertir les colonnes INTEGER en BOOLEAN si nécessaire
4. Convertir automatiquement les valeurs 0/1 en FALSE/TRUE

### Colonnes concernées

- `users.is_admin`
- `notes.archived`
- `note_todos.completed`, `note_todos.priority`
- `global_todos.completed`, `global_todos.priority`
- `rss_feeds.enabled`
- `calendar_events.all_day`

### Variables d'environnement

Le script utilise `DATABASE_URL` de votre fichier `.env`:

```env
DATABASE_URL=postgresql://noteflow:password@localhost:5499/noteflow
```

### Migration future

Le script `migrate-sqlite-to-postgres.js` a été amélioré pour convertir automatiquement les booléens lors des futures migrations. Vous n'aurez plus besoin d'exécuter `fix-boolean-data.js` après de nouvelles migrations.

### Vérification

Après l'exécution du script, redémarrez votre serveur et vérifiez que les notes s'affichent correctement.

```bash
pm2 restart noteflow
# ou
systemctl restart noteflow
```
