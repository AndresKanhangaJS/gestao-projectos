# Dev stage: usado por docker-compose.yml (target: dev) com bind mount + vite dev server
FROM node:24-alpine AS dev
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage: gera o build estatico para producao (instalacao reprodutivel a partir do lockfile)
FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# API no mesmo dominio que a SPA (nginx encaminha /api e /sanctum para o php-fpm).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Producao (imagem "web" do docker-compose.prod.yml): nginx a servir o dist
# e a encaminhar /api, /sanctum e /up para o php-fpm (contentor app).
FROM nginx:1.29-alpine AS production
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/nginx/php-fastcgi.conf /etc/nginx/snippets/php-fastcgi.conf
COPY docker/nginx/spa.conf /etc/nginx/snippets/spa.conf
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
