# ==============================================================================
# aMaze Behavioral Neuroscience Suite - Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build the Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy all source files
COPY . .

# Build production frontend bundle into /app/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend server code
COPY server ./server

# Create persistent storage directories for data, uploads and trials
RUN mkdir -p /app/data/uploads /app/data/trials /app/logs

# Persistent volume for trials, projects, videos and database
VOLUME ["/app/data"]

# Expose default HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server/index.mjs"]
