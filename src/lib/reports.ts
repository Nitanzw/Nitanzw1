/// Motivos de denuncia. Vive fuera de las Server Actions porque un archivo
/// "use server" solo puede exportar funciones async, y esta lista la usa el
/// formulario en el navegador.
export const REPORT_REASONS = [
  "Producto prohibido o ilegal",
  "Publicación duplicada",
  "Precio o descripción engañosa",
  "Posible estafa",
  "Contenido ofensivo",
  "Otro motivo",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
