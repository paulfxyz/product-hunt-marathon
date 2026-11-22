FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npm test && npm run build \
    && npx --no-install esbuild server/production.ts --bundle --platform=node --format=esm --packages=external --outfile=build/server.mjs

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3100
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev && npm cache clean --force \
    && apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/data/campaign.json ./data/campaign.json
COPY --from=build --chown=node:node /app/private-assets ./private-assets
# Initialize volume ownership before dropping privileges in the entrypoint.
COPY docker-entrypoint.sh /usr/local/bin/ph-entrypoint
RUN chmod 755 /usr/local/bin/ph-entrypoint
EXPOSE 3100
ENTRYPOINT ["/usr/local/bin/ph-entrypoint"]
CMD ["node", "build/server.mjs"]
