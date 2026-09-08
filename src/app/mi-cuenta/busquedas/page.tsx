import Link from "next/link";
import type { Metadata } from "next";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatRelativeDate } from "@/lib/utils";
import { deleteSavedSearchAction, toggleSearchAlertsAction } from "@/app/actions/saved-searches";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Búsquedas guardadas" };

export default async function SavedSearchesPage() {
  const user = await requireUser();
  const searches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (searches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">No tienes búsquedas guardadas</p>
        <p className="mt-1 text-sm text-ink-500">
          Aplica los filtros que te interesan y toca “Guardar búsqueda” en los resultados.
          Te avisamos por correo cuando aparezcan avisos nuevos que calcen.
        </p>
        <Link
          href="/buscar"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Ir a buscar
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {searches.map((search) => (
        <div key={search.id} className="flex items-center gap-2 p-4">
          <Search className="size-5 shrink-0 text-ink-500" />
          <div className="min-w-0 flex-1">
            <Link href={`/buscar?${search.query}`} className="font-medium text-ink-900 hover:text-brand-700">
              {search.name}
            </Link>
            <p className="truncate text-xs text-ink-500">
              Guardada {formatRelativeDate(search.createdAt)}
              {search.alerts ? " · te avisamos por correo" : " · sin avisos"}
            </p>
          </div>
          <form action={toggleSearchAlertsAction}>
            <input type="hidden" name="id" value={search.id} />
            <button
              className={`rounded-lg border p-2 ${
                search.alerts
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-ink-500 hover:bg-slate-50"
              }`}
              aria-label={search.alerts ? `Desactivar avisos de ${search.name}` : `Activar avisos de ${search.name}`}
              title={search.alerts ? "Avisos activados" : "Avisos desactivados"}
            >
              {search.alerts ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </button>
          </form>
          <form action={deleteSavedSearchAction}>
            <input type="hidden" name="id" value={search.id} />
            <button
              className="rounded-lg border border-slate-200 p-2 text-ink-500 hover:border-red-200 hover:text-red-600"
              aria-label={`Eliminar ${search.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
