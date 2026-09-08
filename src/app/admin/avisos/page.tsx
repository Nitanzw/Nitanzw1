import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatRelativeDate, listingHref } from "@/lib/utils";
import { moderateListingAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avisos" };

const FILTERS = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "PAUSED", label: "Pausados" },
  { value: "REJECTED", label: "Bajados" },
  { value: "EXPIRED", label: "Vencidos" },
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;

  const listings = await prisma.listing.findMany({
    where: {
      ...(estado ? { status: estado as never } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { reports: true } },
    },
  });

  return (
    <div>
      <form className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/avisos?estado=${filter.value}` : "/admin/avisos"}
            className={`rounded-lg px-3 py-1.5 ${
              (estado ?? "") === filter.value ? "bg-brand-600 text-white" : "bg-white text-ink-700"
            }`}
          >
            {filter.label}
          </Link>
        ))}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título…"
          className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5"
        />
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="p-3">Aviso</th>
              <th className="p-3">Vendedor</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Denuncias</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="p-3">
                  <Link href={listingHref(listing)} className="font-medium text-ink-900 hover:text-brand-700">
                    {listing.title}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {formatPrice(listing.price, listing.currency, listing.priceType)} ·{" "}
                    {formatRelativeDate(listing.createdAt)}
                  </p>
                </td>
                <td className="p-3 text-ink-700">
                  {listing.user.name}
                  <p className="text-xs text-ink-500">{listing.user.email}</p>
                </td>
                <td className="p-3 text-ink-700">{listing.status}</td>
                <td className="p-3 text-ink-700">{listing._count.reports}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {listing.status === "ACTIVE" ? (
                      <ModerateButton id={listing.id} action="reject" label="Bajar" danger />
                    ) : (
                      <ModerateButton id={listing.id} action="approve" label="Reactivar" />
                    )}
                    <ModerateButton id={listing.id} action="delete" label="Eliminar" danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {listings.length === 0 && (
        <p className="mt-4 text-center text-sm text-ink-500">No hay avisos con ese filtro.</p>
      )}
    </div>
  );
}

function ModerateButton({
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
    <form action={moderateListingAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
          danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-200 text-ink-700 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
