FROM node:18-alpine

# Switch to non-root user and set working directory
USER node
WORKDIR /home/node/app

# Create necessary directories
RUN mkdir -p /home/node/app/data /home/node/app/public/uploads

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./
RUN npm install

# Copy application files with correct ownership
COPY --chown=node:node . .

# Expose port
EXPOSE 2222

# Start the application
CMD ["node", "server.js"]