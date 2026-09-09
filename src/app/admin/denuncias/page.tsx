import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate, listingHref } from "@/lib/utils";
import { moderateListingAction, resolveReportAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Denuncias" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const resolved = estado === "resueltas";

  const reports = await prisma.report.findMany({
    where: resolved ? { resolvedAt: { not: null } } : { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { select: { id: true, slug: true, title: true, status: true } },
      subject: { select: { id: true, name: true, email: true, blockedAt: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link
          href="/admin/denuncias"
          className={`rounded-lg px-3 py-1.5 ${!resolved ? "bg-brand-600 text-white" : "bg-white text-ink-700"}`}
        >
          Pendientes
        </Link>
        <Link
          href="/admin/denuncias?estado=resueltas"
          className={`rounded-lg px-3 py-1.5 ${resolved ? "bg-brand-600 text-white" : "bg-white text-ink-700"}`}
        >
          Resueltas
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-ink-500">
          No hay denuncias {resolved ? "resueltas" : "pendientes"}.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">
                    {report.reason}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                      {report.subject ? "Cuenta" : "Aviso"}
                    </span>
                  </p>
                  {report.listing && (
                    <Link href={listingHref(report.listing)} className="text-sm text-brand-700 hover:underline">
                      {report.listing.title}
                    </Link>
                  )}
                  {report.subject && (
                    <Link href={`/vendedor/${report.subject.id}`} className="text-sm text-brand-700 hover:underline">
                      {report.subject.name} ({report.subject.email})
                      {report.subject.blockedAt ? " · ya suspendida" : ""}
                    </Link>
                  )}
                  {report.detail && <p className="mt-1 text-sm text-ink-700">{report.detail}</p>}
                  <p className="mt-1 text-xs text-ink-500">
                    {report.user ? `${report.user.name} (${report.user.email})` : "Denuncia anónima"} ·{" "}
                    {formatRelativeDate(report.createdAt)}
                    {report.listing ? ` · aviso ${report.listing.status}` : ""}
                  </p>
                </div>

                {!resolved && (
                  <div className="flex flex-wrap gap-2">
                    {report.listing && (
                      <form action={moderateListingAction}>
                        <input type="hidden" name="id" value={report.listing.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                          Bajar aviso
                        </button>
                      </form>
                    )}
                    {report.subject && !report.subject.blockedAt && (
                      <Link
                        href={`/admin/usuarios?q=${encodeURIComponent(report.subject.email)}`}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Revisar la cuenta
                      </Link>
                    )}
                    <form action={resolveReportAction}>
                      <input type="hidden" name="id" value={report.id} />
                      <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-slate-50">
                        Marcar revisada
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
