import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkBid,
  extendedEndsAt,
  nextMinimumBid,
  reserveMet,
  resolveOutcome,
  timeLeftLabel,
  type AuctionState,
} from "../src/lib/auctions.ts";

const AHORA = new Date("2026-09-09T12:00:00Z");

function subasta(overrides: Partial<AuctionState> = {}): AuctionState {
  return {
    status: "ACTIVE",
    startPrice: 100000,
    minIncrement: 5000,
    reservePrice: null,
    endsAt: new Date("2026-09-12T12:00:00Z"),
    extensionMinutes: 5,
    sellerId: "vendedor",
    highestBid: null,
    ...overrides,
  };
}

describe("oferta mínima", () => {
  it("sin ofertas parte del precio inicial", () => {
    assert.equal(nextMinimumBid(subasta()), 100000);
  });

  it("con ofertas suma el incremento mínimo", () => {
    assert.equal(nextMinimumBid(subasta({ highestBid: { amount: 120000, bidderId: "a" } })), 125000);
  });
});

describe("validación de ofertas", () => {
  it("acepta una oferta válida", () => {
    const check = checkBid(subasta(), { bidderId: "compradora", amount: 100000 }, AHORA);
    assert.equal(check.ok, true);
  });

  it("rechaza por debajo del mínimo", () => {
    const check = checkBid(
      subasta({ highestBid: { amount: 120000, bidderId: "otro" } }),
      { bidderId: "compradora", amount: 121000 },
      AHORA,
    );
    assert.equal(check.ok, false);
    assert.equal(check.ok === false && check.reason, "BELOW_MINIMUM");
  });

  it("el vendedor no puede ofertar en su propia subasta", () => {
    const check = checkBid(subasta(), { bidderId: "vendedor", amount: 500000 }, AHORA);
    assert.equal(check.ok === false && check.reason, "OWN_AUCTION");
  });

  it("nadie puede ofertar contra sí mismo", () => {
    const check = checkBid(
      subasta({ highestBid: { amount: 120000, bidderId: "compradora" } }),
      { bidderId: "compradora", amount: 200000 },
      AHORA,
    );
    assert.equal(check.ok === false && check.reason, "ALREADY_WINNING");
  });

  it("rechaza cuando ya pasó el cierre", () => {
    const check = checkBid(
      subasta({ endsAt: new Date("2026-09-09T11:59:00Z") }),
      { bidderId: "compradora", amount: 100000 },
      AHORA,
    );
    assert.equal(check.ok === false && check.reason, "AUCTION_EXPIRED");
  });

  it("rechaza en una subasta ya cerrada o cancelada", () => {
    for (const status of ["WON", "NO_BIDS", "RESERVE_NOT_MET", "CANCELLED"] as const) {
      const check = checkBid(subasta({ status }), { bidderId: "compradora", amount: 999999 }, AHORA);
      assert.equal(check.ok === false && check.reason, "AUCTION_CLOSED", `estado ${status}`);
    }
  });

  it("rechaza montos no enteros", () => {
    const check = checkBid(subasta(), { bidderId: "compradora", amount: 100000.5 }, AHORA);
    assert.equal(check.ok, false);
  });
});

describe("anti-francotirador", () => {
  it("una oferta lejos del cierre no lo mueve", () => {
    const auction = subasta();
    assert.equal(extendedEndsAt(auction, AHORA).getTime(), auction.endsAt.getTime());
  });

  it("una oferta dentro de la ventana final corre el cierre", () => {
    const auction = subasta({ endsAt: new Date("2026-09-09T12:02:00Z") });
    const extended = extendedEndsAt(auction, AHORA);
    assert.equal(extended.toISOString(), "2026-09-09T12:05:00.000Z");
  });

  it("la extensión se mide desde la oferta, no desde el cierre anterior", () => {
    const auction = subasta({ endsAt: new Date("2026-09-09T12:00:30Z"), extensionMinutes: 10 });
    assert.equal(extendedEndsAt(auction, AHORA).toISOString(), "2026-09-09T12:10:00.000Z");
  });

  it("ofertas seguidas al final siguen extendiendo", () => {
    let auction = subasta({ endsAt: new Date("2026-09-09T12:01:00Z") });
    const primera = extendedEndsAt(auction, AHORA);
    auction = { ...auction, endsAt: primera };
    const segunda = extendedEndsAt(auction, new Date("2026-09-09T12:04:00Z"));
    assert.ok(segunda > primera, "la segunda oferta debe extender de nuevo");
  });
});

describe("cierre de la subasta", () => {
  it("sin ofertas no hay ganador", () => {
    assert.deepEqual(resolveOutcome(subasta()), { status: "NO_BIDS", winnerId: null, amount: null });
  });

  it("sin reserva gana la oferta más alta", () => {
    const outcome = resolveOutcome(subasta({ highestBid: { amount: 150000, bidderId: "camila" } }));
    assert.deepEqual(outcome, { status: "WON", winnerId: "camila", amount: 150000 });
  });

  it("bajo la reserva no hay ganador", () => {
    const outcome = resolveOutcome(
      subasta({ reservePrice: 200000, highestBid: { amount: 150000, bidderId: "camila" } }),
    );
    assert.equal(outcome.status, "RESERVE_NOT_MET");
    assert.equal(outcome.winnerId, null);
  });

  it("justo en la reserva sí gana", () => {
    const outcome = resolveOutcome(
      subasta({ reservePrice: 150000, highestBid: { amount: 150000, bidderId: "camila" } }),
    );
    assert.equal(outcome.status, "WON");
  });
});

describe("estado de la reserva", () => {
  it("sin reserva no se informa nada", () => {
    assert.equal(reserveMet(subasta()), null);
  });

  it("informa si se alcanzó, sin revelar el monto", () => {
    assert.equal(reserveMet(subasta({ reservePrice: 200000, highestBid: { amount: 150000, bidderId: "a" } })), false);
    assert.equal(reserveMet(subasta({ reservePrice: 200000, highestBid: { amount: 200000, bidderId: "a" } })), true);
  });
});

describe("tiempo restante", () => {
  it("describe minutos, horas y días", () => {
    assert.equal(timeLeftLabel(new Date("2026-09-09T12:30:00Z"), AHORA), "Cierra en 30 min");
    assert.equal(timeLeftLabel(new Date("2026-09-09T15:30:00Z"), AHORA), "Cierra en 3 h 30 min");
    assert.equal(timeLeftLabel(new Date("2026-09-11T14:00:00Z"), AHORA), "Cierra en 2 días 2 h");
  });

  it("una subasta pasada se muestra cerrada", () => {
    assert.equal(timeLeftLabel(new Date("2026-09-09T11:00:00Z"), AHORA), "Cerrada");
  });
});
