FROM node:20-bookworm-slim AS build

WORKDIR /app

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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Run migrations on startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

