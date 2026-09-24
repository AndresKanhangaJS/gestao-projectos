# Dev stage: usado por docker-compose.yml (target: dev) com bind mount + vite dev server
FROM node:20-alpine AS dev
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage: gera o build estatico para producao
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Producao: apenas os ficheiros estaticos, para copiar para o volume servido pelo nginx
FROM scratch AS production
COPY --from=build /app/dist /dist
