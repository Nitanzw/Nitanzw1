import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { searchListingIds } from "@/lib/fulltext";
import { buildListingOrderBy, buildListingWhere, type SearchParams } from "@/lib/search";

/**
 * Traduce los parámetros de /buscar a una consulta lista para Prisma,
 * resolviendo lo que necesita la base: la categoría (y sus hijas) y los
 * candidatos de la búsqueda full-text.
 *
 * Lo usan la página de resultados y el job de alertas, para que una búsqueda
 * guardada signifique exactamente lo mismo en los dos lugares.
 */
export async function resolveListingQuery(params: SearchParams) {
  const categorySlug = typeof params.categoria === "string" ? params.categoria : undefined;

  const category = categorySlug
    ? await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: { children: { orderBy: { position: "asc" } }, parent: true },
      })
    : null;

  const categoryIds = category
    ? [category.id, ...category.children.map((child) => child.id)]
    : undefined;

  const q = typeof params.q === "string" ? params.q : undefined;
  const matchedIds = q ? await searchListingIds(q) : null;

  const where: Prisma.ListingWhereInput = buildListingWhere(params, {
    categoryIds,
    vertical: category?.vertical,
    matchedIds,
  });

  return { where, orderBy: buildListingOrderBy(params), category };
}

/// Convierte el query string guardado ("q=auto&categoria=vehiculos") en los
/// parámetros que entiende buildListingWhere.
export function paramsFromQueryString(query: string): SearchParams {
  const params: SearchParams = {};
  for (const [key, value] of new URLSearchParams(query.replace(/^\?/, ""))) {
    params[key] = value;
  }
  return params;
}
