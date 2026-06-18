# ── Stage 1: build React app ──────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
# Build with empty VITE_API_URL so API calls go to the same origin
RUN VITE_API_URL="" npx vite build

# ── Stage 2: runtime with PowerShell Core ─────────────────────────────────────
FROM node:20-slim AS runtime

# Install PowerShell Core
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      wget apt-transport-https software-properties-common gnupg && \
    wget -q "https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb" && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y --no-install-recommends powershell python3 && \
    rm -rf /var/lib/apt/lists/* packages-microsoft-prod.deb

WORKDIR /app

# Only install production server deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy server code and built React app
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Persistent storage for saved scripts (separate from server code)
VOLUME ["/app/data"]

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

CMD ["node", "server/index.js"]
