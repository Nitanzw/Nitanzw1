import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { features } from "../src/lib/features.ts";

const original = { ...process.env };

afterEach(() => {
  process.env.FEATURE_PAYMENTS = original.FEATURE_PAYMENTS;
  process.env.FEATURE_REVIEWS = original.FEATURE_REVIEWS;
});

describe("interruptores de funcionalidades", () => {
  it("los pagos vienen apagados por defecto", () => {
    delete process.env.FEATURE_PAYMENTS;
    assert.equal(features.payments, false);
  });

  it("las calificaciones vienen encendidas por defecto", () => {
    delete process.env.FEATURE_REVIEWS;
    assert.equal(features.reviews, true);
  });

  it("acepta on, true y 1 para encender", () => {
    for (const value of ["on", "true", "1", "ON"]) {
      process.env.FEATURE_PAYMENTS = value;
      assert.equal(features.payments, true, `"${value}" debería encender`);
    }
  });

  it("cualquier otro valor deja la función apagada", () => {
    for (const value of ["off", "false", "0", "no"]) {
      process.env.FEATURE_REVIEWS = value;
      assert.equal(features.reviews, false, `"${value}" debería apagar`);
    }
  });

  it("un valor vacío usa el valor por defecto", () => {
    process.env.FEATURE_REVIEWS = "";
    assert.equal(features.reviews, true);
  });
});
