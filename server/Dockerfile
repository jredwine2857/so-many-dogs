# Build context is the repo root, so the server can pull in ../shared.
FROM node:22-alpine AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=2567

COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/package.json
COPY server/tsconfig.json ./server/tsconfig.json
COPY server/src ./server/src
COPY shared ./shared

# tsx runs the TypeScript directly — no separate build step, and it keeps the
# relative ../../shared imports working exactly as they do in development.
RUN npm --prefix ./server install tsx@^4.16.5 --no-save

WORKDIR /app/server
EXPOSE 2567
USER node
CMD ["npx", "tsx", "src/index.ts"]
