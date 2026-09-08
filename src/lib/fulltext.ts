import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Búsqueda full-text en español.
 *
 * Consulta la columna generada `searchVector` (ver prisma/fulltext.ts), que
 * indexa título y descripción sin tildes y con el diccionario español. Eso hace
 * que "camion" encuentre "camión" y que "zapatos" encuentre "zapato", cosa que
 * el `ILIKE` anterior no lograba.
 *
 * Devuelve los ids candidatos ordenados por relevancia, o `null` si la columna
 * todavía no existe en esta base: en ese caso quien llama vuelve al `ILIKE`, así
 * que un despliegue sin correr `npm run db:fulltext` sigue buscando igual.
 */

/// Tope de candidatos. Los filtros (categoría, precio, comuna…) se aplican
/// después en Prisma sobre este conjunto.
export const FULLTEXT_CANDIDATE_LIMIT = 1000;

let unavailableLogged = false;

export async function searchListingIds(
  query: string,
  limit: number = FULLTEXT_CANDIDATE_LIMIT,
): Promise<string[] | null> {
  const term = query.trim();
  if (!term) return null;

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "Listing"
      WHERE "searchVector" @@ websearch_to_tsquery('spanish', oktienda_unaccent(${term}))
      ORDER BY ts_rank("searchVector", websearch_to_tsquery('spanish', oktienda_unaccent(${term}))) DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => row.id);
  } catch (error) {
    if (!unavailableLogged) {
      unavailableLogged = true;
      console.warn(
        "Búsqueda full-text no disponible; se usa ILIKE. Corre `npm run db:fulltext`.",
        error instanceof Error ? error.message : error,
      );
    }
    return null;
  }
}
