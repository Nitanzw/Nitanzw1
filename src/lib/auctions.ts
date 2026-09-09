/**
 * Reglas de una subasta, sin base de datos ni pagos.
 *
 * Acá vive todo lo que decide si una oferta es válida, cuánto hay que ofertar,
 * cuándo se corre el cierre y cómo termina la subasta. Está aislado a propósito:
 * son las reglas que más caro sale equivocar, y así se prueban sin navegador.
 */

export type AuctionState = {
  status: "ACTIVE" | "WON" | "NO_BIDS" | "RESERVE_NOT_MET" | "CANCELLED";
  startPrice: number;
  minIncrement: number;
  reservePrice: number | null;
  endsAt: Date;
  extensionMinutes: number;
  sellerId: string;
  /// Oferta más alta actual, si hay.
  highestBid: { amount: number; bidderId: string } | null;
};

/// Duraciones que ofrece el formulario de publicación.
export const AUCTION_DURATIONS = [
  { days: 3, label: "3 días" },
  { days: 5, label: "5 días" },
  { days: 7, label: "7 días" },
  { days: 10, label: "10 días" },
] as const;

export const MIN_INCREMENT_FLOOR = 100;

/// Cuánto hay que ofertar como mínimo para tomar la delantera.
export function nextMinimumBid(auction: Pick<AuctionState, "startPrice" | "minIncrement" | "highestBid">): number {
  if (!auction.highestBid) return auction.startPrice;
  return auction.highestBid.amount + auction.minIncrement;
}

export type BidRejection =
  | "AUCTION_CLOSED"
  | "AUCTION_EXPIRED"
  | "OWN_AUCTION"
  | "ALREADY_WINNING"
  | "BELOW_MINIMUM";

export type BidCheck =
  | { ok: true; minimum: number }
  | { ok: false; reason: BidRejection; minimum: number; message: string };

/// Valida una oferta contra el estado de la subasta en ese instante.
export function checkBid(
  auction: AuctionState,
  bid: { bidderId: string; amount: number },
  now: Date = new Date(),
): BidCheck {
  const minimum = nextMinimumBid(auction);

  if (auction.status !== "ACTIVE") {
    return { ok: false, reason: "AUCTION_CLOSED", minimum, message: "Esta subasta ya terminó" };
  }

  if (auction.endsAt <= now) {
    return { ok: false, reason: "AUCTION_EXPIRED", minimum, message: "Esta subasta acaba de cerrar" };
  }

  if (auction.sellerId === bid.bidderId) {
    return { ok: false, reason: "OWN_AUCTION", minimum, message: "No puedes ofertar en tu propia subasta" };
  }

  // Ofertar contra uno mismo solo sirve para subirse el precio.
  if (auction.highestBid?.bidderId === bid.bidderId) {
    return { ok: false, reason: "ALREADY_WINNING", minimum, message: "Ya tienes la oferta más alta" };
  }

  if (!Number.isInteger(bid.amount) || bid.amount < minimum) {
    return {
      ok: false,
      reason: "BELOW_MINIMUM",
      minimum,
      message: `La oferta mínima es ${minimum.toLocaleString("es-CL")}`,
    };
  }

  return { ok: true, minimum };
}

/**
 * Cierre después de una oferta.
 *
 * Si la oferta entra dentro de la ventana final, el cierre se corre esa misma
 * cantidad de minutos desde ahora. Así nadie gana por ofertar en el último
 * segundo: siempre queda tiempo para responder.
 */
export function extendedEndsAt(
  auction: Pick<AuctionState, "endsAt" | "extensionMinutes">,
  now: Date = new Date(),
): Date {
  const windowMs = auction.extensionMinutes * 60 * 1000;
  const remaining = auction.endsAt.getTime() - now.getTime();
  if (remaining > windowMs) return auction.endsAt;
  return new Date(now.getTime() + windowMs);
}

export type AuctionOutcome =
  | { status: "NO_BIDS"; winnerId: null; amount: null }
  | { status: "RESERVE_NOT_MET"; winnerId: null; amount: number }
  | { status: "WON"; winnerId: string; amount: number };

/// Cómo termina una subasta que llegó a su cierre.
export function resolveOutcome(
  auction: Pick<AuctionState, "reservePrice" | "highestBid">,
): AuctionOutcome {
  if (!auction.highestBid) return { status: "NO_BIDS", winnerId: null, amount: null };

  if (auction.reservePrice !== null && auction.highestBid.amount < auction.reservePrice) {
    return { status: "RESERVE_NOT_MET", winnerId: null, amount: auction.highestBid.amount };
  }

  return { status: "WON", winnerId: auction.highestBid.bidderId, amount: auction.highestBid.amount };
}

/// Si la reserva ya se alcanzó. Se muestra a todos; el monto de la reserva no.
export function reserveMet(auction: Pick<AuctionState, "reservePrice" | "highestBid">): boolean | null {
  if (auction.reservePrice === null) return null;
  return (auction.highestBid?.amount ?? 0) >= auction.reservePrice;
}

/// Texto del tiempo restante, pensado para leerse de un vistazo.
export function timeLeftLabel(endsAt: Date, now: Date = new Date()): string {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return "Cerrada";

  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `Cierra en ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Cierra en ${hours} h ${minutes % 60} min`;

  const days = Math.floor(hours / 24);
  return `Cierra en ${days} ${days === 1 ? "día" : "días"} ${hours % 24} h`;
}

/// Umbrales de urgencia del cierre, en minutos.
export const URGENCY_FINAL_MINUTES = 10;
export const URGENCY_SOON_MINUTES = 180;

export type Urgency = "closed" | "final" | "soon" | "normal";

/**
 * Qué tan apremiante es el cierre.
 *
 * `final` es la ventana en la que todavía se puede reaccionar a una oferta y en
 * la que el anti-francotirador entra en juego: se muestra en rojo y contando al
 * segundo, porque es el único momento en que los segundos importan.
 */
export function urgencyOf(endsAt: Date, now: Date = new Date()): Urgency {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return "closed";
  if (ms <= URGENCY_FINAL_MINUTES * 60_000) return "final";
  if (ms <= URGENCY_SOON_MINUTES * 60_000) return "soon";
  return "normal";
}

/// Cuenta regresiva compacta. En los últimos minutos muestra mm:ss; antes, la
/// unidad más grande, que es lo único que se lee de un vistazo.
export function countdownLabel(endsAt: Date, now: Date = new Date()): string {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return "Cerrada";

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  if (days > 0) return `${days}d ${hours}h`;
  if (totalSeconds >= URGENCY_FINAL_MINUTES * 60) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/// Cada cuánto conviene refrescar la cuenta regresiva según lo que falte.
export function countdownInterval(urgency: Urgency): number {
  if (urgency === "final") return 1000;
  if (urgency === "soon") return 30_000;
  return 60_000;
}
