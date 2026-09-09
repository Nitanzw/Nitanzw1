# Arquitectura de oktienda.cl

Este documento explica **dónde vive cada cosa** y **cómo agregar funciones nuevas**
sin tener que rehacer lo existente. Si vas a sumar algo, busca acá la receta antes
de improvisar una estructura nueva.

## Principios

1. **Un punto de extensión por concepto.** Los verticales, los planes, los pagos,
   el almacenamiento y el correo se declaran cada uno en un solo archivo. Agregar
   una variante es editar ese archivo, no repartir cambios por toda la app.
2. **Los datos flexibles van en JSON, no en columnas nuevas.** Los atributos de
   cada vertical viven en `Listing.attributes`, así que sumar un vertical no
   requiere migración.
3. **Las mutaciones son Server Actions.** Cada acción valida con zod, verifica
   permisos por su cuenta y llama `revalidatePath`. No hay una capa de API REST
   que mantener en paralelo.
4. **Cada capa externa está detrás de una interfaz.** Correo, pagos y archivos se
   eligen por variable de entorno; el resto del código no sabe cuál está activo.
5. **La autorización se repite en cada acción.** Los layouts que redirigen son
   comodidad para el usuario, nunca la única barrera.

## Mapa del código

```
prisma/schema.prisma     Modelo de datos. Fuente de verdad de los tipos.
prisma/seed.ts           Regiones, comunas, categorías, cuentas demo y admin.
prisma/fulltext.ts       Columna generada e índice GIN de la búsqueda.

src/lib/                 Lógica sin UI. Testeable y reutilizable.
  auction-service.ts     Ofertas y cierre de subastas contra la base.
  auctions.ts            Reglas puras de la subasta (mínimos, extensión, cierre).
  auth.ts                Sesión (JWT en cookie httpOnly) y contraseñas.
  emails.ts              Plantillas de correos transaccionales.
  featuring.ts           Acreditación de pagos y vigencia de destacados.
  features.ts            Interruptores de funcionalidades.
  mail.ts                Envío de correo: console / smtp / resend.
  payments.ts            Proveedores de pago: dev / mercadopago.
  plans.ts               Catálogo de planes de destacado.
  prisma.ts              Cliente de base de datos (singleton).
  reputation.ts          Cálculo del promedio de calificaciones (sin base).
  reviews.ts             Quién puede calificar a quién, y recálculo de reputación.
  rate-limit.ts          Límite de intentos por ventana de tiempo.
  fulltext.ts            Búsqueda full-text en español (con respaldo a ILIKE).
  listing-query.ts       Params de /buscar → consulta Prisma (página y alertas).
  listing-schema.ts      Validación del formulario de publicación.
  search.ts              Query params → consulta Prisma.
  storage.ts             Imágenes: procesamiento y destino (local / S3).
  tokens.ts              Tokens de un solo uso (verificación, recuperación).
  utils.ts               Formato de precios, fechas, slugs y URLs.
  verticals.ts           Atributos por vertical.

src/app/actions/         Server Actions, agrupadas por dominio.
src/app/api/             Route handlers: subida de imágenes, webhook, cron.
src/components/          UI reutilizable. Client Components solo donde hace falta.
tests/                   Tests unitarios de src/lib (node:test + tsx).
```

## Recetas

### Agregar un vertical (o un campo a uno existente)

Editar **solo** `src/lib/verticals.ts`:

```ts
BOATS: {
  label: "Náutica",
  fields: [
    { key: "length", label: "Eslora", type: "number", unit: "m", filterable: true },
    { key: "engine", label: "Motor", type: "select", options: ["Fuera de borda", "Intraborda"] },
  ],
},
```

Si es un vertical nuevo, agrégalo también al enum `Vertical` de
`prisma/schema.prisma`, corre `npm run db:push` y asígnalo a sus categorías.

Se actualizan solos: el formulario de publicación, la validación con zod, los
filtros de búsqueda (`filterable: true`) y la tabla de características de la ficha.

