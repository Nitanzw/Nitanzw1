import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizarTelefono } from "../src/lib/utils.ts";

describe("teléfonos chilenos", () => {
  it("acepta las formas en que la gente los escribe", () => {
    for (const entrada of [
      "+56 9 1234 5678",
      "56912345678",
      "9 1234 5678",
      "912345678",
      "+569-1234-5678",
    ]) {
      assert.equal(normalizarTelefono(entrada), "+56912345678", `falló con "${entrada}"`);
    }
  });

  it("completa el 9 cuando escriben solo los ocho dígitos", () => {
    assert.equal(normalizarTelefono("1234 5678"), "+56912345678");
  });

  it("rechaza lo que no es un teléfono", () => {
    for (const entrada of ["123", "", "no es un teléfono", "5691234567890123"]) {
      assert.equal(normalizarTelefono(entrada), null, `debería rechazar "${entrada}"`);
    }
  });
});
