import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOSING_SOON_HOURS,
  SORT_OPTIONS,
  buildListingOrderBy,
  buildListingWhere,
  closingSoonWhere,
  currentPage,
  listingOffset,
  shouldSurfaceClosingSoon,
  withParam,
} from "../src/lib/search.ts";

/// Busca una condición dentro del AND que arma buildListingWhere.
function conditions(where: ReturnType<typeof buildListingWhere>) {
  return (where.AND ?? []) as Record<string, unknown>[];
}

describe("buildListingWhere", () => {
  it("solo devuelve avisos activos", () => {
    assert.equal(buildListingWhere({}).status, "ACTIVE");
  });

  it("busca el texto en título y descripción", () => {
    const [first] = conditions(buildListingWhere({ q: "yaris" }));
    assert.deepEqual(first, {
      OR: [
        { title: { contains: "yaris", mode: "insensitive" } },
        { description: { contains: "yaris", mode: "insensitive" } },
      ],
    });
  });

  it("la comuna gana por sobre la región", () => {
    const found = conditions(buildListingWhere({ region: "r1", comuna: "c1" }));
    assert.deepEqual(found, [{ communeId: "c1" }]);
  });

  it("interpreta precios con separador de miles", () => {
    const [range] = conditions(buildListingWhere({ min: "1.000.000", max: "5.000.000" }));
    assert.deepEqual(range, { price: { gte: 1000000, lte: 5000000 } });
  });

  it("filtra atributos del vertical contra la columna JSON", () => {
    const found = conditions(
      buildListingWhere({ transmission: "Manual", year_min: "2015" }, { vertical: "VEHICLES" }),
    );
    assert.deepEqual(found, [
      { attributes: { path: ["year"], gte: 2015 } },
      { attributes: { path: ["transmission"], equals: "Manual" } },
    ]);
  });

  it("ignora atributos de otro vertical", () => {
    const found = conditions(buildListingWhere({ bedrooms_min: "2" }, { vertical: "VEHICLES" }));
    assert.deepEqual(found, []);
  });

  it("traduce el booleano del vertical", () => {
    const found = conditions(buildListingWhere({ furnished: "1" }, { vertical: "REAL_ESTATE" }));
    assert.deepEqual(found, [{ attributes: { path: ["furnished"], equals: true } }]);
  });

  it("acota por categoría y por fotos", () => {
    const found = conditions(buildListingWhere({ confoto: "1" }, { categoryIds: ["a", "b"] }));
    assert.deepEqual(found, [{ categoryId: { in: ["a", "b"] } }, { images: { some: {} } }]);
  });
});

describe("orden y paginación", () => {
  it("ordena por precio cuando se pide", () => {
    assert.deepEqual(buildListingOrderBy({ orden: "precio-asc" }), [
      { price: "asc" },
      { publishedAt: "desc" },
    ]);
  });

  it("por defecto muestra primero los destacados", () => {
    assert.deepEqual(buildListingOrderBy({}), [{ featuredUntil: "desc" }, { publishedAt: "desc" }]);
  });

  it("nunca devuelve una página menor a 1", () => {
    assert.equal(currentPage({ pagina: "0" }), 1);
    assert.equal(currentPage({ pagina: "-3" }), 1);
    assert.equal(currentPage({ pagina: "4" }), 4);
  });
});

describe("withParam", () => {
  it("conserva los filtros y cambia solo lo pedido", () => {
    const query = withParam({ q: "auto", categoria: "vehiculos" }, { orden: "precio-asc" });
    const params = new URLSearchParams(query.replace("?", ""));
    assert.equal(params.get("q"), "auto");
    assert.equal(params.get("categoria"), "vehiculos");
    assert.equal(params.get("orden"), "precio-asc");
  });

  it("quita un parámetro cuando se pasa vacío", () => {
    const query = withParam({ q: "auto", pagina: "3" }, { pagina: undefined });
    assert.equal(query.includes("pagina"), false);
  });
});

