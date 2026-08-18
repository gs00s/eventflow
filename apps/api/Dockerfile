# syntax=docker/dockerfile:1

# Build with repo root as context: docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter=@eventflow/api...

COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN pnpm --filter=@eventflow/api... build

# Separate prod-only install, rather than pruning the builder's install (which needs
# devDependencies to build) — keeps devDependencies (@nestjs/cli, typescript, vitest, ...)
# out of the runtime image without relying on pnpm prune against an isolated node_modules tree.
FROM base AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter=@eventflow/api... --prod

# Preserves the monorepo's real relative layout (root node_modules, apps/api, packages/shared-types
# as siblings) instead of flattening via `pnpm deploy` — avoids a repo-wide injectWorkspacePackages
# config change just for this build; apps/api's existing node_modules symlinks resolve correctly
# as long as their targets exist at the same relative paths.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/shared-types ./packages/shared-types
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 8080
CMD ["node", "dist/src/main.js"]
