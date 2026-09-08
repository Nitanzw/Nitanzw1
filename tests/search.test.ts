import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildListingOrderBy,
  buildListingWhere,
  currentPage,
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