### Agregar un plan de destacado

Editar `src/lib/plans.ts`. Los códigos ya vendidos no deben cambiar de nombre:
quedan guardados en `Payment.planCode` para conciliar.

### Agregar un proveedor de pago (por ejemplo Webpay)

En `src/lib/payments.ts`, implementa la interfaz `PaymentProvider` y regístralo en
`PROVIDERS`. Luego `PAYMENT_PROVIDER=webpay`.

```ts
const webpayProvider: PaymentProvider = {
  name: "webpay",
  async createCheckout({ paymentId, plan, siteUrl }) {
    // …crear la transacción y devolver a dónde enviar al usuario
    return { redirectUrl, providerRef };
  },
};
```

La acreditación entra por `src/app/api/pagos/webhook/route.ts` y termina siempre
en `confirmPayment()`, que es idempotente. **Nunca acredites confiando en lo que
llega en el cuerpo de la notificación**: consulta el estado contra el proveedor.

### Agregar un destino de archivos o un proveedor de correo

Mismo patrón: `TRANSPORTS` en `src/lib/mail.ts`, y el `driver()` de
`src/lib/storage.ts`. Ambos se eligen por variable de entorno.

### Apagar o encender una funcionalidad

`src/lib/features.ts` define las banderas. Una funcionalidad apagada debe
desaparecer en **todos** sus bordes, no solo del menú: la página (con
`notFound()`), la Server Action y la ruta de API. Así, apagarla no deja
puertas traseras abiertas.

Al agregar una bandera nueva, documéntala en `.env.example` y en el README.

### Cuidado con `loading.tsx` y los 404

Un `loading.tsx` crea un límite de streaming: Next empieza a enviar la respuesta
antes de que la página decida, y entonces un `notFound()` posterior ya no puede
cambiar el status y devuelve 200. Por eso el esqueleto de carga vive en
`src/app/buscar/`, y no en la raíz. Si agregas uno, comprueba que las rutas que
pueden no existir sigan respondiendo 404.

### Agregar una página

- Pública: `src/app/<ruta>/page.tsx`. Si consulta la base, agrega
  `export const dynamic = "force-dynamic"`.
- De cuenta: dentro de `src/app/mi-cuenta/`; el layout ya exige sesión, y una
  entrada nueva en su arreglo `TABS` la muestra en la navegación.
- De administración: dentro de `src/app/admin/`; el layout exige rol `ADMIN`.

### Agregar una acción que escribe en la base

Crea o edita un archivo en `src/app/actions/`. El molde es siempre el mismo:

```ts
"use server";

export async function miAccion(_state: Estado, formData: FormData): Promise<Estado> {
  const user = await getCurrentUser();            // 1. quién es
  if (!user) redirect("/ingresar");               // 2. puede hacerlo?
  const parsed = miSchema.safeParse({ … });       // 3. validar entrada
  if (!parsed.success) return { error: … };
  await prisma…                                   // 4. escribir
  revalidatePath("/donde-se-ve");                 // 5. refrescar
  return { ok: true };
}
```

Si la acción puede abusarse (correos, mensajes, intentos de clave), pásala por
`checkRateLimit`.

### Reusar una búsqueda desde el servidor

`resolveListingQuery()` en `src/lib/listing-query.ts` traduce los parámetros de
/buscar a una consulta lista para Prisma, resolviendo la categoría y el full-text.
Lo usan la página de resultados y el job de alertas: así una búsqueda guardada
significa exactamente lo mismo en los dos lugares. Si necesitas ejecutar una
búsqueda desde otro punto (un feed, un informe), llama a esa función en vez de
rearmar los filtros.

### Mostrar una hora o una cuenta regresiva

El servidor y el navegador nunca tienen el mismo reloj, así que un componente
que calcule la hora al renderizar produce un desajuste de hidratación. El patrón
del proyecto (`src/components/countdown.tsx`) es: el servidor calcula el texto
inicial y lo pasa como prop, el cliente lo usa tal cual en el primer render y
recién después toma el control con su propio reloj.

