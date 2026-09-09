import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InstallApp } from "@/components/install-app";

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "oktienda",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  // La aplicación instalada debe respetar el área segura del teléfono.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen font-sans antialiased flex flex-col">
        <InstallApp />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
