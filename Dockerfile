# SophionOS Core image: multi-stage, Next.js standalone output.
#
# NEXT_PUBLIC_* values are INLINED into the browser bundle by `next build`.
# They must be build args, not runtime environment — a runtime `-e
# NEXT_PUBLIC_…` cannot change a bundle that has already been compiled.
# Everything server-only (Clerk secret key, Supabase service-role key) is
# runtime env and never appears in this file's runner stage.
#
#   docker build -t sophionos-core \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co …
#
# docker-compose.yml passes the same values from your shell / .env.
#
# check=skip=SecretsUsedInArgOrEnv
# (the check flags the two non-secret build placeholders below — builder stage
# only; real secrets are runtime env and never appear in this file's runner).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
# Slow/emulated links (QEMU, home uplinks) blow past pnpm's 60s default on
# large optional deps (swc binaries) and abort the install.
ENV NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/mcp-server/package.json packages/mcp-server/
# Store cache: rebuilds after changing a NEXT_PUBLIC_* build arg (which busts
# the builder layers) reuse downloaded tarballs instead of re-fetching them.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/mcp-server/node_modules ./packages/mcp-server/node_modules
COPY . .

# Browser-visible configuration — public by design, fixed at build time.
# The defaults keep a bare `docker build` compiling; an image built on them
# is wired to the placeholder Supabase project, so pass your own values.
ARG NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-anon-placeholder
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_build_placeholder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
# Server-only placeholders so the build does not need real secrets.
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    CLERK_SECRET_KEY=sk_test_build_placeholder \
    SUPABASE_SERVICE_ROLE_KEY=build-service-role-placeholder \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0 matters: the standalone server binds to $HOSTNAME, which
# inside a container defaults to the container hostname (unroutable from
# outside) rather than the bridge interface.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
# The standalone bundle (server.js + traced node_modules) plus the static
# assets Next never traces. `node server.js` needs nothing else — no pnpm,
# no full node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok||r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
