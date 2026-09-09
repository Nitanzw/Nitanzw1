import Link from "next/link";
import { Clock, Gavel, ImageIcon, MapPin, Star } from "lucide-react";
import { formatPrice, formatRelativeDate, listingHref } from "@/lib/utils";
import { timeLeftLabel } from "@/lib/auctions";
import type { Currency, PriceType } from "@prisma/client";

export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  currency: Currency;
  priceType: PriceType;
  featuredUntil: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  images: { url: string; thumbnailUrl: string | null }[];
  commune: { name: string } | null;
  auction?: { status: string; endsAt: Date; _count: { bids: number } } | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  // Una sola lectura del reloj para todo el render de la tarjeta.
  const now = new Date();
  const featured = listing.featuredUntil ? listing.featuredUntil > now : false;
  const auctionOpen = listing.auction?.status === "ACTIVE" && listing.auction.endsAt > now;
  // Menos de 3 horas: se marca en rojo, porque es cuando conviene actuar.
  const closingSoon =
    auctionOpen && listing.auction!.endsAt.getTime() - now.getTime() < 3 * 60 * 60 * 1000;
  const cover = listing.images[0]?.thumbnailUrl ?? listing.images[0]?.url;

  return (
    <Link
      href={listingHref(listing)}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
        {cover ? (
           
          <img
            src={cover}
            alt={listing.title}
            className="size-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageIcon className="size-10" />
          </div>
        )}
        {auctionOpen && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
            <Gavel className="size-3" /> Subasta
          </span>
        )}
        {featured && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">
            <Star className="size-3 fill-current" /> Destacado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-lg font-bold text-ink-900">
          {formatPrice(listing.price, listing.currency, listing.priceType)}
        </p>
        {auctionOpen && (
          <p className="-mt-1 flex flex-wrap items-center gap-x-2 text-xs font-medium">
            <span className="text-amber-700">
              {listing.auction?._count.bids === 0
                ? "Sin ofertas"
                : `${listing.auction?._count.bids} ${listing.auction?._count.bids === 1 ? "oferta" : "ofertas"}`}
            </span>
            <span className={`flex items-center gap-1 ${closingSoon ? "text-red-600" : "text-ink-500"}`}>
              <Clock className="size-3" />
              {timeLeftLabel(listing.auction!.endsAt, now).replace("Cierra en ", "")}
            </span>
          </p>
        )}
        <h3 className="line-clamp-2 text-sm text-ink-700">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-ink-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="size-3.5 shrink-0" />
            {listing.commune?.name ?? "Chile"}
          </span>
          <span className="shrink-0">{formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
