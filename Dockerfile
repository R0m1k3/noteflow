FROM node:20-alpine

WORKDIR /home/node/app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build CSS
RUN npm run build:css

# Create data and uploads directories
RUN mkdir -p data public/uploads && \
    chown -R node:node .

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production \
    PORT=2222

# Expose port
EXPOSE 2222

# Start the application
CMD ["npm", "start"]