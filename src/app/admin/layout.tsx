import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const TABS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/denuncias", label: "Denuncias" },
  { href: "/admin/avisos", label: "Avisos" },
  { href: "/admin/calificaciones", label: "Calificaciones" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

/// El panel completo queda detrás del rol ADMIN. Cada acción lo vuelve a
/// verificar por su cuenta: este layout es comodidad, no la única barrera.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
        <ShieldCheck className="size-6 text-brand-600" /> Administración
      </h1>

      <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
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

      <div className="mt-6">{children}</div>
    </div>
  );
}
