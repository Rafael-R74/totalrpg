# ==============================================================================
# Stage 1: Builder (Compila TypeScript, gera Prisma Client e bundle do Frontend)
# ==============================================================================
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /build

# Copia manifestos e código-fonte primeiro
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY data/packs/content-pack.example.json ./data/packs/content-pack.example.json

# Limpa eventuais node_modules/dist/bancos enviados do Windows (caso .dockerignore não tenha ido)
RUN rm -rf \
    node_modules \
    packages/*/node_modules \
    apps/*/node_modules \
    apps/web/dist \
    apps/server/prisma/*.db \
    apps/server/prisma/*.db-* \
    apps/web/src/components/dice/DiceLab.tsx

# Instala dependências nativas Linux (incluindo esbuild e motores do Prisma)
RUN pnpm install --no-frozen-lockfile

# DATABASE_URL temporária exigida pelo schema.prisma durante o prisma generate no estágio de build
ENV DATABASE_URL="file:/tmp/build.db"
RUN cd /build/apps/server && ./node_modules/.bin/prisma generate

# Compila @totalrpg/shared, @totalrpg/server e @totalrpg/web
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN pnpm -r run build

# ==============================================================================
# Stage 2: Runner (Imagem leve de produção — Express + Socket.IO + Frontend)
# ==============================================================================
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    tzdata \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    TZ=America/Sao_Paulo \
    PORT=3333 \
    DATA_DIR=/app/data \
    WEB_DIST_DIR=/app/apps/web/dist \
    DATABASE_URL="file:/app/data/prod.db?connection_limit=1"

# Copia árvore de dependências pnpm + pacotes necessários em runtime
COPY --from=builder /build/package.json /build/pnpm-lock.yaml /build/pnpm-workspace.yaml ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/packages ./packages
COPY --from=builder /build/apps/server ./apps/server
COPY --from=builder /build/apps/web/dist ./apps/web/dist
COPY --from=builder /build/data ./data

EXPOSE 3333

# Sem scripts .sh externos (imune a quebra de linha CRLF ao enviar via FileBrowser do Windows)
# Executa tsx como PID 1 via exec para economizar RAM (limite 512M) e receber SIGTERM limpo
CMD ["sh", "-c", "mkdir -p /app/data/uploads /app/data/packs && cd /app/apps/server && ./node_modules/.bin/prisma db push --skip-generate && exec ./node_modules/.bin/tsx src/index.ts"]
