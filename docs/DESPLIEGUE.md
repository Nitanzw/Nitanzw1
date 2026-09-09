# Poner oktienda.cl en producción

Guía de la primera puesta en marcha y de las operaciones del día a día.
Todo lo que aparece acá está en el repositorio: no hay pasos secretos.

## Antes de empezar

Necesitas cuatro cosas que no están en el código:

1. Un **servidor** (o una cuenta de Vercel) y el dominio `oktienda.cl` apuntando a él.
2. Un **PostgreSQL 16** con respaldo automático del proveedor, o el que levanta
   `docker-compose.yml` en el mismo servidor.
3. Un **bucket S3 o R2** para las imágenes, con su dominio público.
4. Un **proveedor de correo** (SMTP del hosting, Resend, Brevo…) y acceso al DNS
   del dominio para configurar SPF y DKIM.

## Variables de entorno

Copia `.env.example` a `.env` y complétalo. Las que no pueden faltar en producción:

| Variable | Por qué importa |
| --- | --- |
| `DATABASE_URL` | Conexión a Postgres |
| `AUTH_SECRET` | Firma las sesiones. Genérala con `openssl rand -base64 32` y **no la reutilices** entre entornos |
| `NEXT_PUBLIC_SITE_URL` | `https://oktienda.cl`. Los enlaces de los correos y los retornos de pago la usan |
| `CRON_SECRET` | Sin esto, cualquiera puede disparar las tareas programadas |
| `STORAGE_DRIVER=s3` + credenciales | Con `local`, las imágenes se pierden en cada despliegue |
| `MAIL_DRIVER` + credenciales | Con `console`, los correos solo se escriben en el log |

Opcionales pero recomendadas: `ERROR_WEBHOOK_URL` para enterarte de los errores,
y `SEED_ADMIN_PASSWORD` si vas a sembrar la cuenta de administración.

## Primera puesta en marcha

```bash
# 1. Esquema de la base (crea tablas, índices y el trigger de búsqueda)
npm run db:deploy

# 2. Categorías, regiones y comunas. Ojo: también crea cuentas demo.
npm run db:seed

# 3. Comprobar que el correo sale de verdad
npm run mail:test tu@correo.cl

# 4. Arrancar
npm run build && npm start
```

Después del paso 2, **borra o cambia la clave de las cuentas demo**
(`demo@`, `compradora@`) y la del administrador.

### Con Docker

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts    # solo la primera vez
```

La imagen usa la salida `standalone` de Next y trae su propio chequeo de salud
contra `/api/salud`.

## Migraciones: `migrate deploy`, nunca `db push`

En desarrollo `npm run db:push` es cómodo. **En producción no se usa**: compara
el esquema con la base y aplica lo que sea necesario, incluido borrar columnas
—ya nos pasó con el índice de búsqueda—. En producción siempre:

```bash
npm run db:deploy     # prisma migrate deploy
```

Al cambiar el esquema, generas la migración en desarrollo con
`npm run db:migrate` y la subes al repositorio. El CI verifica en cada push que
las migraciones apliquen sobre una base vacía y que no se hayan separado del
esquema.

## Tareas programadas

Tres, y las tres importan:

| Ruta | Cada cuánto | Si no corre |
| --- | --- | --- |
| `/api/cron/subastas` | 5 minutos | Las subastas vencidas no se cierran ni avisan al ganador |
| `/api/cron/alertas` | 3 horas | Nadie recibe avisos de sus búsquedas guardadas |
| `/api/cron/expirar` | 1 vez al día | Los avisos vencidos siguen apareciendo |

En Vercel las declara `vercel.json`. En un servidor propio,
`scripts/cron.example` trae las líneas listas para `crontab -e`.

## Respaldos

`scripts/respaldo.sh` hace un volcado comprimido y borra los de más de 14 días:

```bash
0 3 * * * /ruta/al/proyecto/scripts/respaldo.sh >> /var/log/oktienda-respaldo.log 2>&1
```

Restaurar (reemplaza los datos actuales):

```bash
gunzip -c respaldos/oktienda-2026-09-09.sql.gz | psql "$DATABASE_URL"
```

**Prueba la restauración en una base aparte antes de necesitarla.** Un respaldo
que nunca se restauró no es un respaldo. Las imágenes en S3/R2 se respaldan
activando el versionado del bucket.

## Correo que no cae en spam

Con el dominio recién configurado, los correos van directo a spam salvo que el
DNS lo autorice. En el DNS de `oktienda.cl`:

- **SPF**: un registro TXT que autorice a tu proveedor a enviar por el dominio.
- **DKIM**: las claves que entrega el proveedor, como registros TXT.
- **DMARC**: `v=DMARC1; p=none; rua=mailto:contacto@oktienda.cl` para empezar a
  ver reportes sin bloquear nada.

Comprueba con `npm run mail:test tu@correo.cl` y **revisa la carpeta de spam**:
si llegó ahí, falta uno de los tres.

## Monitoreo

- `GET /api/salud` responde `200` si la aplicación y la base contestan, y `503`
  si la base no responde. Apunta ahí el chequeo del hosting.
- Con `ERROR_WEBHOOK_URL` configurado, los errores del servidor llegan a Slack,
  Discord o donde apuntes, con un tope de un aviso cada 30 segundos.

## Lista de verificación antes de abrir al público

- [ ] `AUTH_SECRET` propio y distinto del de desarrollo
- [ ] `CRON_SECRET` definido y las tres tareas programadas corriendo
- [ ] `STORAGE_DRIVER=s3` y una imagen subida de prueba que se vea en el sitio
- [ ] `MAIL_DRIVER` real, con SPF, DKIM y DMARC, y un correo de prueba en la bandeja
- [ ] Respaldo automático **y una restauración probada**
- [ ] Cuentas demo eliminadas y clave de administración cambiada
- [ ] Términos y política de privacidad revisados por un abogado
- [ ] `/api/salud` monitoreado y `ERROR_WEBHOOK_URL` configurado
- [ ] HTTPS activo y `NEXT_PUBLIC_SITE_URL` apuntando al dominio final
