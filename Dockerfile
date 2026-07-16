# SophionOS evaluation / production-ish multi-stage image.
# Requires Clerk + Supabase env at runtime (see .env.example).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/mcp-server/package.json packages/mcp-server/
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/mcp-server/node_modules ./packages/mcp-server/node_modules
COPY . .
# Placeholders so Next can compile without real secrets in image build.
ENV NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=build-anon-placeholder \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_build_placeholder \
    CLERK_SECRET_KEY=sk_test_build_placeholder \
    NEXT_PUBLIC_APP_URL=http://localhost:3000 \
    SUPABASE_SERVICE_ROLE_KEY=build-service-role-placeholder \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok||r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]
