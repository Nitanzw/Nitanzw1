import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PublishForm } from "@/components/publish-form";
import { features } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicar un aviso" };

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/publicar");

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-900">Publica tu aviso</h1>
      <p className="mt-1 text-sm text-ink-500">
        Es gratis y queda online al instante. Mientras mejores fotos y datos, más rápido vendes.
      </p>
      <PublishForm
        categories={categories}
        regions={regions}
        defaultPhone={user.phone ?? ""}
        auctionsEnabled={features.auctions}
      />
    </div>
  );
}
