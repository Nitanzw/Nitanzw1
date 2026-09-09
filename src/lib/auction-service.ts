import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkBid, extendedEndsAt, nextMinimumBid, resolveOutcome, type AuctionState } from "@/lib/auctions";

/**
 * Lado de base de datos de las subastas.
 *
 * Lo delicado acá es la concurrencia: dos personas ofertando en el mismo
 * instante no pueden quedar ambas como ganadoras ni saltarse el incremento
 * mínimo. Por eso cada oferta se registra en una transacción SERIALIZABLE que
 * vuelve a leer la oferta más alta adentro; si Postgres detecta el conflicto,
 * se reintenta y la segunda oferta se valida contra la primera.
 */

const MAX_RETRIES = 3;

export type PlaceBidResult =
  | { ok: true; amount: number; endsAt: Date; extended: boolean; outbidUserId: string | null }
  | { ok: false; message: string; minimum: number };

/// Estado de la subasta tal como lo necesitan las reglas puras.
async function loadState(
  auctionId: string,
  client: Prisma.TransactionClient,
): Promise<(AuctionState & { id: string; listingId: string }) | null> {
  const auction = await client.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      listingId: true,
      status: true,
      startPrice: true,
      minIncrement: true,
      reservePrice: true,
      endsAt: true,
      extensionMinutes: true,
      listing: { select: { userId: true } },
    },
  });
  if (!auction) return null;

  const highest = await client.bid.findFirst({
    where: { auctionId },
    orderBy: { amount: "desc" },
    select: { amount: true, bidderId: true },
  });

  return {
    id: auction.id,
    listingId: auction.listingId,
    status: auction.status,
    startPrice: auction.startPrice,
    minIncrement: auction.minIncrement,
    reservePrice: auction.reservePrice,
    endsAt: auction.endsAt,
    extensionMinutes: auction.extensionMinutes,
    sellerId: auction.listing.userId,
    highestBid: highest ? { amount: highest.amount, bidderId: highest.bidderId } : null,
  };
}

export async function placeBid(
  auctionId: string,
  bidderId: string,
  amount: number,
): Promise<PlaceBidResult> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const state = await loadState(auctionId, tx);
          if (!state) return { ok: false as const, message: "La subasta no existe", minimum: 0 };

          const check = checkBid(state, { bidderId, amount });
          if (!check.ok) return { ok: false as const, message: check.message, minimum: check.minimum };

          const now = new Date();
          const endsAt = extendedEndsAt(state, now);
          const extended = endsAt.getTime() !== state.endsAt.getTime();

          await tx.bid.create({ data: { auctionId, bidderId, amount } });
          if (extended) {
            await tx.auction.update({ where: { id: auctionId }, data: { endsAt } });
          }

          return {
            ok: true as const,
            amount,
            endsAt,
            extended,
            // Para avisarle a quien acaba de perder la delantera.
            outbidUserId: state.highestBid?.bidderId ?? null,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // P2034: conflicto de escritura entre transacciones. La otra oferta ganó
      // la carrera; al reintentar, esta se valida contra el nuevo máximo.
      const isConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isConflict || attempt === MAX_RETRIES) {
        if (isConflict) {
          return {
            ok: false,
            message: "Otra persona ofertó al mismo tiempo. Vuelve a intentarlo.",
            minimum: 0,
          };
        }
        throw error;
      }
    }
  }

  return { ok: false, message: "No pudimos registrar tu oferta. Inténtalo de nuevo.", minimum: 0 };
}

export type ClosedAuction = {
  auctionId: string;
  listingId: string;
  listingTitle: string;
  status: "WON" | "NO_BIDS" | "RESERVE_NOT_MET";
  sellerId: string;
  winnerId: string | null;
  amount: number | null;
  conversationId: string | null;
};

/**
 * Cierra una subasta vencida y, si hubo ganador, abre la conversación entre
 * vendedor y ganador con un mensaje automático. Ese contacto es el producto
 * final: no hay cobro, y después ambos se califican como en cualquier venta.
 *
 * Es idempotente: solo actúa sobre subastas que sigan ACTIVE.
 */
