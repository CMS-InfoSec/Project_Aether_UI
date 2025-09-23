# syntax=docker/dockerfile:1.6

# ---------- Builder ----------
FROM node:20-alpine AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app

# Copy only package files first for better cache
COPY code/package.json ./code/package.json
# If you have a lockfile in code/, uncomment the next line to improve reproducibility
# COPY code/pnpm-lock.yaml ./code/pnpm-lock.yaml

WORKDIR /app/code
RUN pnpm install --prefer-offline

# Now copy the rest and build
COPY code/ /app/code/
RUN pnpm build

# ---------- Runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app/code

# Only install production deps
COPY --from=builder /app/code/package.json ./package.json
# COPY lockfile if present
# COPY --from=builder /app/code/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --prod --prefer-offline

# Copy built artifacts
COPY --from=builder /app/code/dist /app/code/dist

# Env vars (override at runtime)
ENV PORT=3000 \
    NODE_ENV=production

EXPOSE 3000
CMD ["node", "dist/server/node-build.mjs"]
