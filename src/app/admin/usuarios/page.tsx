import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import { setUserRoleAction, toggleUserBlockAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuarios" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      blockedAt: true,
      blockedReason: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
  });

  return (
    <div>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o correo…"
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-2xl text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase text-ink-500">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Avisos</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Registro</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Cuenta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-3">
                  <p className="font-medium text-ink-900">
                    {user.name}
                    {user.blockedAt && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Suspendida
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-500">{user.email}</p>
                  {user.blockedReason && (
                    <p className="text-xs text-red-700">Motivo: {user.blockedReason}</p>
                  )}
                </td>
                <td className="p-3 text-ink-700">{user._count.listings}</td>
                <td className="p-3 text-ink-700">
                  {user.emailVerified ? (
                    <span className="text-brand-700">Verificado</span>
                  ) : (
                    <span className="text-ink-500">Sin verificar</span>
                  )}
                </td>
                <td className="p-3 text-ink-700">{formatRelativeDate(user.createdAt)}</td>
                <td className="p-3">
                  <form action={setUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="role" value={user.role === "ADMIN" ? "USER" : "ADMIN"} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{user.role}</span>
                    <button className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-ink-700 hover:bg-slate-50">
                      {user.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                    </button>
                  </form>
                </td>

                <td className="p-3">
                  <form action={toggleUserBlockAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={user.id} />
                    {!user.blockedAt && (
                      <input
                        name="reason"
                        placeholder="Motivo (opcional)"
                        className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                    )}
                    <button
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        user.blockedAt
                          ? "border-slate-200 text-ink-700 hover:bg-slate-50"
                          : "border-red-200 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      {user.blockedAt ? "Reactivar" : "Suspender"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
