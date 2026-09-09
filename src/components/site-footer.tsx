import Link from "next/link";

const COLUMNS = [
  {
    title: "oktienda",
    links: [
      { href: "/buscar", label: "Explorar avisos" },
      { href: "/publicar", label: "Publicar gratis" },
      { href: "/mi-cuenta", label: "Mi cuenta" },
    ],
  },
  {
    title: "Categorías destacadas",
    links: [
      { href: "/buscar?categoria=vehiculos", label: "Vehículos" },
      { href: "/buscar?categoria=propiedades", label: "Propiedades" },
      { href: "/buscar?categoria=tecnologia", label: "Tecnología" },
      { href: "/buscar?categoria=servicios", label: "Servicios" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/ayuda/como-publicar", label: "Cómo publicar" },
      { href: "/ayuda/consejos-de-seguridad", label: "Consejos de seguridad" },
      { href: "/ayuda/terminos", label: "Términos y condiciones" },
      { href: "/ayuda/privacidad", label: "Privacidad y datos" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-black tracking-tight">
            <span className="text-brand-600">ok</span>tienda<span className="text-brand-600">.cl</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            El marketplace chileno para comprar y vender cerca tuyo. Publica gratis y contacta directo.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-ink-900">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink-500 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} oktienda.cl — Hecho en Chile.
      </div>
    </footer>
  );
}
