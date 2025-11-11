# Image de base Node.js 20 Alpine pour optimiser la taille
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Installer SQLite
RUN apk add --no-cache sqlite

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production

# Copier le code source
COPY . .

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