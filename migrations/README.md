# Migrations de base de données

Ce dossier contient les scripts de migration SQL pour mettre à jour le schéma de la base de données.

## Utilisation

### Méthode 1 : Exécuter dans le container Docker

```bash
# Copier le script dans le container
docker cp migrations/run-migrations.sh notes-todo-app:/app/

# Exécuter la migration
docker exec notes-todo-app sh /app/run-migrations.sh
```

### Méthode 2 : Manuellement avec sqlite3

```bash
# Se connecter au container
docker exec -it notes-todo-app sh

# Exécuter la migration SQL
sqlite3 /app/data/notes.db < /path/to/migration.sql
```

### Méthode 3 : Recréer la base de données (⚠️ perte de données)

```bash
docker-compose down -v
docker-compose up -d --build
```

## Liste des migrations

- **001_add_image_filename.sql** : Ajoute la colonne `image_filename` à la table `notes`
