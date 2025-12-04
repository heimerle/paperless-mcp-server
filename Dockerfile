FROM node:20-alpine

WORKDIR /app

# Copy all source files first
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies (skip prepare script, we'll build manually)
RUN npm ci --ignore-scripts

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set environment variables
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the server
CMD ["node", "dist/index.js"]
