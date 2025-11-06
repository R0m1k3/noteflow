FROM node:18-alpine

# Create app directory and set permissions
WORKDIR /home/node/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Create directories with proper permissions
RUN mkdir -p /home/node/app/data /home/node/app/public/uploads && \
    chown -R node:node /home/node/app && \
    chmod -R 777 /home/node/app/data /home/node/app/public/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 2222

# Start the application
CMD ["node", "server.js"]