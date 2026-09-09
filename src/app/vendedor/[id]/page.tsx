import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, CalendarDays, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { ReputationBadge } from "@/components/rating-stars";
import { ReviewList } from "@/components/review-list";
import { reputationOf } from "@/lib/reputation";
import { features } from "@/lib/features";
import { getCurrentUser } from "@/lib/auth";
import { ReportUser } from "@/components/report-user";

export const dynamic = "force-dynamic";

const CARD_SELECT = {
  id: true, slug: true, title: true, price: true, currency: true, priceType: true,
  featuredUntil: true, publishedAt: true, createdAt: true,
  commune: { select: { name: true } },
  images: { select: { url: true, thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1 },
  auction: { select: { status: true, endsAt: true, _count: { select: { bids: true } } } },
} as const;

async function getSeller(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      emailVerified: true,
      phoneVerified: true,
      blockedAt: true,
      createdAt: true,
      ratingCount: true,
      ratingSum: true,
      listings: {
        where: { status: "ACTIVE" },
        orderBy: [{ featuredUntil: "desc" }, { publishedAt: "desc" }],
        take: 48,
        select: CARD_SELECT,
      },
      _count: { select: { listings: { where: { status: "ACTIVE" } } } },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          dealDone: true,
          reply: true,
          createdAt: true,
          role: true,
          author: { select: { id: true, name: true } },
          listing: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSeller(id);
  return { title: seller ? `Avisos de ${seller.name}` : "Vendedor" };
}

/// Perfil público de un vendedor: sus avisos activos y sus señales de confianza.
/// No expone correo ni teléfono; el contacto pasa siempre por la ficha del aviso.
export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [seller, viewer] = await Promise.all([getSeller(id), getCurrentUser()]);
  // Una cuenta suspendida deja de tener vitrina pública.
  if (!seller || seller.blockedAt) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
          {seller.name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900">
            {seller.name}
            {seller.emailVerified && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                <BadgeCheck className="size-3.5" /> Correo verificado
              </span>
            )}
            {seller.phoneVerified && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                <BadgeCheck className="size-3.5" /> Teléfono verificado
              </span>
            )}
          </h1>
          {features.reviews && (
            <div className="mt-1">
              <ReputationBadge reputation={reputationOf(seller)} size="md" />
            </div>
          )}
          {seller.bio && <p className="mt-2 max-w-2xl text-sm text-ink-700">{seller.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-500">
            <span className="flex items-center gap-1">
              <Package className="size-4" /> {seller._count.listings} avisos activos
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" />
              En oktienda desde {seller.createdAt.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </header>

      {features.reviews && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink-900">
            Calificaciones ({seller.reviewsReceived.length})
          </h2>
          <div className="mt-4">
            <ReviewList reviews={seller.reviewsReceived} />
          </div>
        </section>
      )}

      {viewer && viewer.id !== seller.id && (
        <div className="mt-6">
          <ReportUser subjectId={seller.id} name={seller.name} />
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold text-ink-900">Sus publicaciones</h2>
      {seller.listings.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-ink-500">
          Este vendedor no tiene avisos activos en este momento.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {seller.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
