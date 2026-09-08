import { PrismaClient } from "@prisma/client";

/**
 * Prepara la búsqueda full-text en español.
 *
 * Crea (o recrea) la columna generada `searchVector` con el título y la
 * descripción del aviso, normalizados con el diccionario español y sin tildes,
 * más el índice GIN que la hace rápida.
 *
 * Es idempotente: se puede correr las veces que haga falta. Hay que ejecutarlo
 * después de cada `npm run db:push`, porque Prisma no sabe generar columnas
 * calculadas y crea la columna vacía.
 *
 *   npm run db:fulltext
 */

const prisma = new PrismaClient();

/// `unaccent` no es inmutable para Postgres, así que no sirve directamente en una
/// columna generada: se envuelve en una función propia marcada como inmutable.
const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS unaccent`,

  `CREATE OR REPLACE FUNCTION oktienda_unaccent(text)
     RETURNS text
     LANGUAGE sql
     IMMUTABLE
     PARALLEL SAFE
     STRICT
   AS $$ SELECT public.unaccent('public.unaccent', $1) $$`,

  `ALTER TABLE "Listing" DROP COLUMN IF EXISTS "searchVector"`,

  // El título pesa más que la descripción (peso A contra B).
  `ALTER TABLE "Listing"
     ADD COLUMN "searchVector" tsvector
     GENERATED ALWAYS AS (
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("title", ''))), 'A') ||
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("description", ''))), 'B')
     ) STORED`,

  `CREATE INDEX IF NOT EXISTS "Listing_searchVector_idx" ON "Listing" USING GIN ("searchVector")`,
];

async function main() {
  for (const statement of STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }

  const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count FROM "Listing" WHERE "searchVector" IS NOT NULL`,
  );

  console.log(`Búsqueda full-text lista. Avisos indexados: ${count}.`);
}

main()
  .catch((error) => {
    console.error("No se pudo preparar la búsqueda full-text:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
