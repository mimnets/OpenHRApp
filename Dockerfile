# ============================================================
# OpenHR — Multi-Stage Docker Build
# Stage 1: Build the React SPA with Vite
# Stage 2: Serve with Nginx
# ============================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time environment variables for Vite
# These are embedded into the JS bundle at build time.
ARG VITE_SUPABASE_URL=http://localhost:8000
ARG VITE_SUPABASE_ANON_KEY=
ARG VITE_VAPID_PUBLIC_KEY=

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}

# Install dependencies (devDependencies required for build)
# better-sqlite3 is a native module — Alpine needs build tools to compile it
COPY package.json package-lock.json .npmrc ./
RUN apk add --no-cache python3 make g++ sqlite-dev && \
    npm ci && \
    apk del --no-cache python3 make g++ sqlite-dev

# Copy source files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ src/
COPY public/ public/
COPY scripts/ scripts/

# Build the app (vite build + sitemap + feed)
RUN npm run build

# ---- Stage 2: Runner ----
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for nginx worker processes
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=2 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
