import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { features } from "@/lib/features";
import { listingHref } from "@/lib/utils";
import { PublishForm } from "@/components/publish-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar aviso" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/mi-cuenta/avisos/${id}/editar`)}`);

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      category: { select: { id: true, parentId: true } },
      commune: { select: { id: true, regionId: true } },
      auction: { select: { id: true } },
    },
  });

  if (!listing) notFound();
  // Un aviso ajeno no se edita, y tampoco se filtra su existencia.
  if (listing.userId !== user.id) notFound();

  const [categories, regions] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, vertical: true, parentId: true },
    }),
    prisma.region.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true, communes: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/mi-cuenta" className="text-sm text-ink-500 hover:text-brand-700">
        ← Volver a mis avisos
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-ink-900">Editar aviso</h1>
      <p className="mt-1 text-sm text-ink-500">
        Los cambios se ven al instante en{" "}
        <Link href={listingHref(listing)} className="text-brand-700 hover:underline">
          la ficha del aviso
        </Link>
        . Conserva sus visitas, sus favoritos y su antigüedad.
      </p>

      <PublishForm
        categories={categories}
        regions={regions}
        defaultPhone={user.phone ?? ""}
        auctionsEnabled={features.auctions}
        listing={{
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          priceType: listing.priceType,
          currency: listing.currency,
          condition: listing.condition,
          categoryId: listing.categoryId,
          parentCategoryId: listing.category.parentId,
          regionId: listing.commune?.regionId ?? null,
          communeId: listing.communeId,
          contactPhone: listing.contactPhone,
          contactWhatsapp: listing.contactWhatsapp,
          allowMessages: listing.allowMessages,
          images: listing.images.map((image) => ({
            url: image.url,
            thumbnailUrl: image.thumbnailUrl ?? image.url,
          })),
          attributes: (listing.attributes ?? {}) as Record<string, string | number | boolean>,
          isAuction: Boolean(listing.auction),
        }}
      />
    </div>
  );
}
