import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auctionsDueToClose, closeAuction } from "@/lib/auction-service";
import { sendAuctionClosedEmail } from "@/lib/emails";
import { listingHref } from "@/lib/utils";

/**
 * Cierra las subastas vencidas.
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
    auctionsClosed: closed,
    withWinner,
  });
}
