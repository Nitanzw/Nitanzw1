/**
 * Catálogo de planes de destacado.
 *
 * Un aviso destacado aparece primero en los resultados y lleva el sello
 * "Destacado" en la grilla. La vigencia se guarda en `Listing.featuredUntil`.
 *
 * Los precios están en pesos chilenos. Editar este archivo es todo lo que hace
 * falta para cambiar la oferta comercial.
 */

export type Plan = {
  code: string;
  name: string;
  days: number;
  /// Precio en CLP.
  price: number;
  description: string;
  /// Se marca como la opción sugerida en la pantalla de compra.
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    code: "destacado-7",
    name: "Destacado 7 días",
    days: 7,
    price: 2990,
    description: "Ideal para probar. Tu aviso sube al tope de los resultados por una semana.",
  },
  {
    code: "destacado-15",
    name: "Destacado 15 días",
    days: 15,
    price: 4990,
    description: "El equilibrio entre precio y exposición para la mayoría de los avisos.",
    highlight: true,
  },
  {
    code: "destacado-30",
    name: "Destacado 30 días",
    days: 30,
    price: 7990,
    description: "Máxima exposición para autos, propiedades y publicaciones de mayor valor.",
  },
];

export function findPlan(code: string): Plan | undefined {
  return PLANS.find((plan) => plan.code === code);
}