describe("texto libre", () => {
  it("usa los ids de la búsqueda full-text cuando están disponibles", () => {
    const found = conditions(buildListingWhere({ q: "camion" }, { matchedIds: ["a", "b"] }));
    assert.deepEqual(found, [{ id: { in: ["a", "b"] } }]);
  });

  it("sin resultados full-text no devuelve avisos", () => {
    const found = conditions(buildListingWhere({ q: "camion" }, { matchedIds: [] }));
    assert.deepEqual(found, [{ id: { in: [] } }]);
  });

  it("cae a la coincidencia por subcadena si no hay full-text", () => {
    const [first] = conditions(buildListingWhere({ q: "camion" }, { matchedIds: null }));
    assert.deepEqual(first, {
      OR: [
        { title: { contains: "camion", mode: "insensitive" } },
        { description: { contains: "camion", mode: "insensitive" } },
      ],
    });
  });

  it("ignora matchedIds cuando no hay texto buscado", () => {
    assert.deepEqual(conditions(buildListingWhere({}, { matchedIds: ["a"] })), []);
  });
});

describe("subastas por cerrar", () => {
  it("ofrece el orden por cierre próximo", () => {
    assert.ok(SORT_OPTIONS.some((option) => option.value === "cierra-pronto"));
  });

  it("ordena por fecha de cierre ascendente", () => {
    assert.deepEqual(buildListingOrderBy({ orden: "cierra-pronto" }), [
      { auction: { endsAt: "asc" } },
      { publishedAt: "desc" },
    ]);
  });

  it("filtra solo subastas abiertas", () => {
    const [condition] = conditions(buildListingWhere({ tipo: "subasta" }));
    const auction = (condition as { auction: { is: { status: string; endsAt: { gt: Date } } } }).auction;
    assert.equal(auction.is.status, "ACTIVE");
    assert.ok(auction.is.endsAt.gt instanceof Date, "debe excluir las ya cerradas");
  });

  it("filtra solo venta directa", () => {
    assert.deepEqual(conditions(buildListingWhere({ tipo: "directo" })), [{ auction: { is: null } }]);
  });

  it("la ventana de cierre próximo cubre las próximas horas", () => {
    const ahora = new Date("2026-09-09T12:00:00Z");
    const where = closingSoonWhere(ahora) as {
      auction: { is: { endsAt: { gt: Date; lte: Date } } };
    };
    assert.equal(where.auction.is.endsAt.gt.toISOString(), ahora.toISOString());
    assert.equal(
      where.auction.is.endsAt.lte.getTime() - ahora.getTime(),
      CLOSING_SOON_HOURS * 3600_000,
    );
  });

  it("se apartan salvo que el usuario pida otro orden", () => {
    assert.equal(shouldSurfaceClosingSoon({}), true);
    assert.equal(shouldSurfaceClosingSoon({ orden: "destacados" }), true);
    assert.equal(shouldSurfaceClosingSoon({ pagina: "2" }), true, "también en páginas siguientes");
    assert.equal(
      shouldSurfaceClosingSoon({ orden: "precio-asc" }),
      false,
      "si el usuario eligió un orden, manda el suyo",
    );
    assert.equal(shouldSurfaceClosingSoon({ orden: "cierra-pronto" }), false);
  });

  it("la paginación descuenta las que ya se mostraron arriba", () => {
    // Página 1: 6 destacadas arriba + 18 del listado = 24 (PAGE_SIZE).
    assert.deepEqual(listingOffset(1, 6), { skip: 0, take: 18 });
    // Página 2: sigue justo donde quedó el listado, sin repetir ni saltarse nada.
    assert.deepEqual(listingOffset(2, 6), { skip: 18, take: 24 });
    assert.deepEqual(listingOffset(3, 6), { skip: 42, take: 24 });
  });

  it("sin subastas por cerrar la paginación es la de siempre", () => {
    assert.deepEqual(listingOffset(1, 0), { skip: 0, take: 24 });
    assert.deepEqual(listingOffset(2, 0), { skip: 24, take: 24 });
  });
});
