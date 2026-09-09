# oktienda.cl

Marketplace de clasificados chileno. Next.js 15 (App Router) + TypeScript +
Tailwind v4 + Prisma/PostgreSQL. Todo el texto de la interfaz va en español de Chile.

## Antes de agregar una función

Lee `docs/ARQUITECTURA.md`: tiene la receta para agregar verticales, planes,
proveedores de pago, correos, páginas y acciones. Cada concepto tiene **un solo**
punto de extensión; no repartas la lógica en varios archivos.

## Comandos

```bash
npm run dev         # desarrollo
npm run typecheck   # tipos
npm run lint        # eslint
npm test            # tests unitarios de src/lib
npm run e2e         # pruebas de extremo a extremo (Playwright)
npm run db:push     # sincronizar esquema
npm run db:seed     # datos iniciales
```

Antes de dar por terminado un cambio: `npm run typecheck && npm run lint && npm test`.
Si tocaste flujos completos (publicar, ofertar, calificar, moderar), corre también `npm run e2e`.

## Convenciones

- Las mutaciones son Server Actions en `src/app/actions/`, validadas con zod, y
  cada una verifica permisos por su cuenta (no confíes solo en el layout).
- Las páginas que consultan la base llevan `export const dynamic = "force-dynamic"`.
- Los comentarios explican el porqué, no el qué, y van en español.
- La lógica que se pueda probar sin navegador vive en `src/lib/` y lleva test en `tests/`.
  Ojo: un módulo con `import "server-only"` no se puede importar desde un test, así que
  la función pura va en un archivo sin esa marca (ver `utils.ts` frente a `sms.ts`).
- Para avisarle algo a alguien, `notify()` de `src/lib/notifications.ts`: guarda la
  campanita y manda el push en la misma llamada.
- En producción **nunca** `db:push`: `npm run db:deploy` aplica las migraciones.
