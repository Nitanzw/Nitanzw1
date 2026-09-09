import { Currency, PriceType } from "@prisma/client";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatPrice(
  price: number | null | undefined,
  currency: Currency = "CLP",
  priceType: PriceType = "FIXED",
): string {
  if (priceType === "FREE") return "Gratis";
  if (priceType === "ON_REQUEST" || price == null) return "Consultar precio";
  if (currency === "UF") return `UF ${new Intl.NumberFormat("es-CL").format(price)}`;
  if (currency === "USD") return `US$ ${new Intl.NumberFormat("es-CL").format(price)}`;
  return clp.format(price);
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/// URL canónica de un aviso: /aviso/titulo-del-aviso-<id>
export function listingHref(listing: { id: string; slug: string }): string {
  return `/aviso/${listing.slug}-${listing.id}`;
}

export function idFromListingParam(param: string): string {
  const parts = param.split("-");
  return parts[parts.length - 1] ?? param;
}

/// Normaliza un teléfono chileno a formato internacional para links de WhatsApp.
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("56")) return digits;
  if (digits.startsWith("9") && digits.length === 9) return `56${digits}`;
  return digits;
}

/**
 * Normaliza un teléfono chileno a formato internacional (+56912345678).
 *
 * Devuelve null si no parece un número válido: mejor rechazarlo en el
 * formulario que gastar un SMS en un número inexistente.
 */
export function normalizarTelefono(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "");
  if (digitos.startsWith("56") && digitos.length === 11) return `+${digitos}`;
  if (digitos.startsWith("9") && digitos.length === 9) return `+56${digitos}`;
  if (digitos.length === 8) return `+569${digitos}`;
  return null;
}
