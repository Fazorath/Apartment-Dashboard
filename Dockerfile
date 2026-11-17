# Roommate Dash production image: the API plus the built frontend, served from one origin.
# Build context is the repository root.

FROM node:24-slim AS frontend
# The signup form imports the password policy from ../../backend/utils, so copy it in place
WORKDIR /build/apartment-dashboard-react
COPY apartment-dashboard-react/package.json apartment-dashboard-react/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY apartment-dashboard-react/index.html apartment-dashboard-react/vite.config.js apartment-dashboard-react/postcss.config.cjs apartment-dashboard-react/tailwind.config.js ./
COPY apartment-dashboard-react/public ./public
COPY apartment-dashboard-react/src ./src
COPY apartment-dashboard-react/backend/utils/passwordPolicy.js apartment-dashboard-react/backend/utils/commonPasswords.js ./backend/utils/
# VITE_API_URL stays unset so the app calls the relative /api
RUN npm run build

FROM node:24-slim AS backend-deps
WORKDIR /build
COPY apartment-dashboard-react/backend/package.json apartment-dashboard-react/backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24-slim
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public
WORKDIR /app/backend
COPY --from=backend-deps /build/node_modules ./node_modules
COPY apartment-dashboard-react/backend/package.json ./
COPY apartment-dashboard-react/backend/server.js apartment-dashboard-react/backend/app.js apartment-dashboard-react/backend/config.js ./
COPY apartment-dashboard-react/backend/middleware ./middleware
COPY apartment-dashboard-react/backend/models ./models
COPY apartment-dashboard-react/backend/routes ./routes
COPY apartment-dashboard-react/backend/utils ./utils
COPY --from=frontend /build/apartment-dashboard-react/dist /app/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
