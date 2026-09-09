import Link from "next/link";
import type { Metadata } from "next";
import { Gavel } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatPrice, listingHref } from "@/lib/utils";
import { timeLeftLabel } from "@/lib/auctions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis ofertas" };

const ESTADO: Record<string, string> = {
  WON: "Cerrada con ganador",
  NO_BIDS: "Cerrada sin ofertas",
  RESERVE_NOT_MET: "Cerrada bajo la reserva",
  CANCELLED: "Cancelada por el vendedor",
};

/// Subastas en las que el usuario ofertó, y si va ganando.
export default async function MyBidsPage() {
  const user = await requireUser();

  const auctions = await prisma.auction.findMany({
    where: { bids: { some: { bidderId: user.id } } },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
    include: {
      listing: { select: { id: true, slug: true, title: true } },
      bids: { orderBy: { amount: "desc" }, take: 1, select: { amount: true, bidderId: true } },
      _count: { select: { bids: true } },
    },
  });

  if (auctions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">No has ofertado en ninguna subasta</p>
        <p className="mt-1 text-sm text-ink-500">
          Cuando ofertes, acá verás si vas ganando y cuánto falta para el cierre.
        </p>
        <Link
          href="/buscar"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Ver avisos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {auctions.map((auction) => {
        const highest = auction.bids[0];
        const winning = highest?.bidderId === user.id;
        const open = auction.status === "ACTIVE" && auction.endsAt > new Date();

        return (
          <div key={auction.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <Gavel className="size-5 shrink-0 text-amber-500" />

            <div className="min-w-0 flex-1">
              <Link href={listingHref(auction.listing)} className="font-semibold text-ink-900 hover:text-brand-700">
                {auction.listing.title}
              </Link>
              <p className="text-sm text-ink-700">
                {formatPrice(highest?.amount ?? auction.startPrice)} ·{" "}
                {auction._count.bids} {auction._count.bids === 1 ? "oferta" : "ofertas"}
              </p>
              <p className="text-xs text-ink-500">
                {open ? timeLeftLabel(auction.endsAt) : ESTADO[auction.status] ?? "Cerrada"}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                open
                  ? winning
                    ? "bg-brand-50 text-brand-700"
                    : "bg-slate-100 text-ink-700"
                  : auction.winnerId === user.id
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-ink-500"
              }`}
            >
              {open
                ? winning
                  ? "Vas ganando"
                  : "Te superaron"
                : auction.winnerId === user.id
                  ? "Ganaste"
                  : "No ganaste"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
