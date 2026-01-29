# Use Node.js 20 LTS
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create a simple HTTP health check server
RUN echo 'const http = require("http"); const server = http.createServer((req, res) => { if (req.url === "/health" || req.url === "/") { res.writeHead(200, {"Content-Type": "text/plain"}); res.end("OK"); } else { res.writeHead(404); res.end("Not Found"); } }); const port = process.env.PORT || 3000; server.listen(port, () => console.log(`Health check server running on port ${port}`));' > health.js

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start health check server in background and MCP server in foreground
CMD node health.js & exec node dist/server.js
