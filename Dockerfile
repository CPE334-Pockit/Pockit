FROM oven/bun:1.4.4 AS builder
WORKDIR /app

# Prisma generation needs a syntactically valid URL but does not connect during
# the image build. This value exists only in the builder stage.
ENV DATABASE_URL=postgresql://pockit:build-only@localhost:5432/pockit

COPY . .
RUN --mount=type=secret,id=web_env,target=/app/apps/web/.env.local \
    --mount=type=secret,id=server_env,target=/app/apps/server/.env.local \
    --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
RUN --mount=type=secret,id=server_env,target=/app/apps/server/.env.local \
    bun run db:generate

ARG VITE_SERVER_URL=https://s4b043a2c-4d7hbszvwq-as.a.run.app
RUN test -n "$VITE_SERVER_URL"
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV NODE_ENV=production
RUN --mount=type=secret,id=web_env,target=/app/apps/web/.env.local \
    --mount=type=secret,id=server_env,target=/app/apps/server/.env.local \
    cd apps/server && bun run build
RUN --mount=type=secret,id=web_env,target=/app/apps/web/.env.local \
    --mount=type=secret,id=server_env,target=/app/apps/server/.env.local \
    cd apps/web && bun run build

FROM oven/bun:1.4.4 AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG VITE_SERVER_URL=https://s4b043a2c-4d7hbszvwq-as.a.run.app
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV SERVER_URL=http://127.0.0.1:3002
COPY --from=builder /app /app
EXPOSE 3000
CMD ["bun", "deploy/course-entry.ts"]
