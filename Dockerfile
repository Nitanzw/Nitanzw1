# Imagen de producción de oktienda.cl
#
# Tres etapas para que la imagen final no cargue con las herramientas de
# compilación: dependencias, build y ejecución.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# El build no consulta la base: todas las páginas se renderizan por petición.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="solo-para-el-build"
RUN npx prisma generate && npx next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# sharp necesita estas bibliotecas para procesar las imágenes.
RUN apk add --no-cache libc6-compat vips-dev \
 && addgroup -g 1001 -S nodejs \
 && adduser -S oktienda -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=oktienda:nodejs /app/.next/standalone ./
COPY --from=build --chown=oktienda:nodejs /app/.next/static ./.next/static
# Migraciones y semilla, para poder correrlas desde el mismo contenedor.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

USER oktienda
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:3000/api/salud || exit 1

CMD ["node", "server.js"]