export async function closeAuction(auctionId: string): Promise<ClosedAuction | null> {
  return prisma.$transaction(async (tx) => {
    const state = await loadState(auctionId, tx);
    if (!state || state.status !== "ACTIVE") return null;
    if (state.endsAt > new Date()) return null;

    const listing = await tx.listing.findUniqueOrThrow({
      where: { id: state.listingId },
      select: { id: true, title: true, userId: true },
    });

    const outcome = resolveOutcome(state);

    await tx.auction.update({
      where: { id: auctionId },
      data: { status: outcome.status, winnerId: outcome.winnerId, closedAt: new Date() },
    });

    let conversationId: string | null = null;

    if (outcome.status === "WON" && outcome.winnerId) {
      const conversation = await tx.conversation.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: outcome.winnerId } },
        update: { updatedAt: new Date() },
        create: { listingId: listing.id, buyerId: outcome.winnerId, sellerId: listing.userId },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          system: true,
          body: `Subasta cerrada: la oferta ganadora fue de $${outcome.amount?.toLocaleString("es-CL")}. Pónganse de acuerdo por acá para concretar la entrega. Cuando terminen, recuerden calificarse.`,
        },
      });

      conversationId = conversation.id;
    }

    return {
      auctionId,
      listingId: listing.id,
      listingTitle: listing.title,
      status: outcome.status,
      sellerId: listing.userId,
      winnerId: outcome.winnerId,
      amount: outcome.amount,
      conversationId,
    };
  });
}

/// Subastas vencidas que siguen abiertas. Las cierra el cron.
export async function auctionsDueToClose(limit = 100): Promise<string[]> {
  const auctions = await prisma.auction.findMany({
    where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    orderBy: { endsAt: "asc" },
    take: limit,
    select: { id: true },
  });
  return auctions.map((auction) => auction.id);
}

/// Datos de la subasta para mostrarla en la ficha del aviso.
export async function auctionForListing(listingId: string) {
  const auction = await prisma.auction.findUnique({
    where: { listingId },
    include: {
      bids: {
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        take: 15,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          bidder: { select: { id: true, name: true } },
        },
      },
      _count: { select: { bids: true } },
    },
  });
  if (!auction) return null;

  const highest = auction.bids[0] ?? null;
  const state: AuctionState = {
    status: auction.status,
    startPrice: auction.startPrice,
    minIncrement: auction.minIncrement,
    reservePrice: auction.reservePrice,
    endsAt: auction.endsAt,
    extensionMinutes: auction.extensionMinutes,
    sellerId: "",
    highestBid: highest ? { amount: highest.amount, bidderId: highest.bidder.id } : null,
  };

  return { auction, state, minimum: nextMinimumBid(state) };
}

export type ClosingSoonNotice = {
  auctionId: string;
  listingId: string;
  listingTitle: string;
  minutesLeft: number;
  highestAmount: number;
  /// Cada persona que ofertó, y si va ganando.
  bidders: { userId: string; name: string; email: string; winning: boolean }[];
};

/**
 * Subastas que cierran dentro de la ventana indicada y a las que todavía no se
 * les avisó. Devuelve a quiénes hay que escribirles y si van ganando: es el
 * momento en que un aviso sirve de algo, porque una oferta a esta altura
 * todavía extiende el cierre.
 */
export async function auctionsClosingSoon(minutes = 60): Promise<ClosingSoonNotice[]> {
  const now = new Date();

  const auctions = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      closingSoonNotifiedAt: null,
      endsAt: { gt: now, lte: new Date(now.getTime() + minutes * 60_000) },
      bids: { some: {} },
    },
    include: {
      listing: { select: { id: true, title: true } },
      bids: {
        orderBy: { amount: "desc" },
        select: { amount: true, bidder: { select: { id: true, name: true, email: true, blockedAt: true } } },
      },
    },
  });

  return auctions.map((auction) => {
    const highest = auction.bids[0];
    const vistos = new Set<string>();
    const bidders = auction.bids
      .filter((bid) => {
        if (bid.bidder.blockedAt || vistos.has(bid.bidder.id)) return false;
        vistos.add(bid.bidder.id);
        return true;
      })
      .map((bid) => ({
        userId: bid.bidder.id,
        name: bid.bidder.name,
        email: bid.bidder.email,
        winning: bid.bidder.id === highest.bidder.id,
      }));

    return {
      auctionId: auction.id,
      listingId: auction.listing.id,
      listingTitle: auction.listing.title,
      minutesLeft: Math.max(1, Math.round((auction.endsAt.getTime() - now.getTime()) / 60_000)),
      highestAmount: highest.amount,
      bidders,
    };
  });
}

export async function markClosingSoonNotified(auctionId: string): Promise<void> {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { closingSoonNotifiedAt: new Date() },
  });
}
