# Stage 1: Build the React Frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build the frontend to dist/
RUN npm run build

# Stage 2: Serve Backend + Frontend
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy backend code
COPY server/ ./

# Copy built frontend from Stage 1 to server/public
COPY --from=builder /app/dist ./public

# Expose port (Render sets PORT env var)
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
