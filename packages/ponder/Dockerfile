FROM node:20-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Enable corepack with correct yarn version
RUN corepack enable && corepack prepare yarn@3.2.3 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Copy yarn configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY .yarn/plugins ./.yarn/plugins

# Copy workspace package.json files
COPY packages/ponder/package.json ./packages/ponder/
COPY packages/nextjs/package.json ./packages/nextjs/
COPY packages/foundry/package.json ./packages/foundry/

# Install dependencies (skip husky and lifecycle scripts)
ENV HUSKY=0
RUN yarn install --mode=skip-build

# Copy source files needed for Ponder
COPY packages/ponder ./packages/ponder
COPY packages/nextjs/contracts ./packages/nextjs/contracts
COPY packages/nextjs/utils ./packages/nextjs/utils
COPY packages/nextjs/scaffold.config.ts ./packages/nextjs/
COPY packages/nextjs/tsconfig.json ./packages/nextjs/

# Generate Ponder code
WORKDIR /app/packages/ponder
RUN yarn codegen

# Remove the bloated node_modules before focus
WORKDIR /app
RUN rm -rf packages/ponder/node_modules packages/nextjs/node_modules packages/foundry/node_modules

# Focus on ponder workspace with production deps only
RUN yarn workspaces focus @se-2/ponder --production

# Clean up yarn cache and unnecessary files
RUN rm -rf \
  .yarn/cache \
  .yarn/unplugged \
  .yarn/install-state.gz \
  packages/foundry \
  packages/nextjs/utils

# Production stage - minimal
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ponder

# Copy application files from builder (no yarn needed at runtime)
COPY --from=builder --chown=ponder:nodejs /app/packages/ponder ./packages/ponder
COPY --from=builder --chown=ponder:nodejs /app/packages/nextjs/contracts ./packages/nextjs/contracts
COPY --from=builder --chown=ponder:nodejs /app/packages/nextjs/package.json ./packages/nextjs/
COPY --from=builder --chown=ponder:nodejs /app/packages/nextjs/scaffold.config.ts ./packages/nextjs/

WORKDIR /app/packages/ponder
USER ponder

EXPOSE 42069

# Set default hostname to 0.0.0.0 for Docker networking
ENV PONDER_HOSTNAME=0.0.0.0

# Run ponder directly with node - no yarn needed
CMD ["node", "node_modules/ponder/dist/esm/bin/ponder.js", "start"]
