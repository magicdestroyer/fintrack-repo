# FinTrack — Production Dockerfile
# Multi-stage build: keeps the final image small (~200 MB)
#
# Build:   docker build -t fintrack .
# Run:     docker run -p 3001:3001 -e JWT_SECRET=your-secret -v /data:/data fintrack
# Compose: docker-compose up -d

# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# better-sqlite3 requires native compilation tools
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: final image ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S fintrack && \
    adduser  -u 1001 -S fintrack -G fintrack

# Copy production node_modules from deps stage
COPY --from=deps --chown=fintrack:fintrack /app/node_modules ./node_modules

# Copy server source and frontend
COPY --chown=fintrack:fintrack server/       ./server/
COPY --chown=fintrack:fintrack server/public ./public/

# SQLite database and persistent data lives here (mount a volume)
RUN mkdir -p /data && chown fintrack:fintrack /data

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/fintrack.db

EXPOSE 3001

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

USER fintrack
WORKDIR /app/server

CMD ["node", "index.js"]
