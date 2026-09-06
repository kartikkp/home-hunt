FROM node:24-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY taste-engine.mjs /app/taste-engine.mjs
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
