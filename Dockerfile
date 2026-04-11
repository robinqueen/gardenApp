# ── Stage 1: build the React PWA ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build
# Output is in /app/dist


# ── Stage 2: serve with nginx ──────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/gardenapp.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
