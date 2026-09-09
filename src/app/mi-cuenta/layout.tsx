import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { VerifyEmailBanner } from "@/components/verify-email-banner";

const TABS = [
  { href: "/mi-cuenta", label: "Mis avisos" },
  { href: "/mi-cuenta/notificaciones", label: "Notificaciones" },
  { href: "/mi-cuenta/favoritos", label: "Favoritos" },
  { href: "/mi-cuenta/mensajes", label: "Mensajes" },
  { href: "/mi-cuenta/ofertas", label: "Mis ofertas" },
  { href: "/mi-cuenta/busquedas", label: "Búsquedas" },
  { href: "/mi-cuenta/calificaciones", label: "Calificaciones" },
  { href: "/mi-cuenta/perfil", label: "Mi perfil" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/mi-cuenta");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Hola, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-ink-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-slate-50"
          >
            Administración
          </Link>
        )}
        <form action={logoutAction}>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-ink-700 hover:bg-slate-50">
            Cerrar sesión
          </button>
        </form>
        </div>
      </div>

      <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-brand-700"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {!user.emailVerified && <VerifyEmailBanner />}

      <div className="mt-6">{children}</div>
    </div>
  );
}
