FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy entrypoint script first
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Copy app source
COPY . .

# Create directories and set permissions
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/data /app/public/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 2222

# Use the entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]