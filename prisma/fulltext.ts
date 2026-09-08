import { PrismaClient } from "@prisma/client";

/**
 * Prepara la búsqueda full-text en español.
 *
 * La columna `Listing.searchVector` la declara el esquema de Prisma (para que
 * `db push` no la borre), pero quien la llena es un trigger de Postgres: title
 * con peso A y description con peso B, con el diccionario español y sin tildes.
 *
 * Se usa un trigger y no una columna GENERATED porque Prisma no entiende las
 * columnas calculadas e intenta convertirlas en columnas normales en cada
 * `db push`, lo que hace fallar la sincronización del esquema.
 *
 * El script es idempotente y hace backfill de los avisos existentes. Correrlo
 * después de `npm run db:push`:
 *
 *   npm run db:fulltext
 */

const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS unaccent`,

  // `unaccent` no es inmutable, así que se envuelve para poder usarla en índices.
  `CREATE OR REPLACE FUNCTION oktienda_unaccent(text)
     RETURNS text
     LANGUAGE sql
     IMMUTABLE
     PARALLEL SAFE
     STRICT
   AS $$ SELECT public.unaccent('public.unaccent', $1) $$`,

  `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "searchVector" tsvector`,

  `CREATE OR REPLACE FUNCTION oktienda_listing_search_vector()
     RETURNS trigger
     LANGUAGE plpgsql
   AS $$
   BEGIN
     NEW."searchVector" :=
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce(NEW."title", ''))), 'A') ||
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce(NEW."description", ''))), 'B');
     RETURN NEW;
   END
   $$`,

  `DROP TRIGGER IF EXISTS "listing_search_vector" ON "Listing"`,

  `CREATE TRIGGER "listing_search_vector"
     BEFORE INSERT OR UPDATE OF "title", "description" ON "Listing"
     FOR EACH ROW
     EXECUTE FUNCTION oktienda_listing_search_vector()`,

  `CREATE INDEX IF NOT EXISTS "Listing_searchVector_idx" ON "Listing" USING GIN ("searchVector")`,

  // Backfill: avisos anteriores al trigger, o cuya columna quedó vacía tras un push.
  `UPDATE "Listing"
     SET "searchVector" =
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("title", ''))), 'A') ||
       setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("description", ''))), 'B')
   WHERE "searchVector" IS NULL`,
];

async function main() {
  for (const statement of STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }

  const [{ indexados, total }] = await prisma.$queryRawUnsafe<{ indexados: bigint; total: bigint }[]>(
    `SELECT count(*) FILTER (WHERE "searchVector" IS NOT NULL)::bigint AS indexados,
            count(*)::bigint AS total
     FROM "Listing"`,
  );

  console.log(`Búsqueda full-text lista. Avisos indexados: ${indexados}/${total}.`);
}

main()
  .catch((error) => {
    console.error("No se pudo preparar la búsqueda full-text:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
