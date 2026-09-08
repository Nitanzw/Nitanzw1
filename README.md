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
| Correo | `console` / SMTP / Resend, detrás de una misma interfaz |
| Calidad | ESLint, tests con `node:test` y CI en GitHub Actions |

## Puesta en marcha

```bash
npm install
cp .env.example .env          # completa DATABASE_URL y AUTH_SECRET
npm run db:push               # crea las tablas
npm run db:fulltext           # prepara la búsqueda en español
npm run db:seed               # regiones, comunas, categorías y avisos demo
npm run dev                   # http://localhost:3000
```

Cuentas que crea el seed:

| Cuenta | Correo | Clave |
| --- | --- | --- |
| Vendedor demo | `demo@oktienda.cl` | `oktienda123` |
| Administrador | `admin@oktienda.cl` | `oktienda123` |

Cambia la clave del administrador en producción con `SEED_ADMIN_PASSWORD`.

Genera el secreto de sesión con `openssl rand -base64 32`.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque en producción |
| `npm run typecheck` | Chequeo de tipos |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios de `src/lib` |
| `npm run db:push` | Sincroniza el esquema con la base |
| `npm run db:fulltext` | Crea la columna e índice de búsqueda full-text |
| `npm run db:migrate` | Crea una migración versionada |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:studio` | Explorador visual de la base |

## Qué incluye esta base

- **Home** con buscador, categorías, avisos destacados y recientes.
- **Búsqueda** full-text en español (encuentra "único dueño" buscando "unico dueno",
  y "departamento" buscando "departamentos"), con filtros de categoría, región/comuna,
  precio, estado, solo-con-foto, orden y paginación — más los filtros de cada vertical.
- **Ficha del aviso**: galería, características del vertical, contacto por teléfono/WhatsApp,
  chat interno, favoritos, avisos similares y bloque de consejos de seguridad.
- **Publicación** en un formulario que cambia según la categoría elegida, con subida de hasta 10 fotos.
- **Cuenta**: mis avisos (pausar / reactivar / marcar vendido / eliminar), favoritos,
  mensajes y perfil con cambio de contraseña.
- **Mensajería** comprador ↔ vendedor por aviso.
- **Destacados pagados**: catálogo de planes, checkout, acreditación por webhook
  y vigencia acumulable en `Listing.featuredUntil`.
- **Cuentas completas**: registro, inicio de sesión, verificación de correo,
  recuperación de contraseña y límite de intentos contra fuerza bruta.
- **Perfil público del vendedor** con sus avisos activos y su sello de correo verificado.
- **Búsquedas guardadas**, para repetir una búsqueda con todos sus filtros.
- **Denuncias y panel de administración**: métricas, moderación de avisos,
  bandeja de denuncias y gestión de roles.
- **Expiración automática** de avisos y destacados vencidos vía `/api/cron/expirar`.
- `robots.txt`, `sitemap.xml`, páginas de error y de carga.

## Cómo agregar funciones

**Lee [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).** Tiene el mapa del código y
las recetas concretas para agregar un vertical, un plan, un proveedor de pago o
correo, una página, una acción o una tarea programada. Cada concepto tiene un solo
punto de extensión, y casi ninguno requiere tocar la base de datos.

## Correo

`MAIL_DRIVER` elige el transporte: `console` (escribe el correo en el log, ideal
en desarrollo), `smtp` (cualquier servidor SMTP) o `resend`. Los correos
transaccionales viven en `src/lib/emails.ts`.

## Moderación

Los usuarios con rol `ADMIN` ven `/admin`: métricas del marketplace, bandeja de
denuncias, moderación de avisos (bajar, reactivar, eliminar) y gestión de roles.
Cualquier visitante puede denunciar un aviso desde su ficha.

## Tareas programadas

`/api/cron/expirar` marca vencidos los avisos pasados de fecha, apaga los
destacados caducados y limpia tokens usados. Protégelo con `CRON_SECRET` y
llámalo una vez al día:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/expirar
```

## Búsqueda

El texto libre se resuelve con una columna `tsvector` generada por Postgres sobre
el título y la descripción, con el diccionario español y sin tildes, más un índice
GIN. La crea `npm run db:fulltext`, que hay que correr **después de cada
`npm run db:push`** porque Prisma no genera columnas calculadas.

Si esa columna no existe, la búsqueda cae sola a una coincidencia por subcadena y
avisa en el log: un despliegue al que se le olvidó el paso sigue funcionando.

## Calidad

```bash
npm run typecheck && npm run lint && npm test
```

Los tests cubren la lógica de `src/lib` (formatos, verticales, búsqueda, planes,
límite de intentos). GitHub Actions corre lo mismo más el build en cada push.

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
    emails.ts          Plantillas de correos transaccionales
    mail.ts            Envío de correo (console / smtp / resend)
    rate-limit.ts      Límite de intentos por ventana de tiempo
    tokens.ts          Tokens de un solo uso (verificación, recuperación)
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

- Alertas por correo de las búsquedas guardadas (falta solo el job que las corre).
- Boleta electrónica de los pagos (hoy queda el registro en la tabla `Payment`).
- Integración con Webpay, además de Mercado Pago.
- Bloqueo de usuarios desde el panel (hoy solo se moderan avisos).
- Ordenar los resultados por relevancia (hoy el full-text decide qué coincide y el
  orden sigue siendo destacados / fecha / precio).
