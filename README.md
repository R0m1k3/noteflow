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
- **Frontend** : HTML5/CSS3/JavaScript vanilla
- **Sécurité** : Helmet.js, rate limiting, validation des entrées
- **Logging** : Winston
- **Upload** : Multer
- **Container** : Docker + Docker Compose

## 🚀 Installation et Démarrage

### Prérequis
- Docker et Docker Compose installés
- Réseau Docker `nginx_default` (ou adapter dans docker-compose.yml)

### Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd noteflow
```

2. **Configurer les variables d'environnement**
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

3. **Builder et démarrer l'application**
```bash
docker-compose up -d --build
```

4. **Accéder à l'application**
```
http://localhost:2222
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

## 📝 Licence

MIT
