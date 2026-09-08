import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Eye, Heart, MapPin, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { describeAttribute } from "@/lib/verticals";
import { formatPrice, formatRelativeDate, idFromListingParam, whatsappNumber } from "@/lib/utils";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import { incrementViews } from "@/app/actions/listings";
import { Gallery } from "@/components/gallery";
import { ContactSeller } from "@/components/contact-seller";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

async function getListing(param: string) {
  return prisma.listing.findUnique({
    where: { id: idFromListingParam(param) },
    include: {
      images: { orderBy: { position: "asc" } },
      category: { include: { parent: true } },
      commune: { include: { region: true } },
      user: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Aviso no encontrado" };

  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: listing.images[0]?.url ? [listing.images[0].url] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, user] = await Promise.all([getListing(slug), getCurrentUser()]);
  if (!listing || listing.status === "DRAFT" || listing.status === "REJECTED") notFound();

  const isOwner = user?.id === listing.userId;
  if (!isOwner) await incrementViews(listing.id);

  const favorite = user
    ? await prisma.favorite.findUnique({
        where: { userId_listingId: { userId: user.id, listingId: listing.id } },
      })
    : null;

  const attributes = Object.entries((listing.attributes ?? {}) as Record<string, unknown>)
    .map(([key, value]) => describeAttribute(listing.category.vertical, key, value))
    .filter((item): item is { label: string; value: string } => item !== null);

  const related = await prisma.listing.findMany({
    where: { status: "ACTIVE", categoryId: listing.categoryId, id: { not: listing.id } },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: {
      id: true, slug: true, title: true, price: true, currency: true, priceType: true,
      featuredUntil: true, publishedAt: true, createdAt: true,
      commune: { select: { name: true } },
      images: { select: { url: true, thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-700">Inicio</Link>
        {listing.category.parent && (
          <>
            <span>/</span>
            <Link href={`/buscar?categoria=${listing.category.parent.slug}`} className="hover:text-brand-700">
              {listing.category.parent.name}
            </Link>
          </>
        )}
        <span>/</span>
        <Link href={`/buscar?categoria=${listing.category.slug}`} className="hover:text-brand-700">
          {listing.category.name}
        </Link>
      </nav>

      {listing.status !== "ACTIVE" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este aviso está {listing.status === "SOLD" ? "marcado como vendido" : "pausado o vencido"}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Gallery images={listing.images} title={listing.title} />

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{listing.title}</h1>
                <p className="mt-2 text-3xl font-black text-brand-700">
                  {formatPrice(listing.price, listing.currency, listing.priceType)}
                </p>
              </div>

              <form action={toggleFavoriteAction}>
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="from" value={`/aviso/${slug}`} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink-700 hover:border-red-300 hover:text-red-600"
                >
                  <Heart className={`size-4 ${favorite ? "fill-red-500 text-red-500" : ""}`} />
                  {favorite ? "Guardado" : "Guardar"}
                </button>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {listing.commune ? `${listing.commune.name}, ${listing.commune.region.name}` : "Chile"}
              </span>
              <span>Publicado {formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Eye className="size-4" />
                {listing.views} visitas
              </span>
              {listing.condition && <span>{listing.condition === "NEW" ? "Nuevo" : "Usado"}</span>}
            </div>
          </section>

          {attributes.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-ink-900">Características</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {attributes.map((attribute) => (
                  <div key={attribute.label} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <dt className="text-ink-500">{attribute.label}</dt>
                    <dd className="font-medium text-ink-900">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-ink-900">Descripción</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {listing.description}
            </p>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-4" /> Compra con seguridad
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Prefiere lugares públicos y con testigos para concretar la entrega.</li>
              <li>Revisa el producto antes de pagar y desconfía de precios muy bajos.</li>
              <li>oktienda.cl nunca te pedirá transferencias anticipadas ni códigos por mensaje.</li>
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-ink-500">Publicado por</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                {listing.user.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{listing.user.name}</p>
                <p className="text-xs text-ink-500">
                  En oktienda desde {listing.user.createdAt.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {isOwner ? (
              <Link
                href="/mi-cuenta"
                className="mt-4 block rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-ink-700 hover:bg-slate-50"
              >
                Administrar mi aviso
              </Link>
            ) : (
              <div className="mt-4 space-y-2">
                {listing.contactPhone && (
                  <a
                    href={`tel:${listing.contactPhone}`}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-50"
                  >
                    <Phone className="size-4" /> {listing.contactPhone}
                  </a>
                )}
                {listing.contactPhone && listing.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${whatsappNumber(listing.contactPhone)}?text=${encodeURIComponent(
                      `Hola, vi tu aviso "${listing.title}" en oktienda.cl`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
                  >
                    <MessageCircle className="size-4" /> Escribir por WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {!isOwner && listing.allowMessages && (
            <ContactSeller listingId={listing.id} loggedIn={Boolean(user)} slug={slug} />
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink-900">Avisos similares</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
