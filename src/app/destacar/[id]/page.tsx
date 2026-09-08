import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { formatPrice, listingHref } from "@/lib/utils";
import { PlanPicker } from "@/components/plan-picker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Destacar aviso" };

export default async function FeaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/destacar/${id}`)}`);

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      userId: true,
      featuredUntil: true,
      images: { take: 1, orderBy: { position: "asc" }, select: { thumbnailUrl: true, url: true } },
    },
  });

  if (!listing) notFound();
  if (listing.userId !== user.id) redirect("/mi-cuenta");

  const activeUntil = listing.featuredUntil && listing.featuredUntil > new Date() ? listing.featuredUntil : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/mi-cuenta" className="text-sm text-ink-500 hover:text-brand-700">
        ← Volver a mis avisos
      </Link>

      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-ink-900">
        <Star className="size-6 fill-amber-400 text-amber-400" /> Destaca tu aviso
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Los avisos destacados aparecen primero en los resultados de búsqueda y en la portada,
        con un sello que los diferencia del resto.
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {listing.images[0] && (
             
            <img
              src={listing.images[0].thumbnailUrl ?? listing.images[0].url}
              alt=""
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <Link href={listingHref(listing)} className="font-semibold text-ink-900 hover:text-brand-700">
            {listing.title}
          </Link>
          {activeUntil && (
            <p className="text-sm text-amber-700">
              Ya está destacado hasta el {activeUntil.toLocaleDateString("es-CL")}. Los días que
              compres ahora se suman al final.
            </p>
          )}
        </div>
      </div>

      <PlanPicker
        listingId={listing.id}
        plans={PLANS.map((plan) => ({ ...plan, priceLabel: formatPrice(plan.price) }))}
      />

      <p className="mt-6 text-xs text-ink-500">
        El cobro es por una sola vez, no es una suscripción. Recibirás la boleta en tu correo.
      </p>
    </div>
  );
}
