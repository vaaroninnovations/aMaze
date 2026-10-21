FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV TRACKING_DATA_DIR=/data/tracking

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/tracking \
    && chown -R node:node /data/tracking

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.7 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY server/tsconfig.json server/tsconfig.json
COPY server/src server/src
COPY src/lib/tracking src/lib/tracking

RUN pnpm install --filter @amaze/tracking-service --frozen-lockfile --prod

USER node
EXPOSE 8080

CMD ["pnpm", "--filter", "@amaze/tracking-service", "start"]
