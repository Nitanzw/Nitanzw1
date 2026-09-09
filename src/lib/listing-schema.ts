import { z } from "zod";
import { AUCTION_DURATIONS, MIN_INCREMENT_FLOOR } from "@/lib/auctions";

/**
 * Validación del formulario de publicación.
 *
 * Vive acá y no dentro de la Server Action para poder probarla sin navegador:
 * es donde más fácil se cuela un campo que el formulario no envía.
 *
 * Cuidado con los campos numéricos opcionales: un `<input>` vacío llega como
 * cadena vacía, y `z.coerce.number()` la convierte en 0, que después falla
 * contra `min()` o `positive()`. Por eso el vacío se traduce a `undefined`
 * antes de convertir.
 */

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

function optionalNumber(schema: z.ZodTypeAny) {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    schema.optional(),
  );
}

export const listingSchema = z.object({
  title: z.string().trim().min(8, "El título debe tener al menos 8 caracteres").max(120),
  description: z.string().trim().min(20, "Describe tu aviso con al menos 20 caracteres").max(5000),
  categoryId: z.string().min(1, "Elige una categoría"),
  communeId: optionalText,
  // El formulario de subasta no muestra estos dos: se asumen.
  priceType: z.enum(["FIXED", "NEGOTIABLE", "FREE", "ON_REQUEST"]).default("FIXED"),
  currency: z.enum(["CLP", "UF", "USD"]).default("CLP"),
  price: optionalNumber(z.coerce.number().int().nonnegative()),
  condition: z.enum(["NEW", "USED"]).optional().or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("").transform(() => undefined)),
  contactWhatsapp: z.coerce.boolean().optional(),
  allowMessages: z.coerce.boolean().optional(),
  images: z.string().optional(),

  saleType: z.enum(["FIXED", "AUCTION"]).optional(),
  startPrice: optionalNumber(z.coerce.number().int().positive()),
  minIncrement: optionalNumber(z.coerce.number().int().min(MIN_INCREMENT_FLOOR)),
  reservePrice: optionalNumber(z.coerce.number().int().positive()),
  durationDays: optionalNumber(z.coerce.number().int()),
});

export type ListingInput = z.infer<typeof listingSchema>;

/// Reglas que dependen de si el aviso es subasta o venta directa.
export function validateSaleTerms(
  data: ListingInput,
  options: { auctionsEnabled: boolean },
): { isAuction: boolean; error?: string } {
  const isAuction = options.auctionsEnabled && data.saleType === "AUCTION";

  if (isAuction) {
    if (!data.startPrice) return { isAuction, error: "Ingresa el precio inicial de la subasta" };
    if (data.reservePrice && data.reservePrice < data.startPrice) {
      return { isAuction, error: "El precio de reserva no puede ser menor que el precio inicial" };
    }
    if (!AUCTION_DURATIONS.some((option) => option.days === data.durationDays)) {
      return { isAuction, error: "Elige una duración válida para la subasta" };
    }
    return { isAuction };
  }

  const priceNeeded = data.priceType === "FIXED" || data.priceType === "NEGOTIABLE";
  if (priceNeeded && data.price === undefined) {
    return { isAuction, error: "Ingresa un precio o elige 'Consultar precio'" };
  }

  return { isAuction };
}

/// Incremento por defecto cuando el vendedor no lo especifica: un 2% del precio
/// inicial, con piso, para que las pujas avancen sin ser irrisorias.
export function defaultIncrement(startPrice: number): number {
  return Math.max(MIN_INCREMENT_FLOOR, Math.round(startPrice * 0.02));
}
