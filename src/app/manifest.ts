import type { MetadataRoute } from "next";

/// Ficha de instalación: lo que lee el teléfono para agregar oktienda.cl a la
/// pantalla de inicio y abrirla como una aplicación, sin barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "oktienda.cl — Compra y vende cerca tuyo",
    short_name: "oktienda",
    description:
      "Marketplace chileno de clasificados: publica gratis y encuentra autos, propiedades, tecnología y servicios en tu comuna.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#059669",
    lang: "es-CL",
    categories: ["shopping", "business"],
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Publicar un aviso", url: "/publicar" },
      { name: "Mis mensajes", url: "/mi-cuenta/mensajes" },
      { name: "Mis ofertas", url: "/mi-cuenta/ofertas" },
    ],
  };
}
