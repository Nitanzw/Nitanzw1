/**
 * Reputación de un usuario.
 *
 * El promedio y el total viven denormalizados en `User` (`ratingSum` y
 * `ratingCount`) para que los listados y las fichas no tengan que sumar
 * reseñas en cada consulta. Acá vive solo el cálculo, sin base de datos, para
 * poder probarlo aislado; quien recalcula y escribe es src/lib/reviews.ts.
 */

/// Reseñas mínimas para mostrar el promedio. Con una o dos calificaciones el
/// número engaña más de lo que informa.
export const MIN_REVIEWS_TO_SHOW = 1;

export type Reputation = {
  count: number;
  /// Promedio de 1 a 5 con un decimal, o null si todavía no hay suficientes.
  average: number | null;
};

export function reputationOf(user: { ratingCount: number; ratingSum: number }): Reputation {
  if (user.ratingCount < MIN_REVIEWS_TO_SHOW) return { count: user.ratingCount, average: null };
  return {
    count: user.ratingCount,
    average: Math.round((user.ratingSum / user.ratingCount) * 10) / 10,
  };
}

/// Texto corto para acompañar a las estrellas.
export function reputationLabel(reputation: Reputation): string {
  if (reputation.average === null) return "Sin calificaciones";
  const plural = reputation.count === 1 ? "calificación" : "calificaciones";
  return `${reputation.average.toFixed(1)} · ${reputation.count} ${plural}`;
}
