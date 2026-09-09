"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { features } from "@/lib/features";
import { placeBid } from "@/lib/auction-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendOutbidEmail } from "@/lib/emails";
import { listingHref } from "@/lib/utils";

export type BidState = { error?: string; ok?: boolean; amount?: number; extended?: boolean } | undefined;

const bidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});

/// Ofertar en una subasta. Toda la validación real ocurre dentro de la
/// transacción de placeBid; acá solo se filtra lo evidente.
export async function placeBidAction(_state: BidState, formData: FormData): Promise<BidState> {
  if (!features.auctions) return { error: "Las subastas no están disponibles" };

  const user = await getCurrentUser();
  if (!user) {
    const back = String(formData.get("from") ?? "/");
    redirect(`/ingresar?next=${encodeURIComponent(back)}`);
  }

  const parsed = bidSchema.safeParse({
    auctionId: formData.get("auctionId"),
    amount: String(formData.get("amount") ?? "").replace(/\./g, ""),
  });
  if (!parsed.success) return { error: "Ingresa un monto válido" };

  const limit = checkRateLimit(`bid:${user.id}`, 30, 300);
  if (!limit.allowed) return { error: "Ofertaste muchas veces seguidas. Espera un momento." };

  const result = await placeBid(parsed.data.auctionId, user.id, parsed.data.amount);
  if (!result.ok) return { error: result.message };

  // Avisarle a quien perdió la delantera, para que pueda responder.
  if (result.outbidUserId) {
    const [outbid, auction] = await Promise.all([
      prisma.user.findUnique({ where: { id: result.outbidUserId }, select: { name: true, email: true } }),
      prisma.auction.findUnique({
        where: { id: parsed.data.auctionId },
        select: { endsAt: true, listing: { select: { id: true, slug: true, title: true } } },
      }),
    ]);

    if (outbid && auction) {
      await sendOutbidEmail(outbid, {
        listingTitle: auction.listing.title,
        listingHref: listingHref(auction.listing),
        amount: result.amount,
        endsAt: auction.endsAt,
      });
    }
  }

  const auction = await prisma.auction.findUnique({
    where: { id: parsed.data.auctionId },
    select: { listing: { select: { id: true, slug: true } } },
  });
  if (auction) revalidatePath(listingHref(auction.listing));
  revalidatePath("/mi-cuenta/ofertas");

  return { ok: true, amount: result.amount, extended: result.extended };
}

/// El vendedor cancela su subasta. Solo si nadie ofertó todavía: cancelar con
/// ofertas encima sería quitarle la palabra a quien confió en el remate.
export async function cancelAuctionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const auctionId = String(formData.get("auctionId") ?? "");
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { status: true, listing: { select: { id: true, slug: true, userId: true } }, _count: { select: { bids: true } } },
  });

  if (!auction || auction.listing.userId !== user.id) return;
  if (auction.status !== "ACTIVE" || auction._count.bids > 0) return;

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "CANCELLED", closedAt: new Date() },
  });

  revalidatePath("/mi-cuenta");
  revalidatePath(listingHref(auction.listing));
}
