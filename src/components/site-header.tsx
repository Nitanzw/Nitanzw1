import Link from "next/link";
import { Heart, MessageCircle, Plus, User2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/search-bar";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-2xl font-black tracking-tight">
          <span className="text-brand-600">ok</span>
          <span className="text-ink-900">tienda</span>
          <span className="text-brand-600">.cl</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/mi-cuenta/favoritos"
                className="hidden rounded-lg p-2 text-ink-700 hover:bg-slate-100 sm:block"
                aria-label="Favoritos"
              >
                <Heart className="size-5" />
              </Link>
              <Link
                href="/mi-cuenta/mensajes"
                className="hidden rounded-lg p-2 text-ink-700 hover:bg-slate-100 sm:block"
                aria-label="Mensajes"
              >
                <MessageCircle className="size-5" />
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 lg:block"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/mi-cuenta"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-100"
              >
                <User2 className="size-5" />
                <span className="hidden lg:inline">{user.name.split(" ")[0]}</span>
              </Link>
            </>
          ) : (
            <Link
              href="/ingresar"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-100"
            >
              Ingresar
            </Link>
          )}

          <Link
            href="/publicar"
            className="ml-1 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-4"
          >
            <Plus className="size-4" />
            Publicar
          </Link>
        </nav>
      </div>

      <div className="border-t border-slate-100 px-4 pb-2 md:hidden">
        <SearchBar />
      </div>

      <div className="no-scrollbar overflow-x-auto border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 py-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/buscar?categoria=${category.slug}`}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
