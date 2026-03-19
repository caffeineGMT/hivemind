FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy UI package files
COPY ui/package*.json ./ui/

# Install UI dependencies and build
WORKDIR /app/ui
RUN npm ci && npm run build

# Copy application code
WORKDIR /app
COPY . .

# Create directory for persistent data
RUN mkdir -p /app/data

# Expose the server port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "bin/hivemind.js", "server"]
