FROM node:18-alpine

# Create app directory
WORKDIR /home/node/app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 2222

# Start the application
CMD ["node", "server.js"]