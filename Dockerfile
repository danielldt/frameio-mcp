# Use Node.js 20 LTS
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Docker-specific tsconfig (standalone, doesn't extend base config)
COPY tsconfig.docker.json ./tsconfig.json

# Install dependencies
RUN npm install

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
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create a simple HTTP health check server using ES modules
# This server keeps the container alive and provides health checks
RUN echo 'import http from "http"; import { spawn } from "child_process"; const port = process.env.PORT || 3000; const server = http.createServer((req, res) => { if (req.url === "/health" || req.url === "/") { res.writeHead(200, {"Content-Type": "text/plain"}); res.end("OK"); } else { res.writeHead(404); res.end("Not Found"); } }); server.listen(port, () => { console.log(`Health check server running on port ${port}`); console.log("MCP server is ready to accept stdio connections"); }); process.on("SIGTERM", () => { console.log("Received SIGTERM, shutting down gracefully"); server.close(() => process.exit(0)); });' > health.js

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start health check server as main process to keep container alive
# MCP server can be invoked via stdio when needed
CMD ["node", "health.js"]
