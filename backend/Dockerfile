FROM node:20-bookworm-slim AS build

WORKDIR /app

# Prisma engines need OpenSSL available in the image.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install deps first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma schema + migrations (needed for generate/migrate)
COPY prisma ./prisma

# App sources
COPY tsconfig.json ./
COPY src ./src

RUN npm run db:generate
RUN npm run build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=build /app/dist ./dist

# Ensure Prisma Client exists in runtime image
RUN npx prisma generate

EXPOSE 3000

# Run migrations on startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

