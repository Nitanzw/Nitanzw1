-- Búsqueda full-text en español.
--
-- Prisma declara la columna "searchVector" y su índice GIN, pero no sabe
-- llenarla: de eso se encarga este trigger. Se usa trigger y no una columna
-- GENERATED porque Prisma intentaría convertirla en columna normal en cada
-- sincronización de esquema. Ver prisma/fulltext.ts, que aplica esto mismo de
-- forma idempotente sobre una base existente.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() no es inmutable, así que se envuelve para poder usarla en índices.
CREATE OR REPLACE FUNCTION oktienda_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE OR REPLACE FUNCTION oktienda_listing_search_vector()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('spanish', oktienda_unaccent(coalesce(NEW."title", ''))), 'A') ||
    setweight(to_tsvector('spanish', oktienda_unaccent(coalesce(NEW."description", ''))), 'B');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "listing_search_vector" ON "Listing";

CREATE TRIGGER "listing_search_vector"
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Listing"
  FOR EACH ROW
  EXECUTE FUNCTION oktienda_listing_search_vector();

-- Avisos anteriores al trigger.
UPDATE "Listing"
   SET "searchVector" =
     setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("title", ''))), 'A') ||
     setweight(to_tsvector('spanish', oktienda_unaccent(coalesce("description", ''))), 'B')
 WHERE "searchVector" IS NULL;
