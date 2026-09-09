import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auctionsClosingSoon,
  auctionsDueToClose,
  closeAuction,
  markClosingSoonNotified,
} from "@/lib/auction-service";
import { sendAuctionClosedEmail, sendAuctionClosingSoonEmail } from "@/lib/emails";
import { notify, notifyMany } from "@/lib/notifications";
import { listingHref } from "@/lib/utils";

/**
 * Cierra las subastas vencidas y avisa a quienes ofertaron en las que están por
 * cerrar.
 *
 * Conviene correrlo seguido (cada 5 minutos): mientras no corra, una subasta
 * vencida se ve cerrada para quien la mira —las ofertas se rechazan por fecha—
 * pero el contacto con el ganador todavía no se abrió.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/subastas
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";

  if (!authorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Primero el aviso de "cierra pronto": si la subasta ya venció no tiene
  // sentido avisar, y cerrarla primero la sacaría de la lista.
  let closingSoonEmails = 0;
  for (const notice of await auctionsClosingSoon()) {
    const listing = await prisma.listing.findUnique({
      where: { id: notice.listingId },
      select: { id: true, slug: true },
    });
    if (!listing) continue;

    await notifyMany(
      notice.bidders.map((bidder) => ({
        userId: bidder.userId,
        type: "AUCTION_CLOSING" as const,
        title: bidder.winning ? "Vas ganando y la subasta cierra pronto" : "Última oportunidad de ofertar",
        body: `${notice.listingTitle} — cierra en ${notice.minutesLeft} minutos, va en $${notice.highestAmount.toLocaleString("es-CL")}`,
        url: listingHref(listing),
      })),
    );

    for (const bidder of notice.bidders) {
      const sent = await sendAuctionClosingSoonEmail(bidder, {
        listingTitle: notice.listingTitle,
        listingHref: listingHref(listing),
        minutesLeft: notice.minutesLeft,
        winning: bidder.winning,
        currentAmount: notice.highestAmount,
      });
      if (sent) closingSoonEmails += 1;
    }

    await markClosingSoonNotified(notice.auctionId);
  }

  const pending = await auctionsDueToClose();
  let closed = 0;
  let withWinner = 0;

  for (const auctionId of pending) {
    const result = await closeAuction(auctionId);
    if (!result) continue;
    closed += 1;

    const listing = await prisma.listing.findUnique({
      where: { id: result.listingId },
      select: { id: true, slug: true },
    });
    const href = listing ? listingHref(listing) : "/";

    const [seller, winner] = await Promise.all([
      prisma.user.findUnique({ where: { id: result.sellerId }, select: { name: true, email: true } }),
      result.winnerId
        ? prisma.user.findUnique({ where: { id: result.winnerId }, select: { name: true, email: true } })
        : Promise.resolve(null),
    ]);

    await notify({
      userId: result.sellerId,
      type: "AUCTION_CLOSED",
      title:
        result.status === "WON"
          ? "Tu subasta cerró con ganador"
          : result.status === "NO_BIDS"
            ? "Tu subasta cerró sin ofertas"
            : "Tu subasta cerró bajo el precio de reserva",
      body:
        result.status === "WON"
          ? `${result.listingTitle} — $${result.amount?.toLocaleString("es-CL")}. Ya abrimos la conversación con el ganador.`
          : result.listingTitle,
      url: result.conversationId ? `/mi-cuenta/mensajes/${result.conversationId}` : href,
    });

    if (result.winnerId) {
      await notify({
        userId: result.winnerId,
        type: "AUCTION_WON",
        title: "¡Ganaste la subasta!",
        body: `${result.listingTitle} — $${result.amount?.toLocaleString("es-CL")}. Coordina la entrega con el vendedor.`,
        url: result.conversationId ? `/mi-cuenta/mensajes/${result.conversationId}` : href,
      });
    }

    if (seller) {
      await sendAuctionClosedEmail(seller, {
        listingTitle: result.listingTitle,
        listingHref: href,
        role: "SELLER",
        status: result.status,
        amount: result.amount,
        conversationId: result.conversationId,
      });
    }

    if (winner) {
      withWinner += 1;
      await sendAuctionClosedEmail(winner, {
        listingTitle: result.listingTitle,
        listingHref: href,
        role: "WINNER",
        status: result.status,
        amount: result.amount,
        conversationId: result.conversationId,
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    closingSoonEmails,
    auctionsClosed: closed,
    withWinner,
  });
}
