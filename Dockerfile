FROM node:20-alpine

WORKDIR /home/node/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create necessary directories
RUN mkdir -p public/css/dist data public/uploads

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build CSS
RUN npm run build:css

# Set correct permissions
RUN chown -R node:node .

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production \
    PORT=2222

# Expose port
EXPOSE 2222

# Start the application
CMD ["npm", "start"]