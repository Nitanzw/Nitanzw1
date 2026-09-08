import Link from "next/link";
import { MessagesSquare, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { HomeSearch } from "@/components/home-search";
import { features } from "@/lib/features";

export const dynamic = "force-dynamic";

const LISTING_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  price: true,
  currency: true,
  priceType: true,
  featuredUntil: true,
  publishedAt: true,
  createdAt: true,
  commune: { select: { name: true } },
  images: { select: { url: true, thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1 },
} as const;

export default async function HomePage() {
  const [categories, featured, recent, regions] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: { id: true, slug: true, name: true, icon: true, _count: { select: { listings: true } } },
    }),
    prisma.listing.findMany({
      where: { status: "ACTIVE", featuredUntil: { gt: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: LISTING_CARD_SELECT,
    }),
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
      take: 12,
      select: LISTING_CARD_SELECT,
    }),
    prisma.region.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <section className="bg-linear-to-br from-brand-700 via-brand-600 to-emerald-500 px-4 py-14 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Compra y vende cerca tuyo
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-brand-50">
            Miles de avisos de autos, propiedades, tecnología y servicios en todo Chile.
            Publicar es gratis y el contacto es directo.
          </p>
          <div className="mt-7">
            <HomeSearch regions={regions} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-lg font-bold text-ink-900">Explora por categoría</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/buscar?categoria=${category.slug}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900">{category.name}</span>
                <span className="block text-xs text-ink-500">{category._count.listings} avisos</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-bold text-ink-900">Avisos destacados</h2>
            <Link href="/buscar?orden=destacados" className="text-sm font-medium text-brand-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-ink-900">Publicados recientemente</h2>
          <Link href="/buscar" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-ink-500">
            Todavía no hay avisos publicados.{" "}
            <Link href="/publicar" className="font-semibold text-brand-700 hover:underline">
              Sé el primero en publicar
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Publica en 2 minutos", text: "Sin comisiones ni intermediarios: tu aviso queda online al instante." },
            { icon: ShieldCheck, title: "Contacto directo y seguro", text: "Chat interno o WhatsApp. Tus datos personales quedan protegidos." },
            features.payments
              ? { icon: Sparkles, title: "Destaca cuando quieras", text: "Impulsa tu aviso al tope de los resultados y véndelo más rápido." }
              : { icon: MessagesSquare, title: "Vende con reputación", text: "Cada trato se califica, así sabes con quién estás tratando antes de contactar." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <item.icon className="size-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
