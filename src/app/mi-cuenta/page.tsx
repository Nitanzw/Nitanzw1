import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Heart, Plus, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatPrice, formatRelativeDate, listingHref } from "@/lib/utils";
import { updateListingStatusAction } from "@/app/actions/listings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis avisos" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  SOLD: "Vendido",
  EXPIRED: "Vencido",
  DRAFT: "Borrador",
  PENDING: "En revisión",
  REJECTED: "Rechazado",
};

export default async function MyListingsPage() {
  const user = await requireUser();
  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      _count: { select: { favorites: true } },
    },
  });

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">Todavía no tienes avisos</p>
        <p className="mt-1 text-sm text-ink-500">Publica tu primer aviso, es gratis.</p>
        <Link
          href="/publicar"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-4" /> Publicar aviso
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
        >
          <Link href={listingHref(listing)} className="shrink-0">
            <div className="size-24 overflow-hidden rounded-lg bg-slate-100">
              {listing.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.images[0].thumbnailUrl ?? listing.images[0].url} alt="" className="size-full object-cover" />
              ) : null}
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <Link href={listingHref(listing)} className="font-semibold text-ink-900 hover:text-brand-700">
              {listing.title}
            </Link>
            <p className="text-sm text-ink-700">
              {formatPrice(listing.price, listing.currency, listing.priceType)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                {STATUS_LABEL[listing.status]}
              </span>
              {listing.featuredUntil && listing.featuredUntil > new Date() && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  <Star className="size-3 fill-current" />
                  Destacado hasta {listing.featuredUntil.toLocaleDateString("es-CL")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" /> {listing.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" /> {listing._count.favorites}
              </span>
              <span>{formatRelativeDate(listing.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/destacar/${listing.id}`}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              {listing.featuredUntil && listing.featuredUntil > new Date() ? "Extender destacado" : "Destacar"}
            </Link>
            {listing.status === "ACTIVE" ? (
              <StatusButton id={listing.id} action="pause" label="Pausar" />
            ) : (
              <StatusButton id={listing.id} action="activate" label="Activar" />
            )}
            {listing.status !== "SOLD" && (
              <StatusButton id={listing.id} action="sold" label="Marcar vendido" />
            )}
            <StatusButton id={listing.id} action="delete" label="Eliminar" danger />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusButton({
  id,
  action,
  label,
  danger = false,
}: {
  id: string;
  action: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updateListingStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
          danger
            ? "border-red-200 text-red-700 hover:bg-red-50"
            : "border-slate-200 text-ink-700 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
