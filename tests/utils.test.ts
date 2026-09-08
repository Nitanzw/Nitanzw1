import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPrice,
  formatRelativeDate,
  idFromListingParam,
  listingHref,
  slugify,
  whatsappNumber,
} from "../src/lib/utils.ts";

describe("slugify", () => {
  it("normaliza tildes y ñ", () => {
    assert.equal(slugify("Camión Ñuñoa 4x4"), "camion-nunoa-4x4");
  });

  it("no deja guiones sobrantes", () => {
    assert.equal(slugify("  ¡Oferta!  "), "oferta");
  });

  it("acota el largo", () => {
    assert.ok(slugify("a".repeat(200)).length <= 80);
  });
});

describe("formatPrice", () => {
  it("formatea pesos chilenos sin decimales", () => {
    assert.equal(formatPrice(9800000).replace(/ /g, " "), "$9.800.000");
  });

  it("soporta UF y dólares", () => {
    assert.equal(formatPrice(4200, "UF"), "UF 4.200");
    assert.equal(formatPrice(150, "USD"), "US$ 150");
  });

  it("respeta el tipo de precio por sobre el monto", () => {
    assert.equal(formatPrice(1000, "CLP", "FREE"), "Gratis");
    assert.equal(formatPrice(1000, "CLP", "ON_REQUEST"), "Consultar precio");
    assert.equal(formatPrice(null), "Consultar precio");
  });
});

describe("enlaces de avisos", () => {
  it("arma la URL canónica y recupera el id", () => {
    const listing = { id: "clx123abc", slug: "toyota-yaris-2020" };
    const href = listingHref(listing);
    assert.equal(href, "/aviso/toyota-yaris-2020-clx123abc");
    assert.equal(idFromListingParam(href.replace("/aviso/", "")), "clx123abc");
  });
});

describe("whatsappNumber", () => {
  it("completa el código de país chileno", () => {
    assert.equal(whatsappNumber("9 1234 5678"), "56912345678");
    assert.equal(whatsappNumber("+56 9 1234 5678"), "56912345678");
  });
});

describe("formatRelativeDate", () => {
  it("describe minutos y horas recientes", () => {
    assert.equal(formatRelativeDate(new Date(Date.now() - 5 * 60_000)), "hace 5 min");
    assert.equal(formatRelativeDate(new Date(Date.now() - 3 * 3_600_000)), "hace 3 h");
  });
});
