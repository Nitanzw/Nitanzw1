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
| Pagos | Capa propia con proveedores intercambiables (apagada por bandera) |
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
| Compradora demo | `compradora@oktienda.cl` | `oktienda123` |
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
- **Subastas** con precio de reserva oculto y extensión anti-francotirador. Sin
  pagos: al cerrar, el sistema pone en contacto al vendedor con el ganador.
- **Calificaciones entre usuarios** después de un contacto real, con derecho a
  réplica y moderación: la defensa contra estafas.
- **Destacados pagados** listos pero **apagados** (`FEATURE_PAYMENTS`): catálogo
  de planes, checkout, acreditación por webhook y vigencia acumulable.
- **Cuentas completas**: registro, inicio de sesión, verificación de correo,
  recuperación de contraseña y límite de intentos contra fuerza bruta.
- **Perfil público del vendedor** con sus avisos activos y su sello de correo verificado.
- **Búsquedas guardadas** con alerta por correo cuando aparecen avisos nuevos que calzan.
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

## Subastas

Un aviso puede publicarse a precio directo o **a remate**. La subasta no mueve
dinero: cuando cierra, oktienda.cl abre la conversación entre el vendedor y el
ganador con un mensaje automático, y ellos coordinan la entrega. Lo que sostiene
el compromiso de una oferta es la reputación, no un depósito.

- **Precio de reserva oculto**: el vendedor fija un mínimo que nadie ve. Quienes
  ofertan solo saben si ya se alcanzó. Si al cerrar no se alcanzó, no hay ganador
  y el vendedor no queda obligado a vender.
- **Extensión anti-francotirador**: una oferta en los últimos 5 minutos corre el
  cierre otros 5, así nadie gana por ofertar en el segundo 59.
- Nadie puede ofertar en su propia subasta ni contra su propia oferta, y cada
  oferta debe superar a la más alta por el incremento mínimo.
- Las ofertas simultáneas se resuelven en una transacción `SERIALIZABLE` con
  reintento: de dos ofertas iguales a la vez, entra una sola.
- El historial de ofertas es público, con el nombre de pila de quien ofertó.
- El cierre lo hace `/api/cron/subastas`; conviene correrlo cada 5 minutos.

**Las que están por cerrar suben.** Como en cualquier sitio de remates, una
subasta que termina hoy vale más que una que cierra en cinco días:

- La portada tiene un bloque "Subastas que cierran pronto".
- En los resultados, las que cierran dentro de **24 horas** se muestran en un
  bloque arriba de la primera página, ordenadas por cierre más próximo. Se
  apartan del listado normal (en todas las páginas) para que no aparezcan dos
  veces ni descuadren la paginación.
- Ese realce **respeta lo que pida el usuario**: si eligió "menor precio" u otro
  orden, manda el suyo y el bloque no aparece.
- Hay un orden explícito **"Cierra pronto"** y un filtro por tipo de venta
  (solo subastas abiertas / solo venta directa).
- Las tarjetas muestran la cuenta regresiva, en rojo cuando faltan menos de 3 horas.

Después del cierre, comprador y vendedor se califican como en cualquier venta.

## Calificaciones y confianza

oktienda.cl es hoy un marketplace de **contactos**: no se cobra ni se procesan
pagos, así que la protección contra estafas es la reputación.

La regla que la sostiene: **solo puede calificar quien conversó de verdad**. Una
calificación va siempre atada a la conversación que puso en contacto a las dos
personas, y cada participante deja una sola. Sin contacto previo no hay reseña
posible, lo que hace caro fabricar reputación falsa.

- Comprador y vendedor se califican entre sí (1 a 5 estrellas, comentario
  opcional y si el trato se concretó).
- Quien recibe una calificación tiene **derecho a réplica**: una respuesta
  pública que se muestra junto a ella.
- El promedio se muestra en la ficha del aviso y en el perfil del vendedor.
- Un administrador puede eliminar una calificación abusiva desde
  `/admin/calificaciones`; la reputación se recalcula sola.

## Funcionalidades apagadas

`src/lib/features.ts` permite dejar código completo pero apagado en producción,
sin ramas paralelas ni borrar nada:

| Bandera | Por defecto | Qué controla |
| --- | --- | --- |
| `FEATURE_PAYMENTS` | `off` | Pantalla de destacar, checkout y webhook de pagos |
| `FEATURE_REVIEWS` | `on` | Calificaciones entre usuarios |
| `FEATURE_AUCTIONS` | `on` | Publicar a remate y ofertar |

Con los pagos apagados, `/destacar` responde 404 y no se ofrece por ninguna
parte, pero los avisos que ya tengan `featuredUntil` vigente se siguen
mostrando destacados. Para encenderlos: `FEATURE_PAYMENTS="on"` y un
`PAYMENT_PROVIDER` real.

## Moderación

Los usuarios con rol `ADMIN` ven `/admin`: métricas del marketplace, bandeja de
denuncias, moderación de avisos (bajar, reactivar, eliminar) y gestión de roles.
Cualquier visitante puede denunciar un aviso desde su ficha.

## Tareas programadas

Ambas rutas se protegen con `CRON_SECRET`:

| Ruta | Qué hace | Cada cuánto |
| --- | --- | --- |
| `/api/cron/expirar` | Vence avisos pasados de fecha, apaga destacados caducados y limpia tokens | Una vez al día |
| `/api/cron/alertas` | Avisa por correo los avisos nuevos que calzan con una búsqueda guardada | Cada 1-6 horas |
| `/api/cron/subastas` | Cierra las subastas vencidas, abre el contacto con el ganador y avisa por correo | **Cada 5 minutos** |

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/expirar
curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/alertas
curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/subastas
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
    auctions.ts        Reglas de la subasta (mínimos, extensión, cierre)
    auction-service.ts Ofertas y cierre contra la base de datos
    plans.ts           Catálogo de planes de destacado  ← oferta comercial
    prisma.ts          Cliente de base de datos
    search.ts          Traducción de query params a consultas Prisma
    storage.ts         Procesamiento y almacenamiento de imágenes (local / S3)
    verticals.ts       Definición de atributos por vertical  ← punto de extensión
    utils.ts           Formato de precios, fechas, slugs
```

## Pendientes conocidos

Cosas que la base deja preparadas pero todavía no implementa:

- Boleta electrónica y Webpay, para cuando se enciendan los pagos.
- Bloqueo de usuarios desde el panel (hoy solo se moderan avisos).
- Ordenar los resultados por relevancia (hoy el full-text decide qué coincide y el
  orden sigue siendo destacados / fecha / precio).
