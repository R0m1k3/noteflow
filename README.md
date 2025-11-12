# 📝 NoteFlow - Application de Notes et Todo List

Application web moderne de gestion de notes et de tâches, Dockerisée, avec authentification JWT, interface utilisateur fluide et animations CSS natives.

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion JWT sécurisée avec bcrypt
- Session de 24 heures
- Gestion des utilisateurs par les administrateurs

### 📝 Gestion des Notes
- Création, édition et suppression de notes
- Support des images (upload, preview, suppression)
- Todos intégrés dans les notes
- Recherche en temps réel par titre/contenu
- Interface masonry layout responsive
- Animations fluides sur les interactions

### ✅ Todos Globaux
- Sidebar permanente avec quick tasks
- Création, modification, suppression de todos
- Toggle completed/active
- Filtres : Toutes / Actives / Terminées
- Compteur de tâches restantes

### 👥 Administration
- Gestion des utilisateurs (création, modification, suppression)
- Attribution des droits administrateur
- Interface dédiée pour les admins

## 🛠️ Stack Technique

- **Backend** : Node.js 20 + Express
- **Base de données** : SQLite3
- **Authentification** : JWT + bcrypt
- **Frontend** : React 19 + TypeScript + Vite
- **UI Components** : shadcn/ui + Tailwind CSS
- **Routing** : React Router v7
- **State Management** : TanStack Query (React Query)
- **Sécurité** : Helmet.js, rate limiting, validation des entrées
- **Logging** : Winston
- **Upload** : Multer
- **Container** : Docker + Docker Compose

## 🚀 Installation et Démarrage

### Prérequis
- Docker et Docker Compose installés
- Réseau Docker `nginx_default` (voir section ci-dessous)

### Installation

1. **Créer le réseau Docker externe**
```bash
docker network create nginx_default
```

2. **Cloner le repository**
```bash
git clone <repository-url>
cd noteflow
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditer le fichier `.env` :
```env
PORT=2222
JWT_SECRET=<générer_une_clé_secrète_forte>
NODE_ENV=production
```

**Générer un JWT_SECRET fort** :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4. **Builder et démarrer l'application**
```bash
docker-compose up -d --build
```

5. **Accéder à l'application**
```
http://localhost:2222
```

### Développement local

Pour développer localement sans Docker :

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement (frontend)
npm run dev

# Lancer le serveur backend
npm run server:dev

# Vérifier les types TypeScript (optionnel)
npm run typecheck
```

### Identifiants par défaut
```
Username: admin
Password: admin
```

**⚠️ IMPORTANT** : Changez immédiatement le mot de passe admin en production !

## 🐳 Commandes Docker

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Rebuild
docker-compose build

# Rebuild et redémarrer (après modifications)
docker-compose up -d --build

# Logs
docker-compose logs -f

# Backup base de données (depuis le volume Docker)
docker cp notes-todo-app:/app/data/notes.db ./backup_$(date +%Y%m%d).db

# Restore base de données
docker cp ./backup_YYYYMMDD.db notes-todo-app:/app/data/notes.db
docker-compose restart

# Lister les volumes Docker
docker volume ls | grep notes

# Inspecter un volume
docker volume inspect noteflow_notes_data

# Supprimer les volumes (⚠️ supprime toutes les données)
docker-compose down -v
```

## 🌐 Réseau Docker

L'application utilise un réseau Docker externe `nginx_default` qui doit être créé avant le déploiement.

### Créer le réseau (première fois uniquement)

```bash
docker network create nginx_default
```

### Utilisation avec Nginx ou autres services

Tous les services connectés au réseau `nginx_default` peuvent communiquer entre eux :

```bash
# Connecter d'autres containers au réseau
docker network connect nginx_default <container-name>

# Lister les containers connectés au réseau
docker network inspect nginx_default
```

## ⚙️ Configuration Nginx

```nginx
location /notes {
    proxy_pass http://notes-todo-app:2222;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10M;
}
```

## 📡 API Endpoints

### Authentification
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Utilisateurs (Admin)
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Notes
```
GET    /api/notes
POST   /api/notes
GET    /api/notes/:id
PUT    /api/notes/:id
DELETE /api/notes/:id
POST   /api/notes/:id/image
DELETE /api/notes/:id/image
GET    /api/search?q=query
```

### Todos Notes
```
POST   /api/notes/:id/todos
PUT    /api/notes/todos/:todoId
DELETE /api/notes/todos/:todoId
```

### Todos Globaux
```
GET    /api/todos
POST   /api/todos
PUT    /api/todos/:id
DELETE /api/todos/:id
```

## 🔒 Sécurité

- Bcrypt 12 rounds
- JWT expiration 24h
- Helmet.js
- Rate limiting
- Input validation
- File type whitelist
- SQL prepared statements

## 🔧 Dépannage

### Erreur "npm run build failed: exit code 2" lors du Docker build

Cette erreur survient lorsque la compilation TypeScript échoue pendant la construction de l'image Docker.

**Solution** :
Le build a été modifié pour utiliser directement Vite (qui gère TypeScript de manière plus permissive). Si vous rencontrez encore ce problème :
```bash
# Reconstruire l'image Docker
docker-compose build --no-cache
docker-compose up -d
```

Pour vérifier les erreurs TypeScript en développement :
```bash
npm run typecheck
```

### Erreur "network nginx_default declared as external, but could not be found"

Cette erreur survient lors du déploiement si le réseau Docker externe n'existe pas.

**Solution** :
Créez le réseau Docker externe avant de démarrer l'application :
```bash
docker network create nginx_default
docker-compose up -d --build
```

### Erreur "network nginx_default has incorrect label"

Cette erreur survient si le réseau existe déjà avec une configuration incompatible (par exemple créé par un autre docker-compose).

**Solution** :
Supprimez le réseau existant et recréez-le correctement :
```bash
# Arrêter tous les containers qui utilisent le réseau
docker-compose down

# Supprimer le réseau existant
docker network rm nginx_default

# Recréer le réseau
docker network create nginx_default

# Redémarrer l'application
docker-compose up -d --build
```

### Erreur "no such column: n.image_filename"

Cette erreur survient lorsque la base de données a été créée avec une ancienne version du schéma.

**Solution automatique (recommandée)** :
L'application détecte et ajoute automatiquement la colonne manquante au démarrage. Redéployez simplement :
```bash
docker-compose down
docker-compose up -d --build
```

**Solution manuelle** :
Si nécessaire, vous pouvez appliquer la migration manuellement :
```bash
docker exec notes-todo-app sh /app/migrations/run-migrations.sh
```

### Erreur de permissions sur les volumes Docker

Si vous rencontrez des erreurs SQLITE_CANTOPEN ou EACCES, recréez les volumes :
```bash
docker-compose down -v
docker-compose up -d --build
```
⚠️ Attention : Cela supprimera toutes les données existantes.

### L'application ne démarre pas

Vérifiez les logs :
```bash
docker-compose logs -f notes-todo-app
```

## 📝 Licence

MIT
