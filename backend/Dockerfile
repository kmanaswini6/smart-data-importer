FROM node:22-alpine
WORKDIR /usr/src/app

# Leverage container caching layers for dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source footprints into the system canvas
COPY . .

EXPOSE 5000
CMD ["node", "src/app.js"]