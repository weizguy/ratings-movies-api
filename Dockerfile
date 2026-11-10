# --- Build Stage ---
  FROM node:22-bookworm-slim AS builder
  WORKDIR /app
  
  # 🚀 FIX: Install essential light tools so native addons (better-sqlite3) compile without crashing
  RUN apt-get update && apt-get install -y \
      python3 \
      make \
      g++ \
      && rm -rf /var/lib/apt/lists/*
  
  COPY package*.json ./
  
  # Install ALL packages (including devDependencies) so TypeScript builds successfully
  RUN npm install
  
  COPY . .
  RUN npm run build
  
  # Prune node_modules in place to drop all devDependencies before moving to runner stage
  RUN npm prune --production
  
  # --- Production Stage ---
  FROM node:22-bookworm-slim AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  
  # Copy package descriptors for script runtime mapping
  COPY package*.json ./
  
  # Copy compiled JavaScript code and pre-compiled node_modules from builder
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/node_modules ./node_modules
  
  # Create empty db directory where local files will map via volume mounts
  RUN mkdir db
  
  EXPOSE 3000
  CMD ["npm", "start"]
  