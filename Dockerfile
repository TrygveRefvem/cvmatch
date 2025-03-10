# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL}
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL}

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port the app runs on
EXPOSE 3000

# Start the application using the standalone server
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", ".next/standalone/server.js"] 