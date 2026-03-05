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

# Copy ALL plugin package.json files for workspace resolution
# Uses a temporary full copy + find to extract only package.json files,
# keeping the layer cache effective for dependency installs.
COPY plugins/packages/ /tmp/plugins/
RUN mkdir -p ./plugins/packages && \
    cd /tmp/plugins && \
    for dir in */; do \
      if [ -f "${dir}package.json" ]; then \
        mkdir -p /app/plugins/packages/${dir} && \
        cp ${dir}package.json /app/plugins/packages/${dir}; \
      fi; \
    done && \
    rm -rf /tmp/plugins

# Install all dependencies (frozen lockfile if available)
RUN bun install --frozen-lockfile || bun install

# Stage 2: Build frontend SPA (Vite)
FROM deps AS build

WORKDIR /app

# Copy source code
COPY . .

# Build the React SPA with Vite (server runs from TS source via Bun)
RUN bun run build:web
# Stage 3: Production runtime
FROM oven/bun:1-slim AS production

LABEL maintainer="OrganizrX" \
      description="OrganizrX Media Server Dashboard" \
      version="0.0.1"

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace-specific node_modules for Bun resolution
# Bun resolves imports relative to the workspace package.json,
# so apps/server/node_modules must exist with its symlinks.
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Copy workspace packages needed at runtime
COPY --from=build /app/packages ./packages

# Copy plugin packages (discovered at runtime by plugin loader)
COPY --from=build /app/plugins/packages ./plugins/packages

# Copy server source (Bun runs TypeScript natively — no bundling needed)
COPY --from=build /app/apps/server/src ./apps/server/src
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/tsconfig.json ./apps/server/

# Copy root package.json + tsconfig for workspace resolution
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./

# Copy built web SPA (static files served by Hono)
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
CMD ["bun", "run", "apps/server/src/index.ts"]
