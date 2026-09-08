# oktienda.cl

Marketplace de clasificados chileno, construido con código propio (sin Medusa).
Base multi-vertical: general, **vehículos**, **propiedades**, servicios y empleos.

## Stack

| Pieza | Elección |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | PostgreSQL + Prisma |
| Sesiones | JWT propio firmado con `jose`, en cookie httpOnly |
| Imágenes | Disco local (`public/uploads`), listo para migrar a S3/R2 |

## Puesta en marcha

```bash
npm install
cp .env.example .env          # completa DATABASE_URL y AUTH_SECRET
npm run db:push               # crea las tablas
npm run db:seed               # regiones, comunas, categorías y avisos demo
npm run dev                   # http://localhost:3000
```

Cuenta de prueba que crea el seed: `demo@oktienda.cl` / `oktienda123`.

Genera el secreto de sesión con `openssl rand -base64 32`.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque en producción |
| `npm run typecheck` | Chequeo de tipos |
| `npm run db:push` | Sincroniza el esquema con la base |
| `npm run db:migrate` | Crea una migración versionada |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:studio` | Explorador visual de la base |

## Qué incluye esta base

- **Home** con buscador, categorías, avisos destacados y recientes.
- **Búsqueda** con filtros de categoría, región/comuna, precio, estado, solo-con-foto,
  orden y paginación — más los filtros propios de cada vertical.
- **Ficha del aviso**: galería, características del vertical, contacto por teléfono/WhatsApp,
  chat interno, favoritos, avisos similares y bloque de consejos de seguridad.
- **Publicación** en un formulario que cambia según la categoría elegida, con subida de hasta 10 fotos.
- **Cuenta**: mis avisos (pausar / reactivar / marcar vendido / eliminar), favoritos,
  mensajes y perfil con cambio de contraseña.
- **Mensajería** comprador ↔ vendedor por aviso.
- Registro e inicio de sesión propios, `robots.txt` y `sitemap.xml`.

## Cómo agregar un vertical nuevo

Los atributos de cada vertical viven en un solo archivo: `src/lib/verticals.ts`.
Se guardan en la columna JSON `Listing.attributes`, así que **no hace falta migrar la base**.

1. Agrega el valor al enum `Vertical` en `prisma/schema.prisma` (solo si es un vertical nuevo)
   y corre `npm run db:push`.
2. Declara sus campos en `VERTICALS`, marcando con `filterable: true` los que deben
   aparecer como filtro de búsqueda.
3. Asigna ese vertical a las categorías correspondientes (en el seed o desde la base).

El formulario de publicación, la validación, los filtros de búsqueda y la tabla de
características de la ficha se generan solos a partir de esa declaración.

## Estructura

```
prisma/
  schema.prisma        Modelo de datos
  seed.ts              Regiones, comunas, categorías y avisos demo
src/
  app/
    actions/           Server Actions (auth, avisos, favoritos, mensajes, perfil)
    api/upload/        Subida de imágenes
    aviso/[slug]/      Ficha del aviso
    buscar/            Resultados y filtros
    mi-cuenta/         Panel del usuario
    publicar/          Alta de avisos
  components/          UI reutilizable
  lib/
    auth.ts            Sesiones y contraseñas
    prisma.ts          Cliente de base de datos
    search.ts          Traducción de query params a consultas Prisma
    verticals.ts       Definición de atributos por vertical  ← punto de extensión
    utils.ts           Formato de precios, fechas, slugs
```

## Pendientes conocidos

Cosas que la base deja preparadas pero todavía no implementa:

- Verificación de correo y recuperación de contraseña.
- Planes de pago para destacar avisos (`Listing.featuredUntil` ya existe).
- Panel de administración y moderación (el modelo `Report` ya está creado).
- Expiración automática de avisos vencidos (tarea programada sobre `expiresAt`).
- Almacenamiento de imágenes en S3/R2 y redimensionado.
- Búsqueda full-text en español (hoy usa `ILIKE`; el siguiente paso es `tsvector` o Meilisearch).
