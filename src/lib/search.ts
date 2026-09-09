import type { Prisma, Vertical } from "@prisma/client";
import { filterableFieldsFor } from "@/lib/verticals";

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "destacados", label: "Destacados primero" },
  { value: "cierra-pronto", label: "Cierra pronto" },
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
] as const;

/// Ventana en la que una subasta se considera "por cerrar" y sube en la lista.
export const CLOSING_SOON_HOURS = 24;

/// Cuántas subastas por cerrar se muestran arriba de todo en la primera página.
export const CLOSING_SOON_SLOTS = 6;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value.replace(/\./g, ""), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Traduce los query params de /buscar a un `where` de Prisma.
 *
 * El texto libre lo resuelve la búsqueda full-text (src/lib/fulltext.ts), que
 * entrega los ids candidatos en `matchedIds`; si no está disponible, este
 * módulo cae por su cuenta a una coincidencia por subcadena.
 * Los filtros propios de cada vertical (año, dormitorios, etc.) se resuelven
 * contra la columna JSON `attributes`, por lo que un vertical nuevo queda
 * filtrable con solo declararlo en src/lib/verticals.ts.
 */
export function buildListingWhere(
  params: SearchParams,
  options: { categoryIds?: string[]; vertical?: Vertical; matchedIds?: string[] | null } = {},
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  const and: Prisma.ListingWhereInput[] = [];

  const q = first(params.q);
  if (q) {
    if (options.matchedIds) {
      // La búsqueda full-text ya resolvió qué avisos coinciden con el texto.
      and.push({ id: { in: options.matchedIds } });
    } else {
      // Sin columna full-text disponible: coincidencia simple por subcadena.
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
  }

  if (options.categoryIds?.length) {
    and.push({ categoryId: { in: options.categoryIds } });
  }

  const comuna = first(params.comuna);
  const region = first(params.region);
  if (comuna) and.push({ communeId: comuna });
  else if (region) and.push({ commune: { regionId: region } });

  const min = toInt(first(params.min));
  const max = toInt(first(params.max));
  if (min !== undefined || max !== undefined) {
    and.push({ price: { ...(min !== undefined && { gte: min }), ...(max !== undefined && { lte: max }) } });
  }

  // "Solo subastas" muestra únicamente remates abiertos; "solo venta directa"
  // deja fuera todo lo que esté en subasta.
  const tipo = first(params.tipo);
  if (tipo === "subasta") {
    and.push({ auction: { is: { status: "ACTIVE", endsAt: { gt: new Date() } } } });
  } else if (tipo === "directo") {
    and.push({ auction: { is: null } });
  }

  const estado = first(params.estado);
  if (estado === "nuevo") and.push({ condition: "NEW" });
  if (estado === "usado") and.push({ condition: "USED" });

  if (first(params.confoto) === "1") and.push({ images: { some: {} } });

  if (options.vertical) {
    for (const field of filterableFieldsFor(options.vertical)) {
      const path = [field.key];

      if (field.type === "number") {
        const fMin = toInt(first(params[`${field.key}_min`]));
        const fMax = toInt(first(params[`${field.key}_max`]));
        if (fMin !== undefined) and.push({ attributes: { path, gte: fMin } });
        if (fMax !== undefined) and.push({ attributes: { path, lte: fMax } });
        continue;
      }

      const value = first(params[field.key]);
      if (!value) continue;
      if (field.type === "boolean") {
        and.push({ attributes: { path, equals: value === "1" } });
      } else {
        and.push({ attributes: { path, equals: value } });
      }
    }
  }

  if (and.length) where.AND = and;
  return where;
}

export function buildListingOrderBy(params: SearchParams): Prisma.ListingOrderByWithRelationInput[] {
  switch (first(params.orden)) {
    case "precio-asc":
      return [{ price: "asc" }, { publishedAt: "desc" }];
    case "precio-desc":
      return [{ price: "desc" }, { publishedAt: "desc" }];
    case "recientes":
      return [{ publishedAt: "desc" }];
    case "cierra-pronto":
      // Postgres deja los nulos al final en orden ascendente, así que los avisos
      // sin subasta quedan después de todos los remates abiertos.
      return [{ auction: { endsAt: "asc" } }, { publishedAt: "desc" }];
    default:
      return [{ featuredUntil: "desc" }, { publishedAt: "desc" }];
  }
}

/// Filtro de las subastas que están por cerrar, para destacarlas arriba de la
/// lista sin alterar el orden del resto.
export function closingSoonWhere(now: Date = new Date()): Prisma.ListingWhereInput {
  return {
    auction: {
      is: {
        status: "ACTIVE",
        endsAt: { gt: now, lte: new Date(now.getTime() + CLOSING_SOON_HOURS * 60 * 60 * 1000) },
      },
    },
  };
}

/// Si corresponde apartar las subastas por cerrar del listado normal. Solo
/// cuando el usuario no pidió otro orden: si eligió "menor precio", manda lo
/// que eligió. Se apartan en todas las páginas —aunque el bloque destacado se
/// muestre solo en la primera— para que no aparezcan dos veces.
export function shouldSurfaceClosingSoon(params: SearchParams): boolean {
  const orden = first(params.orden);
  return orden === undefined || orden === "destacados";
}

/// Desde qué fila pedir el listado normal, descontando las que ya se muestran
/// arriba en la primera página.
export function listingOffset(page: number, surfacedCount: number): { skip: number; take: number } {
  if (page === 1) return { skip: 0, take: PAGE_SIZE - surfacedCount };
  return { skip: (page - 1) * PAGE_SIZE - surfacedCount, take: PAGE_SIZE };
}

export function currentPage(params: SearchParams): number {
  const page = toInt(first(params.pagina)) ?? 1;
  return page < 1 ? 1 : page;
}

/// Reconstruye la query preservando los filtros activos.
export function withParam(params: SearchParams, changes: Record<string, string | undefined>): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = first(value);
    if (single) next.set(key, single);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}
