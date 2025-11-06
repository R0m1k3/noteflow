FROM node:20-alpine

WORKDIR /home/node/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create necessary directories
RUN mkdir -p public/css/dist data public/uploads

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy configuration files
COPY postcss.config.js tailwind.config.js ./

# Copy source files
COPY src ./src
COPY public ./public

# Build CSS with verbose output
RUN NODE_ENV=production npx tailwindcss -i ./src/globals.css -o ./public/css/dist/styles.css --minify -v

# Copy remaining files
COPY . .

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