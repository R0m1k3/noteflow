FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Create necessary directories with correct permissions
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app/data /app/public/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 2222

# Start the app
CMD ["node", "server.js"]