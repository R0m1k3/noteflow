# Image de base Node.js 20 Alpine pour optimiser la taille
FROM node:20-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY components.json ./
COPY postcss.config.js ./
COPY tailwind.config.* ./
COPY eslint.config.js ./

# Installer TOUTES les dépendances (dev + prod)
RUN npm ci

# Copier le code source
COPY index.html ./
COPY src ./src

# Construire l'application React
RUN npm run build

# ========== Image de production ==========
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Installer SQLite
RUN apk add --no-cache sqlite

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances backend
# Note: On installe toutes les dépendances car package.json contient aussi les deps frontend
# mais seules les deps backend sont utilisées en runtime (express, sqlite3, bcrypt, etc.)
RUN npm ci

# Copier le code du serveur
COPY server.js ./
COPY config ./config
COPY routes ./routes
COPY middleware ./middleware
COPY services ./services
COPY migrations ./migrations

# Copier le build de l'application React depuis le builder
COPY --from=builder /app/dist ./dist

# Créer les dossiers nécessaires et définir les permissions
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app

# Utiliser l'utilisateur node pour la sécurité
USER node

# Exposer le port 2222
EXPOSE 2222

# Healthcheck pour vérifier que l'application fonctionne
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:2222/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Démarrer l'application
CMD ["node", "server.js"]
