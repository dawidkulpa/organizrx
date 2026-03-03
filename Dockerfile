# OrganizrX Docker Build
# Multi-stage build for Bun/TypeScript monorepo with Hono backend and React SPA

# Stage 1: Install dependencies
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy package files from monorepo structure
COPY package.json bun.lock* ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/

# Copy plugin package.json files for workspace resolution
COPY plugins/packages/plugin-plex/package.json ./plugins/packages/plugin-plex/
COPY plugins/packages/plugin-sonarr/package.json ./plugins/packages/plugin-sonarr/
COPY plugins/packages/plugin-radarr/package.json ./plugins/packages/plugin-radarr/
COPY plugins/packages/plugin-sabnzbd/package.json ./plugins/packages/plugin-sabnzbd/
COPY plugins/packages/plugin-overseerr/package.json ./plugins/packages/plugin-overseerr/
COPY plugins/packages/plugin-tautulli/package.json ./plugins/packages/plugin-tautulli/
COPY plugins/packages/plugin-jellyfin/package.json ./plugins/packages/plugin-jellyfin/
COPY plugins/packages/plugin-qbittorrent/package.json ./plugins/packages/plugin-qbittorrent/
COPY plugins/packages/plugin-emby/package.json ./plugins/packages/plugin-emby/
COPY plugins/packages/plugin-nzbget/package.json ./plugins/packages/plugin-nzbget/

# Install all dependencies (frozen lockfile if available)
RUN bun install --frozen-lockfile || bun install

# Stage 2: Build application
FROM deps AS build

WORKDIR /app

# Copy source code
COPY . .

# Build both server and web (server compiles to ESM, web uses Vite)
RUN bun run build

# Stage 3: Production runtime
FROM oven/bun:1-slim AS production

LABEL maintainer="OrganizrX" \
      description="OrganizrX Media Server Dashboard" \
      version="0.0.1"

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace packages needed at runtime
COPY --from=build /app/packages ./packages

# Copy plugin packages (discovered at runtime by plugin loader)
COPY --from=build /app/plugins/packages ./plugins/packages

# Copy built server artifacts
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/

# Copy built web SPA (static files)
# Note: The Hono server should serve these static files from /app/apps/web/dist
# Configure static file serving middleware to serve the SPA at the root or via a dedicated route
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Create volumes for persistent data
# /app/data - SQLite databases, backups, logs
# /app/config - Configuration files
VOLUME ["/app/data", "/app/config"]

# Set production environment
ENV NODE_ENV=production

# Expose server port (default 3001)
EXPOSE 3001

# Health check using Bun's fetch API
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run as non-root user
USER bun

# Start the server
CMD ["bun", "run", "apps/server/dist/index.js"]
