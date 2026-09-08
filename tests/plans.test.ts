import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS, findPlan } from "../src/lib/plans.ts";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit.ts";

describe("planes de destacado", () => {
  it("tiene códigos únicos y valores coherentes", () => {
    const codes = new Set(PLANS.map((plan) => plan.code));
    assert.equal(codes.size, PLANS.length);

    for (const plan of PLANS) {
      assert.ok(plan.days > 0, `${plan.code} debe durar al menos un día`);
      assert.ok(plan.price > 0, `${plan.code} debe tener precio`);
    }
  });

  it("marca a lo más un plan sugerido", () => {
    assert.ok(PLANS.filter((plan) => plan.highlight).length <= 1);
  });

  it("busca por código y no inventa planes", () => {
    assert.equal(findPlan("destacado-7")?.days, 7);
    assert.equal(findPlan("plan-pirata"), undefined);
  });
});

describe("límite de intentos", () => {
  it("permite hasta el tope y luego bloquea", () => {
    const key = `test-${Math.random()}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal(checkRateLimit(key, 3, 60).allowed, true);
    }

    const blocked = checkRateLimit(key, 3, 60);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter > 0);
  });

  it("se reinicia al liberar la clave", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 60);
    assert.equal(checkRateLimit(key, 1, 60).allowed, false);
    resetRateLimit(key);
    assert.equal(checkRateLimit(key, 1, 60).allowed, true);
  });

  it("cuenta por clave, no globalmente", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    checkRateLimit(a, 1, 60);
    assert.equal(checkRateLimit(a, 1, 60).allowed, false);
    assert.equal(checkRateLimit(b, 1, 60).allowed, true);
  });
});
