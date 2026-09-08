import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reputationLabel, reputationOf } from "../src/lib/reputation.ts";

describe("reputación", () => {
  it("sin calificaciones no inventa promedio", () => {
    const reputation = reputationOf({ ratingCount: 0, ratingSum: 0 });
    assert.deepEqual(reputation, { count: 0, average: null });
    assert.equal(reputationLabel(reputation), "Sin calificaciones");
  });

  it("promedia y redondea a un decimal", () => {
    assert.equal(reputationOf({ ratingCount: 3, ratingSum: 14 }).average, 4.7);
    assert.equal(reputationOf({ ratingCount: 4, ratingSum: 18 }).average, 4.5);
    assert.equal(reputationOf({ ratingCount: 2, ratingSum: 10 }).average, 5);
  });

  it("describe el total en singular y plural", () => {
    assert.equal(reputationLabel(reputationOf({ ratingCount: 1, ratingSum: 5 })), "5.0 · 1 calificación");
    assert.equal(reputationLabel(reputationOf({ ratingCount: 2, ratingSum: 7 })), "3.5 · 2 calificaciones");
  });

  it("una calificación mala baja el promedio", () => {
    const antes = reputationOf({ ratingCount: 4, ratingSum: 20 }).average;
    const despues = reputationOf({ ratingCount: 5, ratingSum: 21 }).average;
    assert.equal(antes, 5);
    assert.equal(despues, 4.2);
  });
});
