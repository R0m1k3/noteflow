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

# Expose port
EXPOSE 2222

# Start the app
CMD ["node", "server.js"]