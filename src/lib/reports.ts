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

/// Motivos para denunciar a una persona. Son distintos de los de un aviso:
/// acá el problema es la conducta, no la publicación.
export const USER_REPORT_REASONS = [
  "Intentó estafarme",
  "Pidió transferencia por adelantado",
  "No respetó una subasta que ganó",
  "Trato agresivo o insultos",
  "Suplantación de identidad",
  "Otro motivo",
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number];
