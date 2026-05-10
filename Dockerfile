# Image prête pour ComeUp Deployable / tout hébergeur container (Fly, Railway, Render…)
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public
COPY env.demo ./env.demo

RUN mkdir -p data

ENV NODE_ENV=production
EXPOSE 3000

# Variables à fournir au runtime : SESSION_SECRET, (optionnel) MONGODB_URI, PORT, TRUST_PROXY
CMD ["node", "server/index.js"]