### Bloquear a alguien

`getCurrentUser()` devuelve `null` si la cuenta está suspendida, así que el
bloqueo corta todas las acciones de una vez sin tener que acordarse de
comprobarlo en cada Server Action. Al suspender también hay que sacar de
circulación lo publicado: eso lo hace `toggleUserBlockAction`.

### Tocar las reglas de la subasta

Las reglas puras (oferta mínima, validación, extensión anti-francotirador,
resultado del cierre) están en `src/lib/auctions.ts`, sin base de datos y con
test propio: cámbialas ahí y el resto sigue. `src/lib/auction-service.ts` es lo
que las aplica contra Postgres.

Cuidado con una cosa: registrar una oferta corre en una transacción
`SERIALIZABLE` que **vuelve a leer la oferta más alta adentro**. Sin eso, dos
ofertas simultáneas podrían aceptarse ambas y saltarse el incremento mínimo. Si
tocas `placeBid`, no saques esa relectura ni el reintento por `P2034`.

### Realzar avisos en los resultados

Las subastas por cerrar se muestran arriba de la primera página. El patrón, si
necesitas realzar otra cosa, es el de `src/app/buscar/page.tsx`: una consulta
aparte para lo realzado y un `notIn` en la consulta principal, con el desfase de
paginación calculado por `listingOffset()`. Sin ese `notIn` los mismos avisos
aparecen dos veces; sin el desfase, la página 2 se salta o repite filas.

Dos reglas que conviene mantener: el realce solo aplica cuando el usuario no
pidió otro orden, y lo apartado se excluye en **todas** las páginas, aunque el
bloque se dibuje solo en la primera.

### Tocar la búsqueda de texto

El diccionario, los pesos y el índice viven en `prisma/fulltext.ts`; el consumo,
en `src/lib/fulltext.ts`. Si cambias la definición de la columna, corre
`npm run db:fulltext` de nuevo: el script la recrea. Los filtros estructurados
(categoría, precio, comuna, atributos del vertical) siguen resolviéndose en
`src/lib/search.ts` sobre los candidatos que devuelve el full-text.

### Agregar una tarea programada

Crea una ruta bajo `src/app/api/cron/` con el mismo guardia de `CRON_SECRET` que
usa `expirar/route.ts`, y agenda la llamada desde el cron de tu servidor,
Vercel Cron o GitHub Actions.

## Decisiones tomadas y por qué

| Decisión | Razón |
| --- | --- |
| Sesión propia con JWT en cookie, sin librería de auth | Menos dependencias y control total sobre el flujo; el proyecto no necesita OAuth todavía. |
| Atributos en JSON en vez de tablas por vertical | Sumar verticales no debe implicar migraciones ni joins nuevos. |
| Server Actions en vez de API REST | Una sola capa que mantener; la validación vive junto al uso. |
| Subasta sin pagos ni depósitos | El sitio es de contactos: lo que respalda una oferta es la reputación. Un depósito exigiría cobrar. |
| Búsqueda con `tsvector` generado en Postgres | Resuelve tildes y plurales con un índice GIN, sin sumar un servicio externo como Meilisearch. |
| Límite de intentos en memoria | Suficiente para una instancia. Con varias, reemplazar por Redis en `rate-limit.ts`. |
| Imágenes procesadas al subir | Evita depender de un servicio de transformación y abarata el CDN. |

## Cosas que faltan (pendientes conocidos)

- Ordenar por relevancia dentro de los resultados de una búsqueda de texto.
- Boleta electrónica de los pagos.
- Integración con Webpay.
- Bloqueo de usuarios en el panel de administración (hoy se moderan avisos y calificaciones).
- Que una calificación muy baja avise al equipo de moderación.
- Notificaciones en el sitio (hoy los avisos de subasta van solo por correo).
