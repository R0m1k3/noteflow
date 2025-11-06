FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build CSS
RUN npm run build:css

# Expose port
EXPOSE 2222

# Start the application
CMD ["npm", "start"]