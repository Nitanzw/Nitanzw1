import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// El header lee sesión y categorías desde la base, así que el árbol se renderiza por petición.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "oktienda.cl — Compra y vende cerca tuyo",
    template: "%s · oktienda.cl",
  },
  description:
    "Marketplace chileno de clasificados: publica gratis y encuentra autos, propiedades, tecnología, servicios y mucho más en tu comuna.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "oktienda.cl",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen font-sans antialiased flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
