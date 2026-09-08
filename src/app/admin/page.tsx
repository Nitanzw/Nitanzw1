import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración" };

export default async function AdminHomePage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, active, paused, pendingReports, featured, revenue, newListings] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: { in: ["PAUSED", "EXPIRED", "REJECTED"] } } }),
    prisma.report.count({ where: { resolvedAt: null } }),
    prisma.listing.count({ where: { featuredUntil: { gt: new Date() } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID", paidAt: { gte: since } } }),
    prisma.listing.count({ where: { createdAt: { gte: since } } }),
  ]);

  const cards = [
    { label: "Usuarios registrados", value: String(users) },
    { label: "Avisos activos", value: String(active) },
    { label: "Avisos pausados o vencidos", value: String(paused) },
    { label: "Avisos nuevos (30 días)", value: String(newListings) },
    { label: "Avisos destacados vigentes", value: String(featured) },
    { label: "Ingresos por destacados (30 días)", value: formatPrice(revenue._sum.amount ?? 0) },
  ];

  return (
    <div className="space-y-6">
      {pendingReports > 0 && (
        <Link
          href="/admin/denuncias"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Hay {pendingReports} {pendingReports === 1 ? "denuncia pendiente" : "denuncias pendientes"} de revisión →
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-ink-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
