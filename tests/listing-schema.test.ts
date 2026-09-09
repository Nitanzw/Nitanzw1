import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultIncrement, listingSchema, validateSaleTerms } from "../src/lib/listing-schema.ts";

/// Lo que llega de un formulario: todo son cadenas, y lo vacío llega como "".
function formulario(extra: Record<string, string> = {}) {
  return {
    title: "Bicicleta Trek Marlin 7 talla M",
    description: "Bicicleta en muy buen estado, poco uso, mantenciones al día.",
    categoryId: "cat_1",
    ...extra,
  };
}

describe("esquema de publicación", () => {
  it("acepta una venta directa simple", () => {
    const parsed = listingSchema.parse(formulario({ priceType: "FIXED", currency: "CLP", price: "150000" }));
    assert.equal(parsed.price, 150000);
    assert.equal(validateSaleTerms(parsed, { auctionsEnabled: true }).error, undefined);
  });

  it("una subasta no envía tipo de precio ni moneda: se asumen", () => {
    const parsed = listingSchema.parse(
      formulario({ saleType: "AUCTION", startPrice: "100000", durationDays: "3" }),
    );
    assert.equal(parsed.priceType, "FIXED");
    assert.equal(parsed.currency, "CLP");
    assert.equal(validateSaleTerms(parsed, { auctionsEnabled: true }).isAuction, true);
  });

  it("los numéricos opcionales vacíos no rompen la publicación", () => {
    // Un <input> vacío llega como "" y z.coerce lo volvería 0, que falla
    // contra min()/positive(). Este es el caso que rompía el formulario.
    const parsed = listingSchema.parse(
      formulario({
        saleType: "AUCTION",
        startPrice: "100000",
        minIncrement: "",
        reservePrice: "",
        durationDays: "5",
      }),
    );
    assert.equal(parsed.minIncrement, undefined);
    assert.equal(parsed.reservePrice, undefined);
    assert.equal(validateSaleTerms(parsed, { auctionsEnabled: true }).error, undefined);
  });

  it("rechaza un incremento por debajo del piso", () => {
    assert.throws(() => listingSchema.parse(formulario({ minIncrement: "50" })));
  });
});

describe("reglas de venta", () => {
  const subasta = (extra: Record<string, string> = {}) =>
    listingSchema.parse(formulario({ saleType: "AUCTION", startPrice: "100000", durationDays: "3", ...extra }));

  it("la reserva no puede ser menor que el precio inicial", () => {
    const result = validateSaleTerms(subasta({ reservePrice: "80000" }), { auctionsEnabled: true });
    assert.match(result.error ?? "", /reserva/);
  });

  it("la reserva igual o mayor sí pasa", () => {
    assert.equal(validateSaleTerms(subasta({ reservePrice: "100000" }), { auctionsEnabled: true }).error, undefined);
  });

  it("exige una duración del catálogo", () => {
    const parsed = listingSchema.parse(formulario({ saleType: "AUCTION", startPrice: "1000", durationDays: "99" }));
    assert.match(validateSaleTerms(parsed, { auctionsEnabled: true }).error ?? "", /duración/);
  });

  it("con las subastas apagadas, un envío de subasta cae a venta directa", () => {
    const result = validateSaleTerms(subasta(), { auctionsEnabled: false });
    assert.equal(result.isAuction, false);
    assert.match(result.error ?? "", /precio/, "y entonces sí necesita un precio");
  });

  it("la venta directa exige precio salvo que sea a consultar", () => {
    const sinPrecio = listingSchema.parse(formulario({ priceType: "FIXED" }));
    assert.match(validateSaleTerms(sinPrecio, { auctionsEnabled: true }).error ?? "", /precio/);

    const aConsultar = listingSchema.parse(formulario({ priceType: "ON_REQUEST" }));
    assert.equal(validateSaleTerms(aConsultar, { auctionsEnabled: true }).error, undefined);
  });
});

describe("incremento por defecto", () => {
  it("es el 2% del precio inicial, con piso", () => {
    assert.equal(defaultIncrement(500000), 10000);
    assert.equal(defaultIncrement(1000), 100, "el piso evita pujas de $20");
  });
});
