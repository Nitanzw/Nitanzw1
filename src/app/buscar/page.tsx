import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "@/components/search-filters";
import { SaveSearch } from "@/components/save-search";
import { getCurrentUser } from "@/lib/auth";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  buildListingOrderBy,
  buildListingWhere,
  currentPage,
  withParam,
  type SearchParams,
} from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buscar avisos" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
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

  const where = buildListingWhere(params, { categoryIds, vertical: category?.vertical });
  const page = currentPage(params);

  const [listings, total, rootCategories, regions, communes] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: buildListingOrderBy(params),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
        priceType: true,
        featuredUntil: true,
        publishedAt: true,
        createdAt: true,
        commune: { select: { name: true } },
        images: { select: { url: true, thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1 },
      },
    }),
    prisma.listing.count({ where }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.region.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    typeof params.region === "string"
      ? prisma.commune.findMany({
          where: { regionId: params.region },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => {
      const single = Array.isArray(value) ? value[0] : value;
      return single ? [[key, single] as [string, string]] : [];
    }),
  ).toString();

  const heading = category?.name ?? (typeof params.q === "string" && params.q ? `"${params.q}"` : "Todos los avisos");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-700">Inicio</Link>
        {category?.parent && (
          <>
            <span>/</span>
            <Link href={`/buscar?categoria=${category.parent.slug}`} className="hover:text-brand-700">
              {category.parent.name}
            </Link>
          </>
        )}
        {category && (
          <>
            <span>/</span>
            <span className="text-ink-700">{category.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          <SearchFilters
            params={params}
            category={category}
            rootCategories={rootCategories}
            regions={regions}
            communes={communes}
          />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink-900">{heading}</h1>
              <p className="text-sm text-ink-500">
                {total} {total === 1 ? "aviso encontrado" : "avisos encontrados"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {user && <SaveSearch query={queryString} suggestedName={heading} />}
              <span className="text-ink-500">Ordenar por</span>
              <div className="flex gap-1">
                {SORT_OPTIONS.map((option) => {
                  const active = (params.orden ?? "destacados") === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={`/buscar${withParam(params, { orden: option.value, pagina: undefined })}`}
                      className={`rounded-lg px-2.5 py-1.5 ${
                        active ? "bg-brand-600 text-white" : "bg-white text-ink-700 hover:bg-slate-100"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="font-semibold text-ink-900">No encontramos avisos con esos filtros</p>
              <p className="mt-1 text-sm text-ink-500">Prueba con otras palabras o quita algunos filtros.</p>
              <Link
                href="/buscar"
                className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Ver todos los avisos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/buscar${withParam(params, { pagina: String(page - 1) })}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Anterior
                </Link>
              )}
              <span className="text-sm text-ink-500">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/buscar${withParam(params, { pagina: String(page + 1) })}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
