import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUser();
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      listing: {
        select: {
          id: true, slug: true, title: true, price: true, currency: true, priceType: true,
          featuredUntil: true, publishedAt: true, createdAt: true,
          commune: { select: { name: true } },
          images: { select: { url: true, thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1 },
  auction: { select: { status: true, endsAt: true, _count: { select: { bids: true } } } },
        },
      },
    },
  });

  if (favorites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">Aún no guardas avisos</p>
        <p className="mt-1 text-sm text-ink-500">Toca el corazón en un aviso para guardarlo aquí.</p>
        <Link
          href="/buscar"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Explorar avisos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {favorites.map(({ listing }) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
