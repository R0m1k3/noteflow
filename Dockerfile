FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Create directories and set permissions
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/data /app/public/uploads

# Create an entrypoint script
RUN echo '#!/bin/sh\n\
mkdir -p /app/data\n\
mkdir -p /app/public/uploads\n\
chmod -R 777 /app/data\n\
chmod -R 777 /app/public/uploads\n\
exec node server.js' > /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER node

# Expose port
EXPOSE 2222

# Use the entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]