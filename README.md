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
| Imágenes | `sharp` (WebP + miniatura) sobre disco local o S3/R2 |
| Pagos | Capa propia con proveedores intercambiables (`dev`, Mercado Pago) |

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
- **Destacados pagados**: catálogo de planes, checkout, acreditación por webhook
  y vigencia acumulable en `Listing.featuredUntil`.
- Registro e inicio de sesión propios, `robots.txt` y `sitemap.xml`.

## Imágenes

Toda imagen subida se normaliza a **WebP** y se guarda en dos tamaños: una versión
de hasta 1600 px para la ficha y una miniatura de 480×360 para las grillas.

`STORAGE_DRIVER` decide dónde quedan:

- `local` — `public/uploads`. Sirve para desarrollo y para un servidor único con
  disco persistente.
- `s3` — cualquier servicio compatible con S3: AWS S3, **Cloudflare R2**, Backblaze B2,
  MinIO. Es el que corresponde con varias instancias o despliegues efímeros (Vercel).
  Configura `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
  y, fuera de AWS, `S3_ENDPOINT`.

Cambiar de driver no requiere tocar código: las imágenes ya guardadas conservan su URL.

## Destacados pagados

Los planes viven en `src/lib/plans.ts` (código, nombre, días, precio). Editar ese
archivo es todo lo que hace falta para cambiar la oferta comercial.

Flujo: el vendedor entra a **Mis avisos → Destacar**, elige un plan, se crea un
`Payment` en estado `PENDING` y se le redirige al proveedor. La acreditación ocurre
en `/api/pagos/webhook`, que **nunca confía en el cuerpo de la notificación**: toma el
identificador y consulta el estado real contra la API del proveedor. Acreditar es
idempotente, así que da lo mismo si el webhook se reintenta o si el usuario recarga
la pantalla de retorno. Si el aviso ya estaba destacado, los días nuevos se suman
al final de la vigencia vigente.

`PAYMENT_PROVIDER` elige el proveedor:

- `dev` — aprueba el pago sin cobrar. **Solo para desarrollo**; nunca en producción.
- `mercadopago` — crea una preferencia real vía API REST. Requiere `MP_ACCESS_TOKEN`
  y registrar `https://tu-dominio/api/pagos/webhook` como URL de notificaciones.

Para sumar **Webpay (Transbank)** basta implementar un objeto con la interfaz
`PaymentProvider` de `src/lib/payments.ts` y registrarlo en `PROVIDERS`.

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
    featuring.ts       Acreditación de pagos y vigencia del destacado
    payments.ts        Proveedores de pago intercambiables
    plans.ts           Catálogo de planes de destacado  ← oferta comercial
    prisma.ts          Cliente de base de datos
    search.ts          Traducción de query params a consultas Prisma
    storage.ts         Procesamiento y almacenamiento de imágenes (local / S3)
    verticals.ts       Definición de atributos por vertical  ← punto de extensión
    utils.ts           Formato de precios, fechas, slugs
```

## Pendientes conocidos

Cosas que la base deja preparadas pero todavía no implementa:

- Verificación de correo y recuperación de contraseña.
- Boleta electrónica de los pagos (hoy queda el registro en la tabla `Payment`).
- Integración con Webpay, además de Mercado Pago.
- Panel de administración y moderación (el modelo `Report` ya está creado).
- Expiración automática de avisos vencidos (tarea programada sobre `expiresAt`).
- Búsqueda full-text en español (hoy usa `ILIKE`; el siguiente paso es `tsvector` o Meilisearch).
